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
    public function __construct(private readonly EmbuScoreCalculator $calculator) {}

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
            $submittedJudgeScores = $judgeScores
                ->filter(fn (EmbuJudgeScore $score): bool => $score->status === 'submitted'
                    && $score->completed_items === 10
                    && $score->signed_at !== null)
                ->values();

            if ($submittedJudgeScores->isEmpty()) {
                throw ValidationException::withMessages([
                    'result' => 'Nilai belum dapat disimpan. Minimal satu Wasit harus mengisi 10 aspek, menandatangani, dan mengirim nilainya.',
                ]);
            }

            $totals = $submittedJudgeScores
                ->pluck('total_score')
                ->map(fn (string $score): float => (float) $score)
                ->values()
                ->all();
            $calculation = $this->calculator->calculate(
                $totals,
                $durationSeconds,
                (string) $lockedMatch->matchCategory->name,
            );

            $score = $existingScore ?? new EmbuScore([
                'event_id' => $event->id,
                'tournament_match_id' => $lockedMatch->id,
                'tiebreak_round' => 0,
            ]);
            $score->fill([
                'judge_scores' => $totals,
                'duration_seconds' => $durationSeconds,
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
                'result_judge_count' => $submittedJudgeScores->count(),
                'result_judge_numbers' => $submittedJudgeScores->pluck('judge_number')->all(),
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
            $timerDurationSeconds = max(10, (int) data_get($metadata, 'panitera.timer_duration_seconds', 120));

            PaniteraMatchStateUpdated::dispatch(
                eventId: $event->id,
                courtId: (string) $lockedMatch->event_court_id,
                matchId: $lockedMatch->id,
                action: 'save_result',
                matchStatus: 'completed',
                callStatus: 'completed',
                timer: [
                    'status' => 'stopped',
                    'started_at' => null,
                    'started_at_ms' => null,
                    'elapsed_seconds' => $durationSeconds,
                    'elapsed_ms' => $durationSeconds * 1000,
                    'direction' => in_array(data_get($metadata, 'panitera.timer_direction'), ['up', 'down'], true)
                        ? data_get($metadata, 'panitera.timer_direction')
                        : 'up',
                    'duration_seconds' => $timerDurationSeconds,
                    'duration_ms' => $timerDurationSeconds * 1000,
                    'version' => max(0, (int) $lockedMatch->timer_version),
                    'is_finished' => true,
                    'finished_at' => $finishedAt,
                    'time_penalty' => $calculation['time_penalty'],
                ],
                serverNow: $serverNow->toIso8601String(),
                serverNowMs: $serverNow->getTimestampMs(),
            );

            return $score;
        });
    }
}
