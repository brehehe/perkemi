<?php

namespace App\Http\Controllers\Contingent;

use App\Http\Controllers\Controller;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class PortalController extends Controller
{
    public function registration(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $registration = Registration::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($contingent)
            ->with('paymentMethod:id,name,type,provider,account_name,account_number')
            ->latest()
            ->first();

        $entryCount = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereHas('athlete', fn ($query) => $query->whereBelongsTo($contingent))
            ->count();
        $registrationEvents = Contingent::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'event:id,name,slug,start_date,end_date,status,is_active,is_paid',
                'registrations' => fn ($query) => $query->latest(),
            ])
            ->orderByDesc(Event::select('is_active')->whereColumn('events.id', 'contingents.event_id'))
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn (Contingent $ownedContingent): bool => $ownedContingent->event instanceof Event)
            ->map(function (Contingent $ownedContingent) use ($event): array {
                $ownedEvent = $ownedContingent->event;
                $existingRegistration = $ownedContingent->registrations->first();

                return [
                    'id' => $ownedEvent->id,
                    'name' => $ownedEvent->name,
                    'slug' => $ownedEvent->slug,
                    'start_date' => $ownedEvent->start_date?->format('Y-m-d'),
                    'end_date' => $ownedEvent->end_date?->format('Y-m-d'),
                    'status' => $ownedEvent->status->value,
                    'status_label' => $ownedEvent->status->label(),
                    'is_active' => (bool) $ownedEvent->is_active,
                    'is_paid' => (bool) $ownedEvent->is_paid,
                    'contingent_name' => $ownedContingent->name,
                    'is_current' => $ownedEvent->is($event),
                    'registration' => $existingRegistration ? [
                        ...$existingRegistration->only(['id', 'registration_number', 'status', 'updated_at']),
                        'status_label' => $existingRegistration->status->label(),
                    ] : null,
                    'action_label' => $existingRegistration ? 'Lihat Registrasi' : 'Mulai Registrasi',
                    'action_url' => $existingRegistration
                        ? route('kontingen.registrasi.detail', $existingRegistration)
                        : route('kontingen.registrasi.start', $ownedEvent),
                ];
            })
            ->unique('id')
            ->values();

        return $this->render('registration', $contingent, $event, $eventOptions, [
            'registration' => $registration ? [
                ...$registration->only([
                    'id', 'registration_number', 'status', 'payment_status', 'total_amount',
                    'final_amount', 'payment_amount', 'payment_reference', 'payment_note',
                    'created_at', 'updated_at',
                ]),
                'status_label' => $registration->status->label(),
                'payment_status_label' => $event->is_paid
                    ? $registration->payment_status->label()
                    : 'Gratis · Tanpa Pembayaran',
                'payment_method' => $registration->paymentMethod,
                'detail_url' => route('kontingen.registrasi.detail', $registration),
                'match_groups_url' => route('kontingen.registrasi.detail', [
                    'registration' => $registration,
                    'step' => 3,
                ]),
            ] : null,
            'summary' => [
                'athletes' => $contingent->athletes()->count(),
                'officials' => $contingent->officials()->count(),
                'match_entries' => $entryCount,
                'is_paid' => (bool) $event->is_paid,
            ],
            'registration_events' => $registrationEvents,
        ]);
    }

    public function schedule(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $entryIds = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereHas('athlete', fn ($query) => $query->whereBelongsTo($contingent))
            ->pluck('id');

        $matches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->when($entryIds->isNotEmpty(), fn ($query) => $query->where(function ($matchQuery) use ($entryIds) {
                $matchQuery->whereIn('red_entry_id', $entryIds)
                    ->orWhereIn('blue_entry_id', $entryIds)
                    ->orWhereIn('participant_entry_id', $entryIds);
            }), fn ($query) => $query->whereRaw('1 = 0'))
            ->with([
                'matchCategory:id,name,type',
                'court:id,name',
                'rundown:id,name,date,end_time',
            ])
            ->orderByRaw('scheduled_start_at is null')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get([
                'id', 'event_id', 'event_match_category_id', 'event_court_id', 'rundown_id',
                'red_entry_id', 'blue_entry_id', 'participant_entry_id', 'phase', 'round_label',
                'match_sequence', 'red_label', 'blue_label', 'participant_label',
                'scheduled_start_at', 'scheduled_end_at', 'status',
            ]);

        $rundowns = Rundown::query()
            ->whereBelongsTo($event)
            ->orderBy('date')
            ->orderBy('order')
            ->get(['id', 'date', 'end_time', 'name', 'type', 'is_match_session', 'description', 'order']);

        return $this->render('schedule', $contingent, $event, $eventOptions, [
            'rundowns' => $rundowns,
            'matches' => $matches,
        ]);
    }

    public function results(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $results = TournamentResult::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($contingent)
            ->with('athlete:id,name')
            ->orderBy('rank')
            ->orderBy('match_category')
            ->get(['id', 'event_id', 'contingent_id', 'athlete_id', 'contingent_name', 'rank', 'match_category'])
            ->map(fn (TournamentResult $result): array => [
                ...$result->only(['id', 'contingent_name', 'match_category']),
                'rank' => $result->rank->value,
                'rank_label' => $result->rank->label(),
                'athlete' => $result->athlete,
            ]);

        return $this->render('results', $contingent, $event, $eventOptions, [
            'results' => $results,
            'medal_summary' => [
                'gold' => $results->where('rank', 1)->count(),
                'silver' => $results->where('rank', 2)->count(),
                'bronze' => $results->whereIn('rank', [3, 4])->count(),
            ],
        ]);
    }

    public function athletes(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $athletes = Athlete::query()
            ->whereBelongsTo($contingent)
            ->with([
                'ageCategory:id,name,min_age,max_age',
                'matchCategoryEntries' => fn ($query) => $query
                    ->whereBelongsTo($event)
                    ->with('matchCategory:id,name,type'),
            ])
            ->orderBy('name')
            ->get([
                'id', 'contingent_id', 'event_age_category_id', 'name', 'nik', 'kenshi_number',
                'gender', 'birth_place', 'birth_date', 'dojo_name', 'kyu_dan', 'weight', 'bpjs_status',
            ]);

        return $this->render('athletes', $contingent, $event, $eventOptions, [
            'athletes' => $athletes,
            'manage_url' => $this->registrationDetailUrl($contingent, $event, 3),
        ]);
    }

    public function officials(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $officials = Official::query()
            ->whereBelongsTo($contingent)
            ->orderBy('name')
            ->get(['id', 'contingent_id', 'name', 'role', 'gender', 'phone', 'email', 'id_card_number', 'notes']);

        return $this->render('officials', $contingent, $event, $eventOptions, [
            'officials' => $officials,
            'manage_url' => $this->registrationDetailUrl($contingent, $event, 2),
        ]);
    }

    public function history(Request $request): Response
    {
        [$contingent, $event, $eventOptions] = $this->context($request);

        $registrations = Registration::query()
            ->whereHas('contingent', fn ($query) => $query->where('user_id', $request->user()->id))
            ->with([
                'event:id,name,slug,start_date,end_date,is_paid',
                'contingent' => fn ($query) => $query
                    ->select(['id', 'event_id', 'name', 'city'])
                    ->withCount(['athletes', 'officials']),
            ])
            ->latest()
            ->get()
            ->map(fn (Registration $registration): array => [
                ...$registration->only([
                    'id', 'registration_number', 'status', 'payment_status', 'final_amount',
                    'created_at', 'updated_at',
                ]),
                'status_label' => $registration->status->label(),
                'payment_status_label' => $registration->event?->is_paid
                    ? $registration->payment_status->label()
                    : 'Gratis · Tanpa Pembayaran',
                'event' => $registration->event,
                'contingent' => $registration->contingent,
                'detail_url' => route('kontingen.registrasi.detail', $registration),
            ]);

        return $this->render('history', $contingent, $event, $eventOptions, [
            'registrations' => $registrations,
        ]);
    }

    public function openRegistration(Request $request, Registration $registration): RedirectResponse
    {
        $registration->loadMissing(['contingent:id,user_id', 'event:id,slug']);
        abort_unless($registration->contingent?->user_id === $request->user()->id, 404);
        abort_unless($registration->event instanceof Event, 404);

        $request->session()->put('tenant_event_id', $registration->event->id);
        $request->session()->put('tenant_event_slug', $registration->event->slug);

        $step = max(1, min(5, $request->integer('step', 1)));

        return redirect()->route('admin.pendaftaran.registrasi.detail', [
            'registration' => $registration,
            'step' => $step,
        ]);
    }

    public function startRegistration(Request $request, Event $event): RedirectResponse
    {
        $contingent = Contingent::query()
            ->whereBelongsTo($event)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
        $registration = Registration::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($contingent)
            ->latest()
            ->first();

        if ($registration instanceof Registration) {
            return $this->openRegistration($request, $registration);
        }

        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);

        return redirect()->route('admin.pendaftaran.registrasi.create', ['event_id' => $event->id]);
    }

    /**
     * @return array{Contingent, Event, Collection<int, array<string, mixed>>}
     */
    private function context(Request $request): array
    {
        $contingents = Contingent::query()
            ->where('user_id', $request->user()->id)
            ->with('event:id,name,slug,start_date,end_date,status,is_active,is_paid,fee_per_athlete,fee_per_contingent')
            ->withCount(['athletes', 'officials'])
            ->orderByDesc(Event::select('is_active')->whereColumn('events.id', 'contingents.event_id'))
            ->orderByDesc('created_at')
            ->get();

        $requestedEventId = $request->query('event_id');
        abort_unless($requestedEventId === null || is_string($requestedEventId), 404, 'Event kontingen tidak ditemukan.');

        $tenantEventId = $request->session()->get('tenant_event_id');
        $requestedContingent = $requestedEventId
            ? $contingents->firstWhere('event_id', $requestedEventId)
            : null;
        if ($requestedEventId) {
            abort_unless($requestedContingent instanceof Contingent, 404, 'Event kontingen tidak ditemukan.');
        }

        $contingent = $requestedContingent
            ?? $contingents->firstWhere('event_id', $tenantEventId)
            ?? $contingents->first(fn (Contingent $item): bool => (bool) $item->event?->is_active)
            ?? $contingents->first();

        abort_unless($contingent?->event instanceof Event, 404, 'Event kontingen tidak ditemukan.');

        $event = $contingent->event;
        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);

        $eventOptions = $contingents
            ->filter(fn (Contingent $item): bool => $item->event instanceof Event)
            ->map(fn (Contingent $item): array => [
                'id' => $item->event->id,
                'name' => $item->event->name,
                'slug' => $item->event->slug,
                'start_date' => $item->event->start_date?->format('Y-m-d'),
                'end_date' => $item->event->end_date?->format('Y-m-d'),
                'status' => $item->event->status->value,
                'status_label' => $item->event->status->label(),
                'is_active' => (bool) $item->event->is_active,
                'contingent_name' => $item->name,
            ])
            ->unique('id')
            ->values();

        return [$contingent, $event, $eventOptions];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $eventOptions
     * @param  array<string, mixed>  $props
     */
    private function render(
        string $section,
        Contingent $contingent,
        Event $event,
        Collection $eventOptions,
        array $props = [],
    ): Response {
        return Inertia::render('Contingent/Portal', [
            'section' => $section,
            'portal' => [
                'contingent' => $contingent->only([
                    'id', 'name', 'city', 'manager_name', 'phone', 'email', 'address',
                    'athletes_count', 'officials_count',
                ]),
                'event' => [
                    ...$event->only([
                        'id', 'name', 'slug', 'start_date', 'end_date', 'is_paid',
                        'fee_per_athlete', 'fee_per_contingent',
                    ]),
                    'status' => $event->status->value,
                    'status_label' => $event->status->label(),
                ],
                'event_options' => $eventOptions,
            ],
            ...$props,
        ]);
    }

    private function registrationDetailUrl(Contingent $contingent, Event $event, int $step): ?string
    {
        $registration = Registration::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($contingent)
            ->latest()
            ->first();

        return $registration
            ? route('kontingen.registrasi.detail', ['registration' => $registration, 'step' => $step])
            : null;
    }
}
