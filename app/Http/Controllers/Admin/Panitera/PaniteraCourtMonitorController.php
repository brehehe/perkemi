<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\EventCourt;
use App\Services\CourtMonitorDataService;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaniteraCourtMonitorController extends Controller
{
    /** @var list<string> */
    private const Modes = ['arena', 'match', 'timer', 'result', 'officials'];

    public function __construct(
        private readonly CourtMonitorDataService $monitorService,
    ) {}

    public function show(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
    ): Response {
        $event = $eventContext->eventFor($request);
        abort_unless($eventCourt->event_id === $event->id, 404);
        $courtAccess->ensureCourtIsAccessible($request, $event, $eventCourt);

        $requestedMode = $request->string('mode')->toString();
        $mode = in_array($requestedMode, self::Modes, true) ? $requestedMode : 'arena';
        $targetMatchId = $request->string('match_id')->toString() ?: null;

        return Inertia::render('Admin/Panitera/CourtMonitor', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue']),
            'court' => $eventCourt->only(['id', 'name', 'location', 'order', 'var_url', 'raw_var_url', 'is_var_enabled']),
            'mode' => $mode,
            'monitor' => $this->monitorService->monitorData($event, $eventCourt, $targetMatchId),
            'timerStateUrl' => route('admin.panitera.monitors.timer', ['eventCourt' => $eventCourt, 'event_id' => $event->id]),
            'stateUrl' => route('admin.panitera.monitors.state', [
                'eventCourt' => $eventCourt,
                'event_id' => $event->id,
                ...($targetMatchId ? ['match_id' => $targetMatchId] : []),
            ]),
            'backUrl' => '/admin/panitera/scoring?event_id='.urlencode($event->id),
            'backLabel' => 'Panitera',
        ]);
    }

    public function state(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
    ): JsonResponse {
        $event = $eventContext->eventFor($request);
        abort_unless($eventCourt->event_id === $event->id, 404);
        $courtAccess->ensureCourtIsAccessible($request, $event, $eventCourt);
        $targetMatchId = $request->string('match_id')->toString() ?: null;

        return response()->json($this->monitorService->monitorData($event, $eventCourt, $targetMatchId));
    }
}
