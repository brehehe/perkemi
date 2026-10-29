<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\TournamentMatch;
use App\Services\CourtMonitorDataService;
use App\Services\Panitera\PaniteraTimerState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PublicCourtMonitorController extends Controller
{
    /** @var list<string> */
    private const Modes = ['arena', 'timer', 'result', 'officials'];

    public function show(
        Request $request,
        string $slug,
        string $eventCourt,
        CourtMonitorDataService $monitorService,
    ): Response {
        $event = Event::query()->where('slug', $slug)->firstOrFail();
        $court = $this->resolveCourt($event, $eventCourt);

        $requestedMode = $request->string('mode')->toString();
        $mode = in_array($requestedMode, self::Modes, true) ? $requestedMode : 'arena';

        return Inertia::render('Admin/Panitera/CourtMonitor', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'slug']),
            'court' => $court->only(['id', 'name', 'location']),
            'mode' => $mode,
            'monitor' => $monitorService->monitorData($event, $court),
            'timerStateUrl' => route('event.public.court.monitor.timer', [
                'slug' => $event->slug,
                'eventCourt' => $court->id,
            ]),
            'stateUrl' => route('event.public.court.monitor.state', [
                'slug' => $event->slug,
                'eventCourt' => $court->id,
            ]),
            'backUrl' => route('event.public.show', ['slug' => $event->slug]),
            'backLabel' => 'Kembali ke Event',
        ]);
    }

    public function state(
        Request $request,
        string $slug,
        string $eventCourt,
        CourtMonitorDataService $monitorService,
    ): JsonResponse {
        $event = Event::query()->where('slug', $slug)->firstOrFail();
        $court = $this->resolveCourt($event, $eventCourt);

        return response()->json($monitorService->monitorData($event, $court));
    }

    public function timer(
        Request $request,
        string $slug,
        string $eventCourt,
        PaniteraTimerState $timerState,
    ): JsonResponse {
        $observedAt = now()->getTimestampMs();
        $event = Event::query()->where('slug', $slug)->firstOrFail();
        $court = $this->resolveCourt($event, $eventCourt);

        $match = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($court, 'court')
            ->where('is_bye', false)
            ->whereIn('status', ['ready', 'in_progress'])
            ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
            ->orderByDesc('called_at')
            ->first();

        return $timerState->response($request, $match, $event->id, $court->id, $observedAt);
    }

    private function resolveCourt(Event $event, string $identifier): EventCourt
    {
        if (Str::isUuid($identifier) || Str::isUlid($identifier) || strlen($identifier) === 36 || strlen($identifier) === 26) {
            $court = EventCourt::query()
                ->where('event_id', $event->id)
                ->where('id', $identifier)
                ->first();

            if ($court) {
                return $court;
            }
        }

        if (is_numeric($identifier)) {
            $court = EventCourt::query()
                ->where('event_id', $event->id)
                ->where(function ($query) use ($identifier) {
                    $query->where('order', (int) $identifier)
                        ->orWhere('name', 'Court '.$identifier)
                        ->orWhere('name', 'court '.$identifier)
                        ->orWhere('name', 'Lapangan '.$identifier)
                        ->orWhere('name', (string) $identifier);
                })
                ->first();

            if ($court) {
                return $court;
            }

            $index = (int) $identifier;
            if ($index >= 1) {
                $court = EventCourt::query()
                    ->where('event_id', $event->id)
                    ->orderBy('order')
                    ->orderBy('name')
                    ->skip($index - 1)
                    ->first();

                if ($court) {
                    return $court;
                }
            }
        }

        $normalized = str_replace('-', ' ', strtolower($identifier));
        $court = EventCourt::query()
            ->where('event_id', $event->id)
            ->where(function ($query) use ($identifier, $normalized) {
                $query->whereRaw('LOWER(name) = ?', [strtolower($identifier)])
                    ->orWhereRaw('LOWER(name) = ?', [$normalized])
                    ->orWhereRaw("LOWER(REPLACE(name, ' ', '')) = ?", [str_replace(' ', '', $normalized)]);
            })
            ->first();

        if ($court) {
            return $court;
        }

        abort(404, 'Court tidak ditemukan untuk event ini.');
    }
}
