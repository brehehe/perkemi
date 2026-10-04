<?php

namespace App\Http\Controllers\Admin\Master;

use App\Actions\Admin\Event\ActivateEventAction;
use App\Actions\Admin\Event\CreateEventAction;
use App\Actions\Admin\Event\UpdateEventAction;
use App\Enums\EventStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Event\StoreEventRequest;
use App\Http\Requests\Admin\Event\UpdateEventRequest;
use App\Http\Requests\Admin\Event\UpdateHomepageSettingsRequest;
use App\Models\Event;
use App\Models\SiteSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    /**
     * Display a listing of events.
     */
    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $statusFilter = (string) $request->input('status', 'all');
        $tenantEvent = $request->attributes->get('tenantEvent');

        $driver = config('database.default');
        $isPgsql = $driver === 'pgsql';
        $likeOp = $isPgsql ? 'ilike' : 'like';

        $query = Event::withCount(['contingents', 'registrations', 'rundowns', 'tournamentResults']);

        if ($tenantEvent instanceof Event) {
            $query->whereKey($tenantEvent);
        }

        if (! empty($search)) {
            $query->where(function ($q) use ($search, $likeOp) {
                $q->where('name', $likeOp, "%{$search}%")
                    ->orWhere('edition', $likeOp, "%{$search}%")
                    ->orWhere('city', $likeOp, "%{$search}%")
                    ->orWhere('venue', $likeOp, "%{$search}%")
                    ->orWhere('organizer', $likeOp, "%{$search}%");
            });
        }

        if ($statusFilter === 'active') {
            $query->where('is_active', true);
        } elseif ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $events = $query->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->paginate(9)
            ->through(function (Event $event) {
                return [
                    'id' => $event->id,
                    'name' => $event->name,
                    'slug' => $event->slug,
                    'edition' => $event->edition,
                    'description' => $event->description,
                    'venue' => $event->venue,
                    'city' => $event->city,
                    'province' => $event->province,
                    'start_date' => $event->start_date?->format('Y-m-d'),
                    'end_date' => $event->end_date?->format('Y-m-d'),
                    'start_date_formatted' => $event->start_date?->translatedFormat('d M Y'),
                    'end_date_formatted' => $event->end_date?->translatedFormat('d M Y'),
                    'registration_start' => $event->registration_start?->format('Y-m-d'),
                    'registration_end' => $event->registration_end?->format('Y-m-d'),
                    'registration_end_formatted' => $event->registration_end?->translatedFormat('d M Y'),
                    'is_paid' => (bool) $event->is_paid,
                    'fee_per_athlete' => (float) $event->fee_per_athlete,
                    'fee_per_contingent' => (float) $event->fee_per_contingent,
                    'status' => $event->status instanceof \BackedEnum ? $event->status->value : (string) $event->status,
                    'is_active' => (bool) $event->is_active,
                    'organizer' => $event->organizer,
                    'contact_person' => $event->contact_person,
                    'contact_phone' => $event->contact_phone,
                    'rules_doc' => $event->rules_doc,
                    'cover_image_url' => $event->coverImageUrl(),
                    'contingents_count' => (int) $event->contingents_count,
                    'registrations_count' => (int) $event->registrations_count,
                    'rundowns_count' => (int) $event->rundowns_count,
                    'results_count' => (int) $event->tournament_results_count,
                    'created_at' => $event->created_at?->translatedFormat('d M Y'),
                ];
            })
            ->withQueryString();

        $activeEventQuery = Event::withCount(['contingents', 'registrations', 'rundowns'])
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->orderByDesc('id');

        if ($tenantEvent instanceof Event) {
            $activeEventQuery->whereKey($tenantEvent);
        }

        $activeEvent = $activeEventQuery->first();

        $eventStatsQuery = Event::query();

        if ($tenantEvent instanceof Event) {
            $eventStatsQuery->whereKey($tenantEvent);
        }

        $stats = [
            'total_events' => (clone $eventStatsQuery)->count(),
            'active_events' => (clone $eventStatsQuery)->active()->count(),
            'open_registration' => (clone $eventStatsQuery)->where('status', EventStatus::OpenRegistration)->count(),
            'ongoing_events' => (clone $eventStatsQuery)->where('status', EventStatus::Ongoing)->count(),
            'completed_events' => (clone $eventStatsQuery)->where('status', EventStatus::Completed)->count(),
            'draft_events' => (clone $eventStatsQuery)->where('status', EventStatus::Draft)->count(),
        ];

        $homepageSetting = SiteSetting::current();
        $homepageEventOptionsQuery = Event::query()
            ->select('id', 'name', 'edition', 'start_date', 'status')
            ->orderByDesc('start_date')
            ->orderByDesc('id');

        if ($tenantEvent instanceof Event) {
            $homepageEventOptionsQuery->whereKey($tenantEvent);
        }

        return Inertia::render('Admin/Master/Event/Index', [
            'events' => $events,
            'stats' => $stats,
            'activeEvent' => $activeEvent ? [
                'id' => $activeEvent->id,
                'name' => $activeEvent->name,
                'edition' => $activeEvent->edition,
                'venue' => $activeEvent->venue,
                'city' => $activeEvent->city,
                'dates' => $activeEvent->start_date?->translatedFormat('d M').' - '.$activeEvent->end_date?->translatedFormat('d M Y'),
                'contingents_count' => (int) $activeEvent->contingents_count,
                'registrations_count' => (int) $activeEvent->registrations_count,
            ] : null,
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
            ],
            'homepageSettings' => [
                'home_landing_mode' => $homepageSetting->home_landing_mode,
                'featured_event_id' => $homepageSetting->featured_event_id,
            ],
            'homepageEventOptions' => $homepageEventOptionsQuery->get()->map(fn (Event $event) => [
                'value' => $event->id,
                'label' => $event->name.($event->edition ? " — {$event->edition}" : ''),
                'description' => $event->start_date?->translatedFormat('d M Y'),
            ]),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'roles' => $request->user()->roles->pluck('name')->toArray(),
                ] : [
                    'name' => 'Administrator Perkemi',
                    'email' => 'admin@smart-perkemi.id',
                    'roles' => ['Super Admin'],
                ],
            ],
        ]);
    }

    /**
     * Store a newly created event in storage.
     */
    public function store(StoreEventRequest $request, CreateEventAction $action): RedirectResponse
    {
        $action->execute($request->validated());

        return redirect()->route('admin.master.event.index')
            ->with('success', 'Event kejuaraan berhasil ditambahkan.');
    }

    /**
     * Update the specified event in storage.
     */
    public function update(UpdateEventRequest $request, Event $event, UpdateEventAction $action): RedirectResponse
    {
        $action->execute($event, $request->validated());

        return redirect()->route('admin.master.event.index')
            ->with('success', 'Data event berhasil diperbarui.');
    }

    /**
     * Remove the specified event from storage.
     */
    public function destroy(Event $event): RedirectResponse
    {
        $name = $event->name;
        $event->delete();

        return redirect()->route('admin.master.event.index')
            ->with('success', "Event '{$name}' berhasil dihapus.");
    }

    /**
     * Make the specified event available in operational menus.
     */
    public function activate(Event $event, ActivateEventAction $action): RedirectResponse
    {
        $action->execute($event);

        return redirect()->route('admin.master.event.index')
            ->with('success', "Event '{$event->name}' sekarang aktif dan dapat dikelola bersama event aktif lainnya.");
    }

    public function updateHomepageSettings(UpdateHomepageSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        SiteSetting::query()->updateOrCreate(
            ['id' => 1],
            [
                'home_landing_mode' => $validated['home_landing_mode'],
                'featured_event_id' => $validated['home_landing_mode'] === SiteSetting::HomeFeaturedEvent
                    ? $validated['featured_event_id']
                    : null,
            ],
        );

        return back()->with('success', 'Tampilan landing page utama berhasil diperbarui.');
    }
}
