<?php

namespace App\Services\Referee;

use App\Enums\RefereeCourtRole;
use App\Events\EmbuJudgeScoreUpdated;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\EventCourt;
use App\Models\Referee;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Panitera\EmbuScoreCalculator;
use Illuminate\Support\Facades\DB;

class EmbuRefereeScoreService
{
    /** @var list<string> */
    public const TechniqueKeys = [
        'goho_attack',
        'goho_defense',
        'goho_counter',
        'juho_escape',
        'juho_lock_throw',
        'juho_ground',
    ];

    /** @var list<string> */
    public const ExpressionKeys = [
        'expression_sequence',
        'expression_stance',
        'expression_spirit',
        'expression_breath_zanshin',
    ];

    /** @var list<string> */
    public const AspectKeys = [
        ...self::TechniqueKeys,
        ...self::ExpressionKeys,
    ];

    public function __construct(private EmbuScoreCalculator $calculator) {}

    /**
     * @param  array<string, int|null>  $aspectScores
     */
    public function save(
        TournamentMatch $match,
        EventCourt $court,
        Referee $referee,
        User $user,
        RefereeCourtRole $role,
        array $aspectScores,
        ?string $signature,
        ?string $notes,
        string $status,
    ): EmbuJudgeScore {
        $score = DB::transaction(function () use ($match, $court, $referee, $user, $role, $aspectScores, $signature, $notes, $status): EmbuJudgeScore {
            $normalizedScores = collect(self::AspectKeys)
                ->mapWithKeys(fn (string $key): array => [
                    $key => isset($aspectScores[$key]) ? (int) $aspectScores[$key] : null,
                ])
                ->all();
            $completedItems = collect($normalizedScores)->filter(fn (?int $value): bool => $value !== null)->count();
            $techniqueSubtotal = $this->subtotal($normalizedScores, self::TechniqueKeys);
            $expressionSubtotal = $this->subtotal($normalizedScores, self::ExpressionKeys);
            $resolvedStatus = $status === 'submitted' && $completedItems === count(self::AspectKeys)
                ? 'submitted'
                : 'draft';

            $judgeScore = EmbuJudgeScore::query()->updateOrCreate(
                [
                    'tournament_match_id' => $match->id,
                    'tiebreak_round' => 0,
                    'judge_number' => $role->judgeNumber(),
                ],
                [
                    'event_id' => $match->event_id,
                    'event_court_id' => $court->id,
                    'referee_id' => $referee->id,
                    'user_id' => $user->id,
                    'role' => $role->value,
                    'aspect_scores' => $normalizedScores,
                    'completed_items' => $completedItems,
                    'technique_subtotal' => $techniqueSubtotal,
                    'expression_subtotal' => $expressionSubtotal,
                    'total_score' => $techniqueSubtotal + $expressionSubtotal,
                    'status' => $resolvedStatus,
                    'signature' => $signature,
                    'notes' => $notes,
                    'signed_at' => $resolvedStatus === 'submitted' ? now() : null,
                    'submitted_at' => $resolvedStatus === 'submitted' ? now() : null,
                ],
            );

            $this->synchronizeAggregate($match);

            return $judgeScore;
        });

        EmbuJudgeScoreUpdated::dispatch(
            eventId: $score->event_id,
            matchId: $score->tournament_match_id,
            courtId: $score->event_court_id,
            judgeNumber: $score->judge_number,
            completedItems: $score->completed_items,
            totalScore: (float) $score->total_score,
            status: $score->status,
            updatedAt: $score->updated_at->toIso8601String(),
        );

        return $score;
    }

    /**
     * @param  array<string, int|null>  $scores
     * @param  list<string>  $keys
     */
    private function subtotal(array $scores, array $keys): float
    {
        return (float) collect($keys)->sum(fn (string $key): int => $scores[$key] ?? 0);
    }

    private function synchronizeAggregate(TournamentMatch $match): void
    {
        $judgeScores = EmbuJudgeScore::query()
            ->whereBelongsTo($match)
            ->where('tiebreak_round', 0)
            ->orderBy('judge_number')
            ->get();

        if ($judgeScores->count() !== 5 || $judgeScores->contains(fn (EmbuJudgeScore $score): bool => $score->completed_items !== 10)) {
            return;
        }

        $aggregate = EmbuScore::query()
            ->whereBelongsTo($match)
            ->where('tiebreak_round', 0)
            ->first();

        if ($aggregate?->status === 'verified') {
            return;
        }

        $durationSeconds = $this->durationSeconds($match);
        $totals = $judgeScores->pluck('total_score')->map(fn (string $score): float => (float) $score)->values()->all();
        $calculation = $this->calculator->calculate(
            $totals,
            $durationSeconds,
            (string) $match->matchCategory?->name,
        );

        EmbuScore::query()->updateOrCreate(
            [
                'tournament_match_id' => $match->id,
                'tiebreak_round' => 0,
            ],
            [
                'event_id' => $match->event_id,
                'judge_scores' => $totals,
                'duration_seconds' => $durationSeconds,
                'time_penalty' => $calculation['time_penalty'],
                'middle_score' => $calculation['middle_score'],
                'final_score' => $calculation['final_score'],
                'status' => $judgeScores->every(fn (EmbuJudgeScore $score): bool => $score->status === 'submitted')
                    ? 'ready_for_verification'
                    : 'draft',
                'submitted_by' => null,
                'verified_by' => null,
                'verified_at' => null,
            ],
        );
    }

    private function durationSeconds(TournamentMatch $match): ?int
    {
        $elapsedSeconds = max(0, (int) $match->timer_elapsed_seconds);

        if ($match->timer_status === 'running' && $match->timer_started_at) {
            $elapsedSeconds += (int) $match->timer_started_at->diffInSeconds(now());
        }

        return $elapsedSeconds === 0 && ! $match->timer_started_at ? null : $elapsedSeconds;
    }
}
