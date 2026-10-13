<?php

namespace App\Services\Panitera;

use App\Models\TournamentMatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaniteraTimerState
{
    /** @return array<string, mixed> */
    public function timer(TournamentMatch $match): array
    {
        $elapsed = max(0, (int) $match->timer_elapsed_ms) ?: max(0, (int) $match->timer_elapsed_seconds) * 1000;
        $duration = max(10, (int) data_get($match->metadata, 'panitera.timer_duration_seconds', 120));

        return [
            'status' => $match->timer_status,
            'started_at' => $match->timer_started_at?->toIso8601String(),
            'started_at_ms' => $match->timer_started_at_ms ?: $match->timer_started_at?->getTimestampMs(),
            'elapsed_seconds' => (int) floor($elapsed / 1000),
            'elapsed_ms' => $elapsed,
            'direction' => data_get($match->metadata, 'panitera.timer_direction') === 'down' ? 'down' : 'up',
            'duration_seconds' => $duration,
            'duration_ms' => $duration * 1000,
            'version' => max(0, (int) $match->timer_version),
            'is_finished' => (bool) data_get($match->metadata, 'panitera.finished_at'),
            'finished_at' => data_get($match->metadata, 'panitera.finished_at'),
            'time_penalty' => data_get($match->metadata, 'panitera.time_penalty') !== null
                ? (float) data_get($match->metadata, 'panitera.time_penalty') : null,
        ];
    }

    public function response(Request $request, ?TournamentMatch $match, string $eventId, ?string $courtId, int $observedAtMs): JsonResponse
    {
        $state = [
            'event_id' => $eventId,
            'court_id' => $courtId,
            'match_id' => $match?->id,
            'match_status' => $match?->status,
            'call_status' => $match?->call_status,
            'timer' => $match ? $this->timer($match) : null,
            'observed_at_ms' => $observedAtMs,
        ];
        $sentAt = now()->getTimestampMs();

        return response()->json([
            ...$state,
            'server_received_at_ms' => min($sentAt, (int) round((float) $request->server('REQUEST_TIME_FLOAT', $sentAt / 1000) * 1000)),
            'server_now_ms' => $sentAt,
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }
}
