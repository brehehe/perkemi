<?php

namespace App\Services\Panitera;

use App\Events\PaniteraMatchStateUpdated;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerifyEmbuResult
{
    public function __construct(
        private readonly EmbuScoreCalculator $calculator,
        private readonly EmbuPenaltyState $penaltyState,
        private readonly PaniteraTimerState $timerState,
    ) {}

    public function handle(Event $event, TournamentMatch $match, User $operator): EmbuScore
    {
        abort_unless($match->event_id === $event->id, 404);

        return DB::transaction(function () use ($event, $match, $operator): EmbuScore {
            $lockedMatch = TournamentMatch::query()
                ->whereBelongsTo($event)
                ->whereKey($match->id)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedMatch->loadMissing('matchCategory:id,name,type');

            abort_unless($lockedMatch->matchCategory?->type === 'embu', 404);

            $existingScore = EmbuScore::query()
                ->whereBelongsTo($lockedMatch)
                ->where('tiebreak_round', 0)
                ->lockForUpdate()
                ->first();

            if ($existingScore?->status === 'verified') {
                return $existingScore;
            }

            $finishedAt = data_get($lockedMatch->metadata, 'panitera.finished_at');
            $durationSeconds = (int) data_get($lockedMatch->metadata, 'panitera.duration_seconds', 0);

            if (! $finishedAt || $durationSeconds < 1) {
                throw ValidationException::withMessages([
                    'result' => 'Selesaikan pertandingan dan kunci durasi resminya terlebih dahulu.',
                ]);
            }

            $judgeScores = EmbuJudgeScore::query()
                ->whereBelongsTo($lockedMatch)
                ->where('tiebreak_round', 0)
                ->orderBy('judge_number')
                ->lockForUpdate()
                ->get();
            $completedJudgeScores = $judgeScores
                ->filter(fn (EmbuJudgeScore $score): bool => $score->completed_items === 10)
                ->values();

            if ($completedJudgeScores->isEmpty()) {
                throw ValidationException::withMessages([
                    'result' => 'Nilai belum dapat disimpan. Minimal satu Wasit harus mengisi 10 aspek secara lengkap.',
                ]);
            }

            $totals = $completedJudgeScores
                ->pluck('total_score')
                ->map(fn (string $score): float => (float) $score)
                ->values()
                ->all();
            $chiefJudgeScore = $completedJudgeScores->firstWhere('judge_number', 1);
            $penaltyState = $this->penaltyState->resolve($lockedMatch, $chiefJudgeScore);
            $calculation = $this->calculator->calculate(
                $totals,
                $durationSeconds,
                (string) $lockedMatch->matchCategory->name,
                violationPenalty: $penaltyState['points'],
            );

            $score = $existingScore ?? new EmbuScore([
                'event_id' => $event->id,
                'tournament_match_id' => $lockedMatch->id,
                'tiebreak_round' => 0,
            ]);
            $score->fill([
                'judge_scores' => $totals,
                'duration_seconds' => $durationSeconds,
                'violation_penalties' => $penaltyState['values'],
                ...$calculation,
                'status' => 'verified',
                'submitted_by' => $operator->id,
                'verified_by' => $operator->id,
                'verified_at' => now(),
            ])->save();

            $metadata = $lockedMatch->metadata ?? [];
            $metadata['panitera'] = [
                ...($metadata['panitera'] ?? []),
                'result_saved_at' => now()->toIso8601String(),
                'result_saved_by' => $operator->id,
                'result_judge_count' => $completedJudgeScores->count(),
                'result_judge_numbers' => $completedJudgeScores->pluck('judge_number')->all(),
                'result_penalty_referee_id' => $chiefJudgeScore?->referee_id,
                'result_penalty_user_id' => $penaltyState['updated_by'] ?? $chiefJudgeScore?->user_id,
                'result_penalty_source' => $penaltyState['source'],
                'is_disqualified' => $calculation['is_disqualified'],
                'disqualification_reason' => $calculation['disqualification_reason'],
            ];
            $lockedMatch->update([
                'status' => 'completed',
                'call_status' => 'completed',
                'timer_status' => 'stopped',
                'timer_started_at' => null,
                'timer_started_at_ms' => null,
                'timer_elapsed_seconds' => $durationSeconds,
                'timer_elapsed_ms' => $durationSeconds * 1000,
                'timer_version' => max(0, (int) $lockedMatch->timer_version) + 1,
                'metadata' => $metadata,
            ]);

            $lockedMatch->refresh();
            $serverNow = now();

            PaniteraMatchStateUpdated::dispatch(
                eventId: $event->id,
                courtId: (string) $lockedMatch->event_court_id,
                matchId: $lockedMatch->id,
                action: 'save_result',
                matchStatus: 'completed',
                callStatus: 'completed',
                timer: [
                    ...$this->timerState->timer($lockedMatch),
                    'time_penalty' => $calculation['time_penalty'],
                    'violation_penalty' => $calculation['violation_penalty'],
                    'total_penalty' => $calculation['total_penalty'],
                    'is_disqualified' => $calculation['is_disqualified'],
                ],
                serverNow: $serverNow->toIso8601String(),
                serverNowMs: $serverNow->getTimestampMs(),
            );

            return $score;
        });
    }
}
