<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\EventCourt;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use App\Services\Panitera\PaniteraTimerState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaniteraTimerController extends Controller
{
    public function show(Request $request, TournamentMatch $tournamentMatch, EventContext $context, PaniteraCourtAccess $access, PaniteraTimerState $state): JsonResponse
    {
        $observedAt = now()->getTimestampMs();
        $event = $context->eventFor($request);
        abort_unless($tournamentMatch->event_id === $event->id, 404);
        $access->ensureMatchIsAccessible($request, $event, $tournamentMatch);

        return $state->response($request, $tournamentMatch->fresh(), $event->id, $tournamentMatch->event_court_id, $observedAt);
    }

    public function court(Request $request, EventCourt $eventCourt, EventContext $context, PaniteraCourtAccess $access, PaniteraTimerState $state): JsonResponse
    {
        $observedAt = now()->getTimestampMs();
        $event = $context->eventFor($request);
        abort_unless($eventCourt->event_id === $event->id, 404);
        $access->ensureCourtIsAccessible($request, $event, $eventCourt);
        $match = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($eventCourt, 'court')
            ->where('is_bye', false)
            ->whereIn('status', ['ready', 'in_progress'])
            ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
            ->orderByDesc('called_at')
            ->first();

        return $state->response($request, $match, $event->id, $eventCourt->id, $observedAt);
    }
}
