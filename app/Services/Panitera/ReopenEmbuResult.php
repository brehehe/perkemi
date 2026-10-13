<?php

namespace App\Services\Panitera;

use App\Events\PaniteraMatchStateUpdated;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReopenEmbuResult
{
    public function __construct(private readonly PaniteraTimerState $timerState) {}

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

            abort_unless(
                $lockedMatch->matchCategory?->type === 'embu'
                    && $lockedMatch->event_court_id !== null,
                404,
            );

            $score = EmbuScore::query()
                ->whereBelongsTo($lockedMatch)
                ->where('tiebreak_round', 0)
                ->lockForUpdate()
                ->first();

            if (! $score || $score->status !== 'verified') {
                throw ValidationException::withMessages([
                    'result' => 'Hasil Embu belum dikunci sehingga tidak perlu dibuka ulang.',
                ]);
            }

            $score->update([
                'status' => 'draft',
                'submitted_by' => null,
                'verified_by' => null,
                'verified_at' => null,
            ]);

            $metadata = $lockedMatch->metadata ?? [];
            $paniteraMetadata = $metadata['panitera'] ?? [];
            unset(
                $paniteraMetadata['result_saved_at'],
                $paniteraMetadata['result_saved_by'],
                $paniteraMetadata['result_judge_count'],
                $paniteraMetadata['result_judge_numbers'],
                $paniteraMetadata['result_penalty_referee_id'],
                $paniteraMetadata['result_penalty_user_id'],
                $paniteraMetadata['result_penalty_source'],
            );
            $metadata['panitera'] = [
                ...$paniteraMetadata,
                'result_reopened_at' => now()->toIso8601String(),
                'result_reopened_by' => $operator->id,
                'last_action' => 'reopen_result',
                'last_operator_id' => $operator->id,
                'updated_at' => now()->toIso8601String(),
            ];

            $lockedMatch->update([
                'status' => 'in_progress',
                'call_status' => 'participants_called',
                'timer_status' => 'stopped',
                'timer_started_at' => null,
                'timer_started_at_ms' => null,
                'timer_version' => max(0, (int) $lockedMatch->timer_version) + 1,
                'metadata' => $metadata,
            ]);

            $updatedMatch = $lockedMatch->fresh();
            abort_unless($updatedMatch instanceof TournamentMatch, 404);
            $serverNow = now();

            PaniteraMatchStateUpdated::dispatch(
                eventId: $event->id,
                courtId: (string) $updatedMatch->event_court_id,
                matchId: $updatedMatch->id,
                action: 'reopen_result',
                matchStatus: $updatedMatch->status,
                callStatus: $updatedMatch->call_status,
                timer: $this->timerState->timer($updatedMatch),
                serverNow: $serverNow->toIso8601String(),
                serverNowMs: $serverNow->getTimestampMs(),
            );

            return $score->fresh();
        });
    }
}
