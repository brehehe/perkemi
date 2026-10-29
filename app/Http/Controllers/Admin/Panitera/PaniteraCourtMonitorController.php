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
    private const Modes = ['arena', 'timer', 'result', 'officials'];

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

        return Inertia::render('Admin/Panitera/CourtMonitor', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue']),
            'court' => $eventCourt->only(['id', 'name', 'location']),
            'mode' => $mode,
            'monitor' => $this->monitorService->monitorData($event, $eventCourt),
            'timerStateUrl' => route('admin.panitera.monitors.timer', ['eventCourt' => $eventCourt, 'event_id' => $event->id]),
            'stateUrl' => route('admin.panitera.monitors.state', [
                'eventCourt' => $eventCourt,
                'event_id' => $event->id,
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

        return response()->json($this->monitorService->monitorData($event, $eventCourt));
    }
}
