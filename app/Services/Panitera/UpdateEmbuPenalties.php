<?php

namespace App\Services\Panitera;

use App\Events\EmbuPenaltiesUpdated;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Referee\EmbuRefereeScoreService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateEmbuPenalties
{
    public function __construct(
        private readonly EmbuPenaltyState $penaltyState,
        private readonly EmbuScoreCalculator $calculator,
    ) {}

    /**
     * @param  array<string, mixed>  $penalties
     * @return array{values: array<string, int>, points: float, source: string, updated_by: string, updated_at: string}
     */
    public function handle(Event $event, TournamentMatch $match, User $operator, array $penalties): array
    {
        abort_unless($match->event_id === $event->id, 404);

        return DB::transaction(function () use ($event, $match, $operator, $penalties): array {
            $lockedMatch = TournamentMatch::query()
                ->whereBelongsTo($event)
                ->whereKey($match->id)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedMatch->loadMissing('matchCategory:id,name,type');

            abort_unless(
                $lockedMatch->matchCategory?->type === 'embu'
                    && $lockedMatch->event_court_id !== null,
                404,
            );

            $aggregate = EmbuScore::query()
                ->whereBelongsTo($lockedMatch)
                ->where('tiebreak_round', 0)
                ->lockForUpdate()
                ->first();

            if ($lockedMatch->status === 'completed' || $aggregate?->status === 'verified') {
                throw ValidationException::withMessages([
                    'violation_penalties' => 'Denda tidak dapat diubah karena hasil pertandingan sudah disimpan.',
                ]);
            }

            $state = $this->penaltyState->store(
                $lockedMatch,
                $penalties,
                $operator,
                EmbuPenaltyState::SourcePanitera,
            );

            $completedJudgeScores = EmbuJudgeScore::query()
                ->whereBelongsTo($lockedMatch)
                ->where('tiebreak_round', 0)
                ->where('completed_items', count(EmbuRefereeScoreService::AspectKeys))
                ->orderBy('judge_number')
                ->lockForUpdate()
                ->get();

            if ($completedJudgeScores->isNotEmpty()) {
                $durationSeconds = $this->durationSeconds($lockedMatch);
                $calculation = $this->calculator->calculate(
                    $completedJudgeScores->pluck('total_score')->map(fn (string $score): float => (float) $score)->values()->all(),
                    $durationSeconds,
                    (string) $lockedMatch->matchCategory->name,
                    violationPenalty: $state['points'],
                );
                $aggregate ??= new EmbuScore([
                    'event_id' => $event->id,
                    'tournament_match_id' => $lockedMatch->id,
                    'tiebreak_round' => 0,
                ]);
                $aggregate->fill([
                    'judge_scores' => $completedJudgeScores->pluck('total_score')->map(fn (string $score): float => (float) $score)->values()->all(),
                    'duration_seconds' => $durationSeconds,
                    'violation_penalties' => $state['values'],
                    ...$calculation,
                    'status' => $completedJudgeScores->every(fn (EmbuJudgeScore $score): bool => $score->status === 'submitted')
                        ? 'ready_for_verification'
                        : 'draft',
                    'submitted_by' => null,
                    'verified_by' => null,
                    'verified_at' => null,
                ])->save();
            }

            EmbuPenaltiesUpdated::dispatch(
                eventId: $event->id,
                matchId: $lockedMatch->id,
                courtId: (string) $lockedMatch->event_court_id,
                penalties: $state['values'],
                penaltyPoints: $state['points'],
                source: $state['source'],
                updatedAt: $state['updated_at'],
            );

            return $state;
        });
    }

    private function durationSeconds(TournamentMatch $match): ?int
    {
        $officialDuration = data_get($match->metadata, 'panitera.duration_seconds');

        if ($officialDuration !== null) {
            return max(0, (int) $officialDuration);
        }

        $elapsedSeconds = max(0, (int) $match->timer_elapsed_seconds);

        if ($match->timer_status === 'running' && $match->timer_started_at) {
            $elapsedSeconds += (int) $match->timer_started_at->diffInSeconds(now());
        }

        return $elapsedSeconds === 0 && ! $match->timer_started_at ? null : $elapsedSeconds;
    }
}
