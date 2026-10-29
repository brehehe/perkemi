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
use App\Services\Panitera\EmbuPenaltyCatalog;
use App\Services\Panitera\EmbuPenaltyState;
use App\Services\Panitera\EmbuScoreCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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

    public function __construct(
        private EmbuScoreCalculator $calculator,
        private EmbuPenaltyCatalog $penaltyCatalog,
        private EmbuPenaltyState $penaltyState,
    ) {}

    /**
     * @param  array<string, int|null>  $aspectScores
     * @param  array<string, int>|null  $violationPenalties
     */
    public function save(
        TournamentMatch $match,
        EventCourt $court,
        Referee $referee,
        User $user,
        RefereeCourtRole $role,
        array $aspectScores,
        ?array $violationPenalties,
        ?string $signature,
        ?string $notes,
        string $status,
    ): EmbuJudgeScore {
        if ($role !== RefereeCourtRole::Chief && collect($violationPenalties)->contains(fn (mixed $quantity): bool => (int) $quantity > 0)) {
            throw ValidationException::withMessages([
                'violation_penalties' => 'Pelanggaran Embu hanya dapat dicatat oleh Wasit Utama.',
            ]);
        }

        $score = DB::transaction(function () use ($match, $court, $referee, $user, $role, $aspectScores, $violationPenalties, $signature, $notes, $status): EmbuJudgeScore {
            $lockedMatch = TournamentMatch::query()
                ->whereKey($match->id)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedMatch->loadMissing('matchCategory:id,name,type');
            $normalizedScores = collect(self::AspectKeys)
                ->mapWithKeys(fn (string $key): array => [
                    $key => array_key_exists($key, $aspectScores) && $aspectScores[$key] !== null && $aspectScores[$key] !== '' ? (int) $aspectScores[$key] : null,
                ])
                ->all();
            $completedItems = collect($normalizedScores)->filter(fn (?int $value): bool => $value !== null)->count();
            $techniqueSubtotal = $this->subtotal($normalizedScores, self::TechniqueKeys);
            $expressionSubtotal = $this->subtotal($normalizedScores, self::ExpressionKeys);
            $categoryName = (string) $lockedMatch->matchCategory?->name;
            $existingChiefScore = $role === RefereeCourtRole::Chief && $violationPenalties === null
                ? EmbuJudgeScore::query()
                    ->whereBelongsTo($lockedMatch)
                    ->where('tiebreak_round', 0)
                    ->where('judge_number', RefereeCourtRole::Chief->judgeNumber())
                    ->first()
                : null;
            $normalizedPenalties = $role === RefereeCourtRole::Chief
                ? ($violationPenalties === null
                    ? $this->penaltyState->resolve($lockedMatch, $existingChiefScore)['values']
                    : $this->penaltyCatalog->normalize($violationPenalties, $categoryName))
                : [];
            $violationPenalty = $this->penaltyCatalog->points($normalizedPenalties, $categoryName);
            $resolvedStatus = $status === 'submitted' && $completedItems === count(self::AspectKeys)
                ? 'submitted'
                : 'draft';

            $judgeScore = EmbuJudgeScore::query()->updateOrCreate(
                [
                    'tournament_match_id' => $lockedMatch->id,
                    'tiebreak_round' => 0,
                    'judge_number' => $role->judgeNumber(),
                ],
                [
                    'event_id' => $lockedMatch->event_id,
                    'event_court_id' => $court->id,
                    'referee_id' => $referee->id,
                    'user_id' => $user->id,
                    'role' => $role->value,
                    'aspect_scores' => $normalizedScores,
                    'completed_items' => $completedItems,
                    'technique_subtotal' => $techniqueSubtotal,
                    'expression_subtotal' => $expressionSubtotal,
                    'total_score' => $techniqueSubtotal + $expressionSubtotal,
                    'violation_penalties' => $normalizedPenalties,
                    'violation_penalty' => $violationPenalty,
                    'status' => $resolvedStatus,
                    'signature' => $signature,
                    'notes' => $notes,
                    'signed_at' => $resolvedStatus === 'submitted' ? now() : null,
                    'submitted_at' => $resolvedStatus === 'submitted' ? now() : null,
                ],
            );

            if ($role === RefereeCourtRole::Chief && $violationPenalties !== null) {
                $this->penaltyState->store(
                    $lockedMatch,
                    $normalizedPenalties,
                    $user,
                    EmbuPenaltyState::SourceChiefReferee,
                );
            }

            $this->synchronizeAggregate($lockedMatch);

            return $judgeScore;
        });

        EmbuJudgeScoreUpdated::dispatch(
            eventId: $score->event_id,
            matchId: $score->tournament_match_id,
            courtId: $score->event_court_id,
            judgeNumber: $score->judge_number,
            completedItems: $score->completed_items,
            totalScore: (float) $score->total_score,
            violationPenalty: (float) $score->violation_penalty,
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

        $completedJudgeScores = $judgeScores
            ->filter(fn (EmbuJudgeScore $score): bool => $score->completed_items === count(self::AspectKeys))
            ->values();

        if ($completedJudgeScores->isEmpty()) {
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
        $totals = $completedJudgeScores->pluck('total_score')->map(fn (string $score): float => (float) $score)->values()->all();
        $chiefJudgeScore = $completedJudgeScores->firstWhere('judge_number', RefereeCourtRole::Chief->judgeNumber());
        $penaltyState = $this->penaltyState->resolve($match, $chiefJudgeScore);
        $calculation = $this->calculator->calculate(
            $totals,
            $durationSeconds,
            (string) $match->matchCategory?->name,
            violationPenalty: $penaltyState['points'],
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
                'violation_penalties' => $penaltyState['values'],
                ...$calculation,
                'status' => $completedJudgeScores->every(fn (EmbuJudgeScore $score): bool => $score->status === 'submitted')
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
