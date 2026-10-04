<?php

namespace App\Http\Controllers\Admin\Registration;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Registration\StoreAthleteMatchCategoryEntryRequest;
use App\Http\Requests\Admin\Registration\StoreRegistrationPaymentRequest;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Kyu;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Technique;
use App\Services\ParticipantEligibilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function __construct(private ParticipantEligibilityService $eligibility) {}

    /**
     * Display a listing of contingent registrations.
     */
    public function registrasi(Request $request): Response|RedirectResponse
    {
        if ($this->isContingentPortalUser($request)) {
            return redirect()->route('kontingen.registrasi');
        }

        $tenantEvent = $request->attributes->get('tenantEvent');
        $events = $this->registrationEventsForRequest($request);
        $activeEvent = $events->firstWhere('id', $tenantEvent?->id ?? $request->input('event_id'))
            ?? $events->firstWhere('is_active', true)
            ?? $events->first();
        $search = $request->input('search');
        $status = $request->input('status', 'all');

        $query = Registration::query()
            ->with([
                'contingent:id,name,city,manager_name,phone',
                'event:id,name,is_paid',
                'event.paymentMethods:id,name,type,provider,account_name,account_number,instructions,is_active',
                'paymentMethod:id,name,type,provider,account_name,account_number,instructions',
                'paymentVerifiedBy:id,name',
            ])
            ->latest();

        if (! $request->user()?->hasAnyRole(['Super Admin', 'Admin'])
            && ! $this->canManageMatchEntries($request, $activeEvent)) {
            $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->where('user_id', $request->user()?->id));
        }

        if ($activeEvent instanceof Event) {
            $query->whereBelongsTo($activeEvent);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('registration_number', 'like', "%{$search}%")
                    ->orWhereHas('contingent', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('city', 'like', "%{$search}%")
                            ->orWhere('manager_name', 'like', "%{$search}%");
                    });
            });
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $registrations = $query->paginate(12)->withQueryString();

        $registrationStatsQuery = Registration::query();

        if (! $request->user()?->hasAnyRole(['Super Admin', 'Admin'])
            && ! $this->canManageMatchEntries($request, $activeEvent)) {
            $registrationStatsQuery->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->where('user_id', $request->user()?->id));
        }

        if ($activeEvent instanceof Event) {
            $registrationStatsQuery->whereBelongsTo($activeEvent);
        } else {
            $registrationStatsQuery->whereRaw('1 = 0');
        }

        $stats = [
            'total_registrations' => (clone $registrationStatsQuery)->count(),
            'verified_count' => (clone $registrationStatsQuery)->where('status', RegistrationStatus::Verified)->count(),
            'pending_count' => (clone $registrationStatsQuery)->where('status', RegistrationStatus::Pending)->count(),
            'total_amount' => (float) (clone $registrationStatsQuery)->where('payment_status', PaymentStatus::Verified)->sum('payment_amount'),
        ];

        return Inertia::render('Admin/Registration/Index', [
            'registrations' => $registrations,
            'stats' => $stats,
            'activeEvent' => $activeEvent,
            'eventOptions' => $this->eventOptions($events),
            'canCreate' => $request->user()?->hasAnyRole(['Super Admin', 'Admin'])
                || $this->canManageMatchEntries($request, $activeEvent)
                || ($activeEvent instanceof Event && $activeEvent->contingents()->where('user_id', $request->user()?->id)->exists()),
            'filters' => [
                'search' => $search ?? '',
                'status' => $status,
                'event_id' => $activeEvent?->id,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        $ownedEventIds = Contingent::query()->where('user_id', $request->user()?->id)
            ->whereNotNull('event_id')->pluck('event_id');
        abort_unless($tenantEvent instanceof Event || $request->user()?->hasAnyRole(['Super Admin', 'Admin'])
            || $ownedEventIds->isNotEmpty(), 403);

        $isAdmin = $request->user()?->hasAnyRole(['Super Admin', 'Admin'])
            || ($tenantEvent instanceof Event && $this->canManageMatchEntries($request, $tenantEvent));

        $events = Event::query()
            ->when($tenantEvent instanceof Event, fn ($query) => $query->whereKey($tenantEvent))
            ->when(! $isAdmin && ! ($tenantEvent instanceof Event), fn ($query) => $query->whereIn('id', $ownedEventIds))
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get(['id', 'name', 'start_date', 'is_paid', 'fee_per_athlete', 'fee_per_contingent']);
        $contingents = Contingent::query()
            ->when($tenantEvent instanceof Event, fn ($query) => $query->whereBelongsTo($tenantEvent))
            ->when(! $isAdmin, fn ($query) => $query->where('user_id', $request->user()->id))
            ->with('event:id,name')
            ->withCount('athletes')
            ->orderBy('name')
            ->get(['id', 'event_id', 'source_contingent_id', 'user_id', 'name', 'city', 'manager_name', 'phone', 'email', 'address']);

        return Inertia::render('Admin/Registration/Create', [
            'events' => $events,
            'contingents' => $contingents,
            'selectedEventId' => $tenantEvent?->id ?? $events->firstWhere('id', $request->input('event_id'))?->id
                ?? $events->firstWhere('is_active', true)?->id ?? $events->first()?->id,
            'isAdmin' => $isAdmin,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'event_id' => ['required', 'uuid', 'exists:events,id'],
            'contingent_id' => ['nullable', 'uuid', 'exists:contingents,id'],
            'name' => ['required_without:contingent_id', 'nullable', 'string', 'max:255'],
            'city' => ['required_without:contingent_id', 'nullable', 'string', 'max:100'],
            'manager_name' => ['required_without:contingent_id', 'nullable', 'string', 'max:255'],
            'phone' => ['required_without:contingent_id', 'nullable', 'string', 'max:50'],
            'email' => ['required_without:contingent_id', 'nullable', 'email', 'max:255'],
            'address' => ['required_without:contingent_id', 'nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $event = Event::query()->findOrFail($validated['event_id']);
        $tenantEvent = $request->attributes->get('tenantEvent');
        abort_unless(! ($tenantEvent instanceof Event) || $tenantEvent->is($event), 404);
        abort_unless($this->canManageMatchEntries($request, $event) || $tenantEvent instanceof Event
            || $event->contingents()->where('user_id', $request->user()?->id)->exists()
            || (! empty($validated['contingent_id']) && Contingent::query()->whereKey($validated['contingent_id'])
                ->where('user_id', $request->user()?->id)->exists()), 403);

        $registration = DB::transaction(function () use ($validated, $event, $request, $tenantEvent): Registration {
            Event::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            $contingent = ! empty($validated['contingent_id'])
                ? Contingent::query()->whereKey($validated['contingent_id'])->lockForUpdate()->first()
                : Contingent::create([
                    'event_id' => $event->id,
                    'user_id' => $request->user()->id,
                    'name' => $validated['name'],
                    'city' => $validated['city'],
                    'manager_name' => $validated['manager_name'],
                    'phone' => $validated['phone'],
                    'email' => $validated['email'],
                    'address' => $validated['address'],
                ]);
            if ($contingent === null) {
                throw ValidationException::withMessages(['contingent_id' => 'Kontingen tidak ditemukan.']);
            }
            if (! $request->user()?->hasAnyRole(['Super Admin', 'Admin']) && $contingent->user_id !== $request->user()?->id
                && ! $this->canManageMatchEntries($request, $event)) {
                abort(403);
            }
            if ($contingent->event_id !== $event->id) {
                if ($tenantEvent instanceof Event || ! $request->user()?->hasAnyRole(['Super Admin', 'Admin'])) {
                    throw ValidationException::withMessages(['contingent_id' => 'Kontingen tidak terdaftar pada event ini.']);
                }

                $source = $contingent;
                $sourceContingentId = $source->source_contingent_id ?? $source->id;
                $contingent = Contingent::query()
                    ->whereBelongsTo($event)
                    ->where('source_contingent_id', $sourceContingentId)
                    ->first();

                if ($contingent === null) {
                    $contingent = $source->replicate();
                    $contingent->event_id = $event->id;
                    $contingent->source_contingent_id = $sourceContingentId;
                    $contingent->save();

                    foreach ($source->athletes as $athlete) {
                        $copy = $athlete->replicate(['school_document_path', 'school_verified_at', 'school_verified_by', 'school_verification_hash']);
                        $copy->contingent_id = $contingent->id;
                        $copy->event_age_category_id = null;
                        $copy->save();
                    }
                    foreach ($source->officials as $official) {
                        $copy = $official->replicate();
                        $copy->contingent_id = $contingent->id;
                        $copy->save();
                    }
                }
            }
            if (Registration::query()->whereBelongsTo($event)->whereBelongsTo($contingent)->exists()) {
                throw ValidationException::withMessages(['contingent_id' => 'Kontingen ini sudah memiliki registrasi untuk event tersebut.']);
            }

            $isPaid = (bool) $event->is_paid;
            $amount = $isPaid ? (float) $event->fee_per_contingent : 0;
            $verificationCode = $isPaid ? Registration::nextVerificationCode($event->id) : null;

            return Registration::create([
                'event_id' => $event->id,
                'contingent_id' => $contingent->id,
                'registration_number' => 'REG-'.$event->start_date?->format('Y').'-'.Str::upper((string) Str::ulid()),
                'status' => RegistrationStatus::Pending,
                'total_amount' => $amount,
                'final_amount' => $amount + ($verificationCode ?? 0),
                'verification_code' => $verificationCode,
                'payment_status' => $isPaid ? PaymentStatus::Pending : PaymentStatus::Verified,
                'payment_amount' => 0,
                'payment_note' => $isPaid ? null : 'Event gratis; pembayaran tidak diperlukan.',
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        return redirect()->route('admin.pendaftaran.registrasi.detail', ['registration' => $registration, 'step' => 2])
            ->with('success', 'Registrasi kontingen berhasil dibuat.');
    }

    public function detail(Request $request, Registration $registration): Response
    {
        $this->ensureTenantRegistration($request, $registration);
        $event = $registration->event;
        abort_unless($event instanceof Event && ($this->canManageMatchEntries($request, $event)
            || $registration->contingent?->user_id === $request->user()?->id), 403);
        $registration->load(['contingent:id,event_id,user_id,name,city,manager_name,phone,email,address',
            'event:id,name,start_date,is_paid,fee_per_athlete,fee_per_contingent,max_match_categories_per_athlete,allow_cross_age_group_embu,participant_rules',
            'paymentMethod:id,name,type,provider,account_name,account_number']);

        $athletes = Athlete::query()
            ->whereBelongsTo($registration->contingent)
            ->with(['matchCategoryEntries' => fn ($query) => $query
                ->whereBelongsTo($event)
                ->with('matchCategory:id,name,type')])
            ->orderBy('name')
            ->get(['id', 'contingent_id', 'event_age_category_id', 'name', 'nik', 'kenshi_number', 'gender', 'birth_place', 'birth_date', 'blood_type', 'dojo_name', 'kyu_dan', 'bpjs_number', 'bpjs_status', 'profile_photo_path', 'weight', 'school_name', 'school_level', 'school_entry_year', 'school_grade', 'school_document_path', 'school_verified_at', 'school_verified_by', 'school_verification_hash']);
        $athletes->each(function (Athlete $athlete) use ($event): void {
            $athlete->setAttribute('school_verification_valid', $this->eligibility->schoolVerified($event, $athlete));
            $athlete->setAttribute('eligibility_errors', array_values($this->eligibility->profileErrors($event, $athlete)));
            $athlete->setAttribute('expected_school_grade', $this->eligibility->expectedGrade($event, $athlete));
        });
        $categories = $event->matchCategories()
            ->where('is_active', true)
            ->whereNull('merged_into_id')
            ->with('ageCategory:id,name,min_age,max_age')
            ->orderBy('order')
            ->get(['id', 'name', 'type', 'gender', 'age_category_id', 'min_kyu', 'max_kyu', 'min_weight', 'max_weight', 'max_athletes_per_team']);
        $categories->each(function (EventMatchCategory $category) use ($athletes, $event): void {
            $eligibleIds = [];
            foreach ($athletes as $athlete) {
                try {
                    $this->ensureAthleteEligibleForMatchCategory($athlete, $category, $event);
                    $eligibleIds[] = $athlete->id;
                } catch (ValidationException) {
                    // The same eligibility rules are enforced again when the athlete is submitted.
                }
            }
            $category->setAttribute('eligible_athlete_ids', $eligibleIds);
        });
        $teamTechniques = EmbuTeamTechnique::query()
            ->where('event_id', $event->id)
            ->where('contingent_id', $registration->contingent_id)
            ->with('technique:id,name,kyu_id')
            ->orderBy('order')
            ->get();
        $admin = $request->user()?->hasAnyRole(['Super Admin', 'Admin']);
        $eventStaff = $this->canManageMatchEntries($request, $event);
        $registrationOwner = $registration->contingent->user_id === $request->user()?->id;
        $registrationLocked = $registration->status === RegistrationStatus::Verified && ! $eventStaff;
        $sourceScope = fn ($query) => $query->where(function ($contingentQuery) use ($request, $event, $eventStaff) {
            $contingentQuery->where('user_id', $request->user()->id);
            if ($eventStaff) {
                $contingentQuery->orWhere('event_id', $event->id);
            }
        });

        return Inertia::render('Admin/Registration/WizardDetail', [
            'registration' => $registration,
            'participantRequirements' => $this->eligibility->summary($event),
            'canVerifySchool' => $eventStaff,
            'athletes' => $athletes,
            'categories' => $categories,
            'teamTechniques' => $teamTechniques,
            'techniques' => Technique::query()->where('is_active', true)->orderBy('order')->orderBy('name')->get(['id', 'name', 'kyu_id']),
            'officials' => $registration->contingent->officials()->orderBy('name')->get(['id', 'name', 'role', 'phone', 'gender']),
            'availableOfficials' => Official::query()->where('contingent_id', '!=', $registration->contingent_id)
                ->when(! $admin, fn ($query) => $query->whereHas('contingent', $sourceScope))
                ->with('contingent:id,name')->orderBy('name')->limit(500)->get(['id', 'contingent_id', 'name', 'role', 'phone']),
            'kyus' => Kyu::query()->where('is_active', true)->orderBy('order')->pluck('name'),
            'ageCategories' => $event->ageCategories()->where('is_active', true)->orderBy('order')->get(['id', 'name', 'min_age', 'max_age']),
            'paymentMethods' => $event->paymentMethods()->where('payment_methods.is_active', true)->get(['payment_methods.id', 'name', 'type', 'provider', 'account_name', 'account_number']),
            'canManage' => $eventStaff || ($registrationOwner && ! $registrationLocked),
            'registrationLocked' => $registrationLocked,
        ]);
    }

    /**
     * Manage match groups, Embu teams, and techniques for one registration in an event.
     */
    public function matchGroups(Request $request): Response|RedirectResponse
    {
        if ($this->isContingentPortalUser($request)) {
            return redirect()->route('kontingen.registrasi');
        }

        $events = $this->registrationEventsForRequest($request);
        $tenantEvent = $request->attributes->get('tenantEvent');
        $event = $events->firstWhere('id', $tenantEvent?->id ?? $request->query('event_id'))
            ?? $events->firstWhere('is_active', true)
            ?? $events->first();

        abort_unless($event instanceof Event, 403);
        $eventStaff = $this->canManageMatchEntries($request, $event);
        $isContingentOwner = $event->contingents()->where('user_id', $request->user()?->id)->exists();
        abort_unless($eventStaff || $isContingentOwner, 403);

        $registrations = Registration::query()
            ->whereBelongsTo($event)
            ->when(! $eventStaff, fn ($query) => $query->whereHas('contingent',
                fn ($contingentQuery) => $contingentQuery->where('user_id', $request->user()?->id)))
            ->with('contingent:id,name,city')
            ->orderBy('registration_number')
            ->get(['id', 'event_id', 'contingent_id', 'registration_number', 'status']);

        $selectedId = $request->query('registration_id');
        $registration = $selectedId
            ? $registrations->firstWhere('id', $selectedId)
            : $registrations->first();

        if ($selectedId) {
            abort_unless($registration instanceof Registration, 404);
        }

        $athletes = collect();
        $categories = collect();
        $teamTechniques = collect();
        $ageCategories = collect();

        if ($registration instanceof Registration) {
            $registration->load([
                'event:id,name,max_match_categories_per_athlete',
                'contingent:id,name,city,manager_name',
            ]);
            $athletes = Athlete::query()
                ->whereBelongsTo($registration->contingent)
                ->with(['matchCategoryEntries' => fn ($query) => $query
                    ->whereBelongsTo($event)
                    ->with('matchCategory:id,name,type')])
                ->orderBy('name')
                ->get(['id', 'contingent_id', 'event_age_category_id', 'name', 'nik', 'kenshi_number', 'kyu_dan', 'weight']);
            $categories = $event->matchCategories()
                ->where('is_active', true)
                ->whereNull('merged_into_id')
                ->with('ageCategory:id,name,min_age,max_age')
                ->orderBy('order')
                ->get(['id', 'name', 'type', 'gender', 'age_category_id', 'min_weight', 'max_weight', 'max_athletes_per_team']);
            $teamTechniques = EmbuTeamTechnique::query()
                ->where('event_id', $event->id)
                ->where('contingent_id', $registration->contingent_id)
                ->with('technique:id,name,kyu_id')
                ->orderBy('order')
                ->get();
            $ageCategories = $event->ageCategories()
                ->where('is_active', true)
                ->orderBy('order')
                ->get(['id', 'name', 'min_age', 'max_age']);
        }

        return Inertia::render('Admin/Registration/MatchGroups', [
            'activeEvent' => $event->only(['id', 'name']),
            'eventOptions' => $this->eventOptions($events),
            'registrations' => $registrations,
            'registration' => $registration,
            'athletes' => $athletes,
            'categories' => $categories,
            'teamTechniques' => $teamTechniques,
            'techniques' => Technique::query()->where('is_active', true)->orderBy('order')->orderBy('name')->get(['id', 'name', 'kyu_id']),
            'ageCategories' => $ageCategories,
        ]);
    }

    /**
     * Display the athlete document verification list.
     */
    public function verifikasi(Request $request): Response
    {
        $events = $this->registrationEventsForRequest($request);
        $activeEvent = $events->firstWhere('id', $request->attributes->get('tenantEvent')?->id ?? $request->input('event_id'))
            ?? $events->firstWhere('is_active', true)
            ?? $events->first();
        $search = $request->input('search');
        $contingentId = $request->input('contingent_id');
        $query = Athlete::query()
            ->with([
                'contingent:id,name,city',
                'matchCategoryEntries' => fn ($entryQuery) => $entryQuery
                    ->when($activeEvent instanceof Event, fn ($eventQuery) => $eventQuery->whereBelongsTo($activeEvent))
                    ->with('matchCategory:id,name'),
            ])
            ->latest();

        if ($activeEvent instanceof Event) {
            $query->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($activeEvent));
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('kyu_dan', 'like', "%{$search}%");
            });
        }

        if ($contingentId) {
            $query->where('contingent_id', $contingentId);
        }

        $athletes = $query->paginate(15)->withQueryString()->through(fn (Athlete $athlete) => [
            'id' => $athlete->id,
            'name' => $athlete->name,
            'gender' => $athlete->gender,
            'kyu_dan' => $athlete->kyu_dan,
            'weight' => $athlete->weight,
            'height' => $athlete->height,
            'birth_date' => $athlete->birth_date?->format('Y-m-d'),
            'contingent' => $athlete->contingent?->only(['id', 'name', 'city']),
            'match_categories' => $athlete->matchCategoryEntries->map(fn (AthleteMatchCategoryEntry $entry) => [
                'id' => $entry->id,
                'category_id' => $entry->event_match_category_id,
                'name' => $entry->matchCategory?->name ?? 'Nomor pertandingan tidak tersedia',
            ])->values(),
        ]);
        $contingentsQuery = Contingent::select(['id', 'name'])->orderBy('name');

        if ($activeEvent instanceof Event) {
            $contingentsQuery->whereBelongsTo($activeEvent);
        } else {
            $contingentsQuery->whereRaw('1 = 0');
        }

        $contingents = $contingentsQuery->get();

        $athleteStatsQuery = Athlete::query();

        if ($activeEvent instanceof Event) {
            $athleteStatsQuery->whereHas('contingent', fn ($contingentQuery) => $contingentQuery->whereBelongsTo($activeEvent));
        } else {
            $athleteStatsQuery->whereRaw('1 = 0');
        }

        $totalAthletes = (clone $athleteStatsQuery)->count();
        $readyMatchQuery = (clone $athleteStatsQuery)->whereHas('matchCategoryEntries', fn ($entryQuery) => $entryQuery
            ->when($activeEvent instanceof Event, fn ($eventQuery) => $eventQuery->whereBelongsTo($activeEvent)));
        $matchCategories = $activeEvent instanceof Event
            ? $activeEvent->matchCategories()
                ->where('is_active', true)
                ->whereNull('merged_into_id')
                ->with('ageCategory:id,name,min_age,max_age')
                ->withCount('athleteEntries')
                ->get()
                ->map(fn (EventMatchCategory $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'type' => ucfirst($category->type),
                    'gender' => $category->gender,
                    'min_weight' => $category->min_weight !== null ? (float) $category->min_weight : null,
                    'max_weight' => $category->max_weight !== null ? (float) $category->max_weight : null,
                    'max_athletes_per_team' => $category->max_athletes_per_team,
                    'participants_count' => $category->athlete_entries_count,
                    'age_category_name' => $category->ageCategory?->name,
                ])->values()
            : collect();

        $stats = [
            'total_kenshi' => $totalAthletes,
            'verified_docs' => (int) round($totalAthletes * 0.85),
            'pending_docs' => (int) round($totalAthletes * 0.15),
            'ready_match' => $readyMatchQuery->count(),
        ];

        return Inertia::render('Admin/Registration/Verification', [
            'athletes' => $athletes,
            'contingents' => $contingents,
            'stats' => $stats,
            'filters' => [
                'search' => $search ?? '',
                'contingent_id' => $contingentId ?? '',
                'event_id' => $activeEvent?->id,
            ],
            'activeEvent' => $activeEvent?->only(['id', 'name']),
            'eventOptions' => $this->eventOptions($events),
            'matchCategories' => $matchCategories,
            'maxMatchCategoriesPerAthlete' => $activeEvent?->max_match_categories_per_athlete,
            'canManageMatchEntries' => $this->canManageMatchEntries($request, $activeEvent),
        ]);
    }

    /**
     * Verify a registration document and payment.
     */
    public function verifyRegistration(Request $request, Registration $registration): RedirectResponse
    {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($this->canManageMatchEntries($request, $registration->event), 403);

        DB::transaction(function () use ($registration): void {
            $event = Event::query()->whereKey($registration->event_id)->lockForUpdate()->firstOrFail();
            $registration = Registration::query()->whereKey($registration)->lockForUpdate()->firstOrFail();
            $registration->setRelation('event', $event);
            $this->eligibility->validateRegistration($registration);
            $registration->update(['status' => RegistrationStatus::Verified]);
        }, 3);

        return redirect()->back()->with('success', "Registrasi {$registration->registration_number} berhasil disetujui & diverifikasi.");
    }

    /**
     * Reject a registration document or payment.
     */
    public function rejectRegistration(Request $request, Registration $registration): RedirectResponse
    {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($this->canManageMatchEntries($request, $registration->event), 403);

        $registration->update([
            'status' => RegistrationStatus::Rejected,
        ]);

        return redirect()->back()->with('success', "Registrasi {$registration->registration_number} ditandai sebagai ditolak.");
    }

    public function submitPayment(StoreRegistrationPaymentRequest $request, Registration $registration): RedirectResponse
    {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($this->canManageRegistration($request, $registration), 403);
        $this->ensureRegistrationEditable($request, $registration);

        if (! $registration->event?->is_paid) {
            throw ValidationException::withMessages([
                'payment_method_id' => 'Event gratis tidak memerlukan pembayaran.',
            ]);
        }

        $validated = $request->validated();
        $paymentMethod = $registration->event?->paymentMethods()
            ->whereKey($validated['payment_method_id'])
            ->first();

        if (! $paymentMethod) {
            throw ValidationException::withMessages([
                'payment_method_id' => 'Metode pembayaran tidak tersedia untuk event registrasi ini.',
            ]);
        }

        $paymentProofPath = $registration->payment_proof_path;

        if ($request->hasFile('payment_proof')) {
            $paymentProofPath = $request->file('payment_proof')->store('registration-payments');

            if ($registration->payment_proof_path) {
                Storage::delete($registration->payment_proof_path);
            }
        }

        $registration->update([
            'payment_method_id' => $paymentMethod->id,
            'payment_status' => PaymentStatus::Submitted,
            'payment_amount' => $validated['payment_amount'],
            'payment_reference' => $validated['payment_reference'] ?? null,
            'payment_proof_path' => $paymentProofPath,
            'payment_submitted_at' => now(),
            'payment_verified_at' => null,
            'payment_verified_by' => null,
            'payment_note' => $validated['payment_note'] ?? null,
        ]);

        return back()->with('success', "Pembayaran {$registration->registration_number} berhasil dicatat dan menunggu verifikasi.");
    }

    public function verifyPayment(Request $request, Registration $registration): RedirectResponse
    {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($this->canManageMatchEntries($request, $registration->event), 403);
        abort_unless($registration->event?->is_paid, 422);
        abort_unless($registration->payment_status === PaymentStatus::Submitted, 422);

        $registration->update([
            'payment_status' => PaymentStatus::Verified,
            'payment_verified_at' => now(),
            'payment_verified_by' => $request->user()?->id,
        ]);

        return back()->with('success', "Pembayaran {$registration->registration_number} telah diverifikasi.");
    }

    public function rejectPayment(Request $request, Registration $registration): RedirectResponse
    {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($this->canManageMatchEntries($request, $registration->event), 403);
        abort_unless($registration->event?->is_paid, 422);
        abort_unless($registration->payment_status === PaymentStatus::Submitted, 422);

        $validated = $request->validate([
            'payment_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $registration->update([
            'payment_status' => PaymentStatus::Rejected,
            'payment_verified_at' => now(),
            'payment_verified_by' => $request->user()?->id,
            'payment_note' => $validated['payment_note'] ?? $registration->payment_note,
        ]);

        return back()->with('success', "Pembayaran {$registration->registration_number} ditolak untuk diperbaiki.");
    }

    /**
     * Enroll an athlete into an event match category.
     */
    public function storeAthleteMatchCategoryEntry(StoreAthleteMatchCategoryEntryRequest $request, Athlete $athlete): RedirectResponse
    {
        return $this->addMatchCategoryForEvent($request, $this->eventForRequest($request), $athlete);
    }

    public function storeRegistrationAthleteMatchCategoryEntry(
        StoreAthleteMatchCategoryEntryRequest $request,
        Registration $registration,
        Athlete $athlete
    ): RedirectResponse {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($athlete->contingent_id === $registration->contingent_id, 404);
        abort_unless($this->canManageRegistration($request, $registration), 403);
        $this->ensureRegistrationEditable($request, $registration);

        return $this->addMatchCategoryForEvent($request, $registration->event, $athlete, true);
    }

    private function addMatchCategoryForEvent(
        StoreAthleteMatchCategoryEntryRequest $request,
        ?Event $activeEvent,
        Athlete $athlete,
        bool $allowContingentOwner = false,
    ): RedirectResponse {
        $isContingentOwner = $allowContingentOwner && $athlete->contingent?->user_id === $request->user()?->id;
        abort_unless($activeEvent instanceof Event && ($this->canManageMatchEntries($request, $activeEvent) || $isContingentOwner), 403);

        DB::transaction(function () use ($request, $activeEvent, $athlete): void {
            $athlete = Athlete::query()->whereKey($athlete)->lockForUpdate()->firstOrFail();
            abort_unless($athlete->contingent()->whereBelongsTo($activeEvent)->exists(), 404);

            $matchCategory = EventMatchCategory::query()
                ->whereBelongsTo($activeEvent)
                ->whereKey($request->validated('event_match_category_id'))
                ->where('is_active', true)
                ->whereNull('merged_into_id')
                ->with('ageCategory:id,min_age,max_age')
                ->lockForUpdate()
                ->first();

            if ($matchCategory === null) {
                throw ValidationException::withMessages([
                    'event_match_category_id' => 'Nomor pertandingan tidak tersedia untuk event ini.',
                ]);
            }

            $this->ensureAthleteEligibleForMatchCategory($athlete, $matchCategory, $activeEvent);

            if (AthleteMatchCategoryEntry::query()
                ->where('athlete_id', $athlete->id)
                ->where('event_match_category_id', $matchCategory->id)
                ->exists()) {
                throw ValidationException::withMessages([
                    'event_match_category_id' => 'Atlet sudah terdaftar pada nomor pertandingan ini.',
                ]);
            }

            $maximumCategories = $activeEvent->max_match_categories_per_athlete;
            $registeredCategories = AthleteMatchCategoryEntry::query()
                ->whereBelongsTo($activeEvent)
                ->where('athlete_id', $athlete->id)
                ->count();

            if ($maximumCategories !== null && $registeredCategories >= $maximumCategories) {
                throw ValidationException::withMessages([
                    'event_match_category_id' => "Atlet hanya dapat mengikuti maksimal {$maximumCategories} nomor pertandingan pada event ini.",
                ]);
            }

            $teamEntries = AthleteMatchCategoryEntry::query()
                ->where('event_match_category_id', $matchCategory->id)
                ->whereHas('athlete', fn ($athleteQuery) => $athleteQuery->where('contingent_id', $athlete->contingent_id))
                ->when($matchCategory->type === 'embu', fn ($query) => $query->where('team_number', (int) ($request->validated('team_number') ?? 1)))
                ->count();

            if ($teamEntries >= $matchCategory->max_athletes_per_team) {
                throw ValidationException::withMessages($matchCategory->type === 'embu'
                    ? ['team_number' => "Tim ini sudah mencapai batas {$matchCategory->max_athletes_per_team} atlet. Pilih tim lain."]
                    : ['event_match_category_id' => "Kontingen sudah mencapai batas {$matchCategory->max_athletes_per_team} atlet untuk nomor pertandingan ini."]);
            }

            AthleteMatchCategoryEntry::create([
                'event_id' => $activeEvent->id,
                'athlete_id' => $athlete->id,
                'event_match_category_id' => $matchCategory->id,
                'team_number' => $matchCategory->type === 'embu' ? (int) ($request->validated('team_number') ?? 1) : 1,
            ]);
        });

        return back()->with('success', "Nomor pertandingan berhasil ditambahkan untuk {$athlete->name}.");
    }

    /**
     * Remove an athlete's event match category entry.
     */
    public function destroyAthleteMatchCategoryEntry(Request $request, Athlete $athlete, AthleteMatchCategoryEntry $entry): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $this->canManageMatchEntries($request, $activeEvent), 403);
        abort_unless($entry->event_id === $activeEvent->id && $entry->athlete_id === $athlete->id, 404);

        $entry->delete();
        $registration = Registration::query()
            ->where('event_id', $activeEvent->id)
            ->where('contingent_id', $athlete->contingent_id)
            ->first();
        if ($registration !== null) {
            $this->removeTechniquesForEmptyTeam($registration, $entry);
        }

        return back()->with('success', "Nomor pertandingan untuk {$athlete->name} berhasil dihapus.");
    }

    public function destroyRegistrationAthleteMatchCategoryEntry(
        Request $request,
        Registration $registration,
        Athlete $athlete,
        AthleteMatchCategoryEntry $entry
    ): RedirectResponse {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($registration->event instanceof Event && $this->canManageRegistration($request, $registration), 403);
        $this->ensureRegistrationEditable($request, $registration);
        abort_unless($athlete->contingent_id === $registration->contingent_id, 404);
        abort_unless($entry->event_id === $registration->event_id && $entry->athlete_id === $athlete->id, 404);

        $entry->delete();
        $this->removeTechniquesForEmptyTeam($registration, $entry);

        return back()->with('success', "Nomor pertandingan untuk {$athlete->name} berhasil dihapus.");
    }

    public function updateRegistrationAthleteTeam(
        Request $request,
        Registration $registration,
        Athlete $athlete,
        AthleteMatchCategoryEntry $entry
    ): RedirectResponse {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($registration->event instanceof Event && $this->canManageRegistration($request, $registration), 403);
        $this->ensureRegistrationEditable($request, $registration);
        abort_unless($athlete->contingent_id === $registration->contingent_id && $entry->athlete_id === $athlete->id && $entry->event_id === $registration->event_id, 404);

        $validated = $request->validate(['team_number' => ['required', 'integer', 'min:1', 'max:20']]);
        $category = EventMatchCategory::query()
            ->whereKey($entry->event_match_category_id)
            ->whereBelongsTo($registration->event)
            ->firstOrFail();
        abort_unless($category->type === 'embu', 404);

        $newTeamNumber = (int) $validated['team_number'];
        if ($entry->team_number === $newTeamNumber) {
            return back();
        }

        DB::transaction(function () use ($registration, $entry, $category, $newTeamNumber): void {
            EventMatchCategory::query()->whereKey($category)->lockForUpdate()->firstOrFail();
            $teamCount = AthleteMatchCategoryEntry::query()
                ->where('event_match_category_id', $category->id)
                ->where('team_number', $newTeamNumber)
                ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))
                ->count();

            if ($teamCount >= $category->max_athletes_per_team) {
                throw ValidationException::withMessages(['team_number' => 'Tim tujuan sudah penuh.']);
            }

            $previousTeamNumber = $entry->team_number;
            $entry->update(['team_number' => $newTeamNumber]);
            $this->removeTechniquesForEmptyTeam($registration, $entry, $previousTeamNumber);
        });

        return back()->with('success', 'Tim atlet berhasil diperbarui.');
    }

    public function storeRegistrationTeamTechnique(
        Request $request,
        Registration $registration,
        EventMatchCategory $category,
        int $teamNumber
    ): RedirectResponse {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($registration->event instanceof Event && $this->canManageRegistration($request, $registration), 403);
        $this->ensureRegistrationEditable($request, $registration);
        abort_unless($category->event_id === $registration->event_id && $category->type === 'embu'
            && $category->is_active && $category->merged_into_id === null && $teamNumber >= 1 && $teamNumber <= 20, 404);

        $validated = $request->validate([
            'technique_id' => ['required_without:technique_name', 'nullable', 'uuid', Rule::exists('techniques', 'id')->where('is_active', true)->whereNull('deleted_at')],
            'technique_name' => ['required_without:technique_id', 'nullable', 'string', 'max:150'],
        ]);

        $teamHasAthletes = AthleteMatchCategoryEntry::query()
            ->where('event_match_category_id', $category->id)
            ->where('team_number', $teamNumber)
            ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))
            ->exists();
        if (! $teamHasAthletes) {
            throw ValidationException::withMessages(['technique_id' => 'Tambahkan atlet ke tim sebelum memilih teknik.']);
        }

        $query = EmbuTeamTechnique::query()
            ->where('contingent_id', $registration->contingent_id)
            ->where('event_match_category_id', $category->id)
            ->where('team_number', $teamNumber);
        DB::transaction(function () use ($validated, $query, $registration, $category, $teamNumber): void {
            $techniqueId = $validated['technique_id'] ?? null;
            if (! $techniqueId) {
                $name = trim($validated['technique_name']);
                if ($name === '') {
                    throw ValidationException::withMessages(['technique_name' => 'Nama teknik wajib diisi.']);
                }

                $technique = Technique::query()->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
                if (! $technique) {
                    $technique = Technique::create([
                        'name' => $name,
                        'order' => min(1000, (Technique::query()->max('order') ?? 0) + 1),
                        'is_active' => true,
                    ]);
                }
                if (! $technique->is_active) {
                    throw ValidationException::withMessages(['technique_name' => 'Teknik ini sudah ada tetapi belum aktif di Master Teknik.']);
                }
                $techniqueId = $technique->id;
            }

            if ((clone $query)->where('technique_id', $techniqueId)->exists()) {
                throw ValidationException::withMessages(['technique_id' => 'Teknik ini sudah dipilih untuk tim tersebut.']);
            }

            EmbuTeamTechnique::create([
                'event_id' => $registration->event_id,
                'contingent_id' => $registration->contingent_id,
                'event_match_category_id' => $category->id,
                'team_number' => $teamNumber,
                'technique_id' => $techniqueId,
                'order' => ((clone $query)->max('order') ?? 0) + 1,
            ]);
        });

        return back()->with('success', 'Teknik Embu berhasil ditambahkan.');
    }

    public function destroyRegistrationTeamTechnique(
        Request $request,
        Registration $registration,
        EventMatchCategory $category,
        int $teamNumber,
        EmbuTeamTechnique $teamTechnique
    ): RedirectResponse {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($registration->event instanceof Event && $this->canManageRegistration($request, $registration), 403);
        $this->ensureRegistrationEditable($request, $registration);
        abort_unless($category->event_id === $registration->event_id && $category->type === 'embu', 404);
        abort_unless($teamTechnique->event_id === $registration->event_id
            && $teamTechnique->contingent_id === $registration->contingent_id
            && $teamTechnique->event_match_category_id === $category->id
            && $teamTechnique->team_number === $teamNumber, 404);

        $teamTechnique->delete();

        return back()->with('success', 'Teknik Embu berhasil dihapus.');
    }

    private function removeTechniquesForEmptyTeam(
        Registration $registration,
        AthleteMatchCategoryEntry $entry,
        ?int $teamNumber = null
    ): void {
        $teamNumber ??= $entry->team_number;
        $category = $entry->matchCategory;
        if ($category?->type !== 'embu') {
            return;
        }

        $hasAthletes = AthleteMatchCategoryEntry::query()
            ->where('event_match_category_id', $entry->event_match_category_id)
            ->where('team_number', $teamNumber)
            ->whereHas('athlete', fn ($query) => $query->where('contingent_id', $registration->contingent_id))
            ->exists();
        if (! $hasAthletes) {
            EmbuTeamTechnique::query()
                ->where('contingent_id', $registration->contingent_id)
                ->where('event_match_category_id', $entry->event_match_category_id)
                ->where('team_number', $teamNumber)
                ->delete();
        }
    }

    public function downloadPaymentProof(Request $request, Registration $registration): mixed
    {
        $this->ensureTenantRegistration($request, $registration);
        abort_unless($this->canManageRegistration($request, $registration), 403);
        abort_unless($registration->payment_proof_path && Storage::exists($registration->payment_proof_path), 404);

        return Storage::download($registration->payment_proof_path);
    }

    private function ensureTenantRegistration(Request $request, Registration $registration): void
    {
        abort_unless($request->user(), 403);

        $tenantEvent = $request->attributes->get('tenantEvent');
        abort_unless(! ($tenantEvent instanceof Event) || $registration->event_id === $tenantEvent->id, 404);
    }

    private function ensureRegistrationEditable(Request $request, Registration $registration): void
    {
        if ($registration->status === RegistrationStatus::Verified
            && ! $this->canManageMatchEntries($request, $registration->event)) {
            throw ValidationException::withMessages([
                'registration' => 'Registrasi sudah diverifikasi dan dikunci. Hubungi admin atau penyelenggara event jika data perlu diperbaiki.',
            ]);
        }
    }

    private function eventForRequest(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        $events = $this->registrationEventsForRequest($request);

        return $events->firstWhere('id', $tenantEvent?->id ?? $request->input('event_id'))
            ?? $events->firstWhere('is_active', true)
            ?? $events->first();
    }

    private function registrationEventsForRequest(Request $request): Collection
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        if ($tenantEvent instanceof Event) {
            return collect([$tenantEvent]);
        }

        $user = $request->user();
        if (! $user) {
            return collect();
        }

        return Event::query()
            ->when(! $user->hasAnyRole(['Super Admin', 'Admin']), fn ($query) => $query->where(
                fn ($eventQuery) => $eventQuery->whereHas('users', fn ($usersQuery) => $usersQuery->whereKey($user->id))
                    ->orWhereHas('contingents', fn ($contingentsQuery) => $contingentsQuery->where('user_id', $user->id))
            ))
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  Collection<int, Event>  $events
     * @return Collection<int, array{id: string, name: string, city: ?string, date_label: string, status: string, status_label: string, is_active: bool, is_paid: bool, option_description: string}>
     */
    private function eventOptions(Collection $events): Collection
    {
        return $events->map(function (Event $event): array {
            $dateLabel = $event->start_date?->translatedFormat('d M Y').' – '.$event->end_date?->translatedFormat('d M Y');

            return [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'date_label' => $dateLabel,
                'status' => $event->status->value,
                'status_label' => $event->status->label(),
                'is_active' => (bool) $event->is_active,
                'is_paid' => (bool) $event->is_paid,
                'option_description' => implode(' · ', array_filter([
                    $event->status->label(),
                    $dateLabel,
                    $event->city,
                    $event->is_active ? 'Operasional' : 'Nonaktif operasional',
                ])),
            ];
        })->values();
    }

    private function canManageMatchEntries(Request $request, ?Event $event): bool
    {
        $user = $request->user();

        if (! $user || ! $event instanceof Event) {
            return false;
        }

        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return true;
        }

        return in_array($event->accessRoleFor($user), [
            Event::AccessRoleResponsible,
            Event::AccessRoleAdmin,
            Event::AccessRoleStaff,
        ], true);
    }

    private function isContingentPortalUser(Request $request): bool
    {
        $user = $request->user();

        return $user !== null
            && $user->hasAnyRole(['kontingen', 'Contingent'])
            && ! $user->hasAnyRole(['Super Admin', 'Admin']);
    }

    private function canManageRegistration(Request $request, Registration $registration): bool
    {
        return $this->canManageMatchEntries($request, $registration->event)
            || $registration->contingent?->user_id === $request->user()?->id;
    }

    private function ensureAthleteEligibleForMatchCategory(
        Athlete $athlete,
        EventMatchCategory $matchCategory,
        Event $event
    ): void {
        $this->eligibility->validateCategory($event, $athlete, $matchCategory, 'event_match_category_id');
        if ($matchCategory->min_weight !== null && ($athlete->weight === null || (float) $athlete->weight < (float) $matchCategory->min_weight)) {
            throw ValidationException::withMessages([
                'event_match_category_id' => 'Berat badan atlet belum memenuhi batas minimal nomor pertandingan.',
            ]);
        }

        if ($matchCategory->max_weight !== null && ($athlete->weight === null || (float) $athlete->weight > (float) $matchCategory->max_weight)) {
            throw ValidationException::withMessages([
                'event_match_category_id' => 'Berat badan atlet melebihi batas maksimal nomor pertandingan.',
            ]);
        }

        $ageCategory = $matchCategory->ageCategory;

        if ($ageCategory !== null && $athlete->event_age_category_id !== null) {
            if ($athlete->event_age_category_id !== $ageCategory->id) {
                throw ValidationException::withMessages([
                    'event_match_category_id' => 'Kelompok usia pilihan atlet berbeda dari nomor pertandingan. Gunakan Gabung Kelompok Usia Lain pada wizard untuk Embu ke kelompok lebih tua.',
                ]);
            }

            return;
        }

        if (! $this->eligibility->enabled($event) && $ageCategory !== null && ($ageCategory->min_age !== null || $ageCategory->max_age !== null)) {
            if ($athlete->birth_date === null) {
                throw ValidationException::withMessages([
                    'event_match_category_id' => 'Tanggal lahir atlet diperlukan untuk nomor pertandingan berdasarkan kelompok umur.',
                ]);
            }

            $age = (int) $athlete->birth_date->diffInYears($event->start_date);

            if (($ageCategory->min_age !== null && $age < $ageCategory->min_age)
                || ($ageCategory->max_age !== null && $age > $ageCategory->max_age)) {
                throw ValidationException::withMessages([
                    'event_match_category_id' => 'Usia atlet tidak sesuai dengan kelompok umur nomor pertandingan.',
                ]);
            }
        }
    }
}
