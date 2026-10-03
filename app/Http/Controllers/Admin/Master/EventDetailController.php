<?php

namespace App\Http\Controllers\Admin\Master;

use App\Actions\Admin\Event\SyncEventRegistrationFeesAction;
use App\Actions\Admin\Event\SyncEventUsersAction;
use App\Enums\EventStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Event\UpdateEventCoverRequest;
use App\Http\Requests\Admin\Event\UpdateEventFeesRequest;
use App\Http\Requests\Admin\Master\UpdateEventTournamentSettingsRequest;
use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\FieldCoordinator;
use App\Models\Kyu;
use App\Models\PaymentMethod;
use App\Models\Referee;
use App\Models\Rundown;
use App\Models\User;
use App\Models\WeightClass;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EventDetailController extends Controller
{
    /**
     * Display the detail & settings page for a specific or active event.
     */
    public function show(Request $request, ?Event $event = null): Response|RedirectResponse
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            $event = $tenantEvent;
        }

        // If event is not specified in route, resolve the active event or first event
        if (! $event || ! $event->exists) {
            $event = Event::where('is_active', true)->first()
                ?? Event::orderByDesc('start_date')->first()
                ?? Event::first();

            if (! $event) {
                return redirect()->route('admin.master.event.index')
                    ->with('error', 'Belum ada data event. Silakan buat event terlebih dahulu.');
            }
        }

        // Load all relations
        $event->load([
            'ageCategories' => fn ($q) => $q->orderBy('order')->orderBy('min_age'),
            'courts' => fn ($q) => $q->orderBy('order'),
            'matchCategories.ageCategory',
            'matchCategories.weightClass',
            'rundowns' => fn ($q) => $q->orderBy('date')->orderBy('order'),
            'paymentMethods',
            'referees',
            'clerks',
            'fieldCoordinators',
            'users:id,name,email',
        ]);

        // List of all events for the quick switcher
        $allEventsQuery = Event::query()
            ->select('id', 'name', 'edition', 'is_active', 'status', 'start_date', 'end_date')
            ->orderByDesc('is_active')
            ->orderByDesc('start_date');

        if ($tenantEvent instanceof Event) {
            $allEventsQuery->whereKey($tenantEvent);
        }

        $allEvents = $allEventsQuery
            ->get()
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'name' => $e->name,
                'edition' => $e->edition,
                'is_active' => (bool) $e->is_active,
                'status' => $e->status instanceof \BackedEnum ? $e->status->value : (string) $e->status,
                'dates' => $e->start_date?->format('d/m/Y').' - '.$e->end_date?->format('d/m/Y'),
            ]);

        $kyus = Kyu::query()
            ->where('is_active', true)
            ->orderBy('order')
            ->orderByDesc('name')
            ->get(['id', 'name', 'belt_color']);

        $weightClasses = WeightClass::query()
            ->where('is_active', true)
            ->orderBy('gender')
            ->orderBy('order')
            ->get(['id', 'name', 'gender', 'min_weight', 'max_weight']);

        $selectedPaymentMethodIds = $event->paymentMethods->modelKeys();
        $paymentMethods = PaymentMethod::query()
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->orWhereIn('id', $selectedPaymentMethodIds))
            ->orderBy('order')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'type', 'provider', 'account_name', 'account_number', 'instructions', 'is_active']);

        $selectedRefereeIds = $event->referees->modelKeys();
        $referees = Referee::query()
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->orWhereIn('id', $selectedRefereeIds))
            ->orderBy('name')
            ->get(['id', 'name', 'dan_grade', 'license_number', 'certification_level', 'region', 'is_active']);

        $eventReferees = $event->referees->map(fn (Referee $referee) => [
            'id' => $referee->id,
            'name' => $referee->name,
            'dan_grade' => $referee->dan_grade,
            'license_number' => $referee->license_number,
            'certification_level' => $referee->certification_level,
            'region' => $referee->region,
            'role' => $referee->pivot->role,
        ]);

        $selectedClerkIds = $event->clerks->modelKeys();
        $clerks = Clerk::query()
            ->where(fn ($query) => $query
                ->where('is_active', true)
                ->orWhereIn('id', $selectedClerkIds))
            ->orderBy('name')
            ->get(['id', 'name', 'employee_number', 'certification', 'region', 'is_active']);

        $eventClerks = $event->clerks->map(fn (Clerk $clerk) => [
            'id' => $clerk->id,
            'name' => $clerk->name,
            'employee_number' => $clerk->employee_number,
            'certification' => $clerk->certification,
            'region' => $clerk->region,
            'role' => $clerk->pivot->role,
        ]);

        $selectedCoordinatorIds = $event->fieldCoordinators->modelKeys();
        $fieldCoordinators = FieldCoordinator::query()->where(fn ($query) => $query->where('is_active', true)->orWhereIn('id', $selectedCoordinatorIds))->orderBy('name')->get(['id', 'name', 'coordinator_number', 'region', 'is_active']);
        $eventFieldCoordinators = $event->fieldCoordinators->map(fn (FieldCoordinator $coordinator) => ['id' => $coordinator->id, 'name' => $coordinator->name, 'coordinator_number' => $coordinator->coordinator_number, 'region' => $coordinator->region, 'assignment_area' => $coordinator->pivot->assignment_area]);
        $users = User::query()->with('roles:id,name')->orderBy('name')->get(['id', 'name', 'email']);
        $eventUsers = $event->users->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'access_role' => $user->pivot->access_role]);

        // Formatted age categories with counts
        $ageCategories = $event->ageCategories->map(fn (EventAgeCategory $ac) => [
            'id' => $ac->id,
            'event_id' => $ac->event_id,
            'name' => $ac->name,
            'min_age' => $ac->min_age,
            'max_age' => $ac->max_age,
            'age_range' => ($ac->min_age && $ac->max_age) ? "{$ac->min_age} - {$ac->max_age} Tahun" : ($ac->min_age ? "≥ {$ac->min_age} Tahun" : ($ac->max_age ? "≤ {$ac->max_age} Tahun" : 'Semua Usia')),
            'fee' => (float) $ac->fee,
            'fee_formatted' => 'Rp '.number_format($ac->fee, 0, ',', '.'),
            'description' => $ac->description,
            'order' => $ac->order,
            'is_active' => (bool) $ac->is_active,
            'match_categories_count' => $ac->matchCategories()->count(),
        ]);

        // Formatted courts
        $courts = $event->courts->map(fn (EventCourt $c) => [
            'id' => $c->id,
            'event_id' => $c->event_id,
            'name' => $c->name,
            'location' => $c->location,
            'description' => $c->description,
            'order' => $c->order,
            'is_active' => (bool) $c->is_active,
        ]);

        // Formatted match categories
        $matchCategories = $event->matchCategories->map(fn (EventMatchCategory $mc) => [
            'id' => $mc->id,
            'event_id' => $mc->event_id,
            'age_category_id' => $mc->age_category_id,
            'age_category_name' => $mc->ageCategory?->name ?? 'Semua Umur',
            'weight_class_id' => $mc->weight_class_id,
            'weight_class_name' => $mc->weightClass?->name,
            'name' => $mc->name,
            'type' => $mc->type, // 'embu' | 'randori'
            'gender' => $mc->gender, // 'male' | 'female' | 'mixed'
            'capacity' => (int) $mc->capacity,
            'max_athletes_per_team' => (int) $mc->max_athletes_per_team,
            'min_weight' => $mc->min_weight ? (float) $mc->min_weight : null,
            'max_weight' => $mc->max_weight ? (float) $mc->max_weight : null,
            'weight_range' => ($mc->min_weight && $mc->max_weight) ? "{$mc->min_weight} - {$mc->max_weight} kg" : ($mc->min_weight ? "≥ {$mc->min_weight} kg" : ($mc->max_weight ? "≤ {$mc->max_weight} kg" : '-')),
            'min_kyu' => $mc->min_kyu,
            'max_kyu' => $mc->max_kyu,
            'order' => $mc->order,
            'is_active' => (bool) $mc->is_active,
        ]);

        // Formatted rundowns
        $rundowns = $event->rundowns->map(fn (Rundown $r) => [
            'id' => $r->id,
            'event_id' => $r->event_id,
            'date' => $r->date?->format('Y-m-d H:i'),
            'date_formatted' => $r->date?->translatedFormat('d M Y, H:i').' WIB',
            'date_only' => $r->date?->format('Y-m-d'),
            'time_only' => $r->date?->format('H:i'),
            'end_time' => $r->end_time?->format('Y-m-d H:i'),
            'end_time_only' => $r->end_time?->format('H:i'),
            'name' => $r->name,
            'type' => $r->type,
            'is_match_session' => (bool) $r->is_match_session,
            'description' => $r->description,
            'order' => (int) $r->order,
        ]);

        return Inertia::render('Admin/Master/Event/Detail', [
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'tenant_subdomain' => $event->tenant_subdomain,
                'tenant_url' => $this->tenantUrl($request, $event),
                'public_url' => $this->tenantUrl($request, $event),
                'admin_tenant_url' => $this->adminTenantUrl($request, $event),
                'edition' => $event->edition,
                'description' => $event->description,
                'venue' => $event->venue,
                'city' => $event->city,
                'province' => $event->province,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'end_date' => $event->end_date?->format('Y-m-d'),
                'start_date_formatted' => $event->start_date?->translatedFormat('d F Y'),
                'end_date_formatted' => $event->end_date?->translatedFormat('d F Y'),
                'registration_start' => $event->registration_start?->format('Y-m-d'),
                'registration_end' => $event->registration_end?->format('Y-m-d'),
                'registration_start_formatted' => $event->registration_start?->translatedFormat('d F Y'),
                'registration_end_formatted' => $event->registration_end?->translatedFormat('d F Y'),
                'is_paid' => (bool) $event->is_paid,
                'fee_per_athlete' => (float) $event->fee_per_athlete,
                'fee_per_athlete_formatted' => 'Rp '.number_format($event->fee_per_athlete, 0, ',', '.'),
                'fee_per_contingent' => (float) $event->fee_per_contingent,
                'fee_per_contingent_formatted' => 'Rp '.number_format($event->fee_per_contingent, 0, ',', '.'),
                'payment_method_ids' => $selectedPaymentMethodIds,
                'max_match_categories_per_athlete' => (int) $event->max_match_categories_per_athlete,
                'allow_cross_age_group_embu' => (bool) $event->allow_cross_age_group_embu,
                'match_duration_minutes' => (int) $event->match_duration_minutes,
                'minimum_rest_minutes' => (int) $event->minimum_rest_minutes,
                'minimum_entries_per_category' => (int) $event->minimum_entries_per_category,
                'minimum_contingents_per_category' => (int) $event->minimum_contingents_per_category,
                'status' => $event->status instanceof \BackedEnum ? $event->status->value : (string) $event->status,
                'is_active' => (bool) $event->is_active,
                'organizer' => $event->organizer,
                'contact_person' => $event->contact_person,
                'contact_phone' => $event->contact_phone,
                'rules_doc' => $event->rules_doc,
                'cover_image_url' => $event->coverImageUrl(),
                'created_at' => $event->created_at?->translatedFormat('d M Y H:i'),
                'updated_at_formatted' => $event->updated_at?->translatedFormat('d M Y H:i'),
            ],
            'ageCategories' => $ageCategories,
            'courts' => $courts,
            'matchCategories' => $matchCategories,
            'rundowns' => $rundowns,
            'allEvents' => $allEvents,
            'kyus' => $kyus,
            'weightClasses' => $weightClasses,
            'paymentMethods' => $paymentMethods,
            'referees' => $referees,
            'eventReferees' => $eventReferees,
            'clerks' => $clerks,
            'eventClerks' => $eventClerks,
            'fieldCoordinators' => $fieldCoordinators,
            'eventFieldCoordinators' => $eventFieldCoordinators,
            'users' => $users->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'roles' => $user->roles->pluck('name')->values()]),
            'eventUsers' => $eventUsers,
            'tenantBaseDomain' => config('app.tenant_base_domain'),
            'tournamentSummary' => [
                'status' => match (true) {
                    $event->tournamentDrawings()->where('status', 'in_progress')->exists() => 'in_progress',
                    $event->tournamentDrawings()->where('status', 'completed')->exists() => 'completed',
                    $event->tournamentDrawings()->where('status', 'published')->exists() => 'published',
                    $event->tournamentDrawings()->where('status', 'generated')->exists() => 'generated',
                    default => 'draft',
                },
                'generated_categories' => $event->tournamentDrawings()->whereIn('status', ['generated', 'published', 'in_progress', 'completed'])->count(),
                'skipped_categories' => $event->tournamentDrawings()->where('status', 'skipped')->count(),
                'total_matches' => $event->tournamentMatches()->count(),
                'match_sessions' => $event->rundowns()->where('is_match_session', true)->count(),
            ],
            'counts' => [
                'age_categories' => $ageCategories->count(),
                'courts' => $courts->count(),
                'match_categories' => $matchCategories->count(),
                'rundowns' => $rundowns->count(),
                'referees' => $eventReferees->count(),
                'clerks' => $eventClerks->count(),
                'field_coordinators' => $eventFieldCoordinators->count(),
            ],
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

    private function tenantUrl(Request $request, Event $event): string
    {
        return url('/event/'.$event->slug);
    }

    private function adminTenantUrl(Request $request, Event $event): string
    {
        return url('/event/'.$event->slug.'/admin');
    }

    public function updateTournamentSettings(UpdateEventTournamentSettingsRequest $request, Event $event): RedirectResponse
    {
        $event->update($request->validated());

        return back()->with('success', 'Pengaturan Drawing dan pertandingan berhasil disimpan.');
    }

    /**
     * Update general event details.
     */
    public function updateGeneral(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('events', 'slug')->ignore($event),
            ],
            'edition' => ['nullable', 'string', 'max:100'],
            'organizer' => ['nullable', 'string', 'max:255'],
            'venue' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
            'tenant_subdomain' => [
                'nullable',
                'string',
                'max:63',
                'regex:/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/',
                Rule::unique('events', 'tenant_subdomain')->ignore($event),
            ],
            'max_match_categories_per_athlete' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'allow_cross_age_group_embu' => ['sometimes', 'boolean'],
            'status' => ['required', Rule::enum(EventStatus::class)],
            'is_active' => ['boolean'],
        ]);

        if (! empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);
        }
        if (empty($validated['tenant_subdomain']) && ! empty($validated['slug'])) {
            $validated['tenant_subdomain'] = Str::limit($validated['slug'], 63, '');
        }

        $event->fill($validated);

        if (! empty($validated['is_active'])) {
            $event->makeActive();
        } else {
            $event->save();
        }

        return back()->with('success', 'Informasi umum event berhasil diperbarui.');
    }

    public function updateCover(UpdateEventCoverRequest $request, Event $event): RedirectResponse
    {
        $oldPath = $event->cover_image_path;
        $newPath = $request->file('cover_image')->store('event-covers', 'public');

        $event->update(['cover_image_path' => $newPath]);

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return back()->with('success', 'Gambar utama event berhasil diperbarui.');
    }

    public function destroyCover(Event $event): RedirectResponse
    {
        if ($event->cover_image_path) {
            Storage::disk('public')->delete($event->cover_image_path);
        }

        $event->update(['cover_image_path' => null]);

        return back()->with('success', 'Gambar event dihapus. Placeholder No Image akan digunakan.');
    }

    public function updateEventUsers(
        Request $request,
        Event $event,
        SyncEventUsersAction $syncEventUsers,
    ): RedirectResponse {
        $validated = $request->validate([
            'users' => ['nullable', 'array'],
            'users.*.id' => ['required', 'uuid', 'distinct', 'exists:users,id'],
            'users.*.access_role' => ['required', Rule::in([
                Event::AccessRoleResponsible,
                Event::AccessRoleAdmin,
                Event::AccessRoleStaff,
                Event::AccessRoleViewer,
            ])],
        ]);

        $syncEventUsers->execute($event, $validated['users'] ?? []);

        return back()->with('success', 'Penanggung jawab dan akses pengguna event berhasil diperbarui.');
    }

    /**
     * Update event dates and registration window.
     */
    public function updateDates(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'registration_start' => ['nullable', 'date'],
            'registration_end' => ['nullable', 'date', 'after_or_equal:registration_start'],
        ]);

        $event->update($validated);

        return back()->with('success', 'Tanggal acara dan jadwal pendaftaran berhasil diperbarui.');
    }

    /**
     * Update event fees.
     */
    public function updateFees(
        UpdateEventFeesRequest $request,
        Event $event,
        SyncEventRegistrationFeesAction $syncRegistrationFees,
    ): RedirectResponse {
        $validated = $request->validated();
        $wasPaid = (bool) $event->is_paid;
        $isPaid = (bool) $validated['is_paid'];

        DB::transaction(function () use ($event, $validated, $isPaid, $wasPaid, $syncRegistrationFees): void {
            $event->update([
                'is_paid' => $isPaid,
                'fee_per_contingent' => $isPaid ? ($validated['fee_per_contingent'] ?? 0) : 0,
                'fee_per_athlete' => $isPaid ? ($validated['fee_per_athlete'] ?? 0) : 0,
            ]);
            $event->paymentMethods()->sync($isPaid ? ($validated['payment_method_ids'] ?? []) : []);

            if ($event->wasChanged(['is_paid', 'fee_per_athlete', 'fee_per_contingent'])) {
                $syncRegistrationFees->execute($event, $wasPaid);
            }
        });

        return back()->with('success', $isPaid
            ? 'Pengaturan biaya dan metode pembayaran event berhasil disimpan.'
            : 'Event berhasil diatur gratis tanpa pembayaran.');
    }

    // ─────────────────────────────────────────────────────────────
    // KELOMPOK UMUR (AGE CATEGORIES)
    // ─────────────────────────────────────────────────────────────

    public function storeAgeCategory(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'min_age' => ['nullable', 'integer', 'min:1', 'max:100'],
            'max_age' => ['nullable', 'integer', 'min:1', 'max:100'],
            'fee' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        if (isset($validated['min_age'], $validated['max_age']) && $validated['min_age'] > $validated['max_age']) {
            return back()->withErrors(['max_age' => 'Batas usia maksimal harus lebih besar atau sama dengan usia minimal.']);
        }

        $event->ageCategories()->create([
            ...$validated,
            'order' => $validated['order'] ?? ($event->ageCategories()->max('order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', "Kelompok umur '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateAgeCategory(Request $request, Event $event, EventAgeCategory $ageCategory): RedirectResponse
    {
        abort_unless($ageCategory->event_id === $event->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'min_age' => ['nullable', 'integer', 'min:1', 'max:100'],
            'max_age' => ['nullable', 'integer', 'min:1', 'max:100'],
            'fee' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        if (isset($validated['min_age'], $validated['max_age']) && $validated['min_age'] > $validated['max_age']) {
            return back()->withErrors(['max_age' => 'Batas usia maksimal harus lebih besar atau sama dengan usia minimal.']);
        }

        $ageCategory->update($validated);

        return back()->with('success', "Kelompok umur '{$ageCategory->name}' berhasil diperbarui.");
    }

    public function destroyAgeCategory(Event $event, EventAgeCategory $ageCategory): RedirectResponse
    {
        abort_unless($ageCategory->event_id === $event->id, 404);

        $name = $ageCategory->name;
        $ageCategory->delete();

        return back()->with('success', "Kelompok umur '{$name}' berhasil dihapus.");
    }

    // ─────────────────────────────────────────────────────────────
    // LAPANGAN (COURTS / TATAMI)
    // ─────────────────────────────────────────────────────────────

    public function storeCourt(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $event->courts()->create([
            ...$validated,
            'order' => $validated['order'] ?? ($event->courts()->max('order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', "Lapangan '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateCourt(Request $request, Event $event, EventCourt $court): RedirectResponse
    {
        abort_unless($court->event_id === $event->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $court->update($validated);

        return back()->with('success', "Lapangan '{$court->name}' berhasil diperbarui.");
    }

    public function destroyCourt(Event $event, EventCourt $court): RedirectResponse
    {
        abort_unless($court->event_id === $event->id, 404);

        $name = $court->name;
        $court->delete();

        return back()->with('success', "Lapangan '{$name}' berhasil dihapus.");
    }

    // ─────────────────────────────────────────────────────────────
    // NOMER PERTANDINGAN (MATCH CATEGORIES)
    // ─────────────────────────────────────────────────────────────

    public function storeMatchCategory(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'age_category_id' => ['nullable', 'uuid', Rule::exists('event_age_categories', 'id')->where('event_id', $event->id)],
            'weight_class_id' => ['nullable', 'uuid', 'exists:weight_classes,id'],
            'type' => ['required', 'in:embu,randori'],
            'gender' => ['required', 'in:male,female,mixed'],
            'capacity' => ['required', 'integer', 'min:1', 'max:256'],
            'max_athletes_per_team' => ['nullable', 'integer', 'min:1', 'max:20'],
            'min_weight' => ['nullable', 'numeric', 'min:0'],
            'max_weight' => ['nullable', 'numeric', 'min:0'],
            'min_kyu' => ['nullable', 'string', 'max:50'],
            'max_kyu' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $event->matchCategories()->create([
            ...$validated,
            'order' => $validated['order'] ?? ($event->matchCategories()->max('order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', "Nomer pertandingan '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateMatchCategory(Request $request, Event $event, EventMatchCategory $matchCategory): RedirectResponse
    {
        abort_unless($matchCategory->event_id === $event->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'age_category_id' => ['nullable', 'uuid', Rule::exists('event_age_categories', 'id')->where('event_id', $event->id)],
            'weight_class_id' => ['nullable', 'uuid', 'exists:weight_classes,id'],
            'type' => ['required', 'in:embu,randori'],
            'gender' => ['required', 'in:male,female,mixed'],
            'capacity' => ['required', 'integer', 'min:1', 'max:256'],
            'max_athletes_per_team' => ['nullable', 'integer', 'min:1', 'max:20'],
            'min_weight' => ['nullable', 'numeric', 'min:0'],
            'max_weight' => ['nullable', 'numeric', 'min:0'],
            'min_kyu' => ['nullable', 'string', 'max:50'],
            'max_kyu' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $matchCategory->update($validated);

        return back()->with('success', "Nomer pertandingan '{$matchCategory->name}' berhasil diperbarui.");
    }

    public function destroyMatchCategory(Event $event, EventMatchCategory $matchCategory): RedirectResponse
    {
        abort_unless($matchCategory->event_id === $event->id, 404);

        $name = $matchCategory->name;
        $matchCategory->delete();

        return back()->with('success', "Nomer pertandingan '{$name}' berhasil dihapus.");
    }

    // ─────────────────────────────────────────────────────────────
    // WASIT EVENT
    // ─────────────────────────────────────────────────────────────

    public function storeEventReferee(Request $request, Event $event): RedirectResponse
    {
        $roleRules = ['required', 'in:chief,referee,judge,reserve'];

        if ($request->boolean('create_new')) {
            $validated = $request->validate([
                'create_new' => ['boolean'],
                'name' => ['required', 'string', 'max:150'],
                'dan_grade' => ['nullable', 'string', 'max:50'],
                'license_number' => ['nullable', 'string', 'max:100', 'unique:referees,license_number'],
                'region' => ['nullable', 'string', 'max:100'],
                'phone' => ['nullable', 'string', 'max:50'],
                'role' => $roleRules,
            ]);

            $referee = Referee::create([
                'name' => $validated['name'],
                'gender' => 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'is_active' => true,
            ]);
        } else {
            $validated = $request->validate([
                'referee_id' => ['required', 'uuid', 'exists:referees,id'],
                'role' => $roleRules,
            ]);

            $referee = Referee::findOrFail($validated['referee_id']);
        }

        $event->referees()->syncWithoutDetaching([$referee->id => ['role' => $validated['role']]]);

        return back()->with('success', "Wasit '{$referee->name}' berhasil ditugaskan ke event.");
    }

    public function destroyEventReferee(Event $event, Referee $referee): RedirectResponse
    {
        $event->referees()->detach($referee->id);

        return back()->with('success', "Wasit '{$referee->name}' telah dihapus dari event.");
    }

    // ─────────────────────────────────────────────────────────────
    // PANITERA EVENT
    // ─────────────────────────────────────────────────────────────

    public function storeEventClerk(Request $request, Event $event): RedirectResponse
    {
        $roleRules = ['required', 'in:chief_secretary,scorer,timekeeper,announcer,operator'];

        if ($request->boolean('create_new')) {
            $validated = $request->validate([
                'create_new' => ['boolean'],
                'name' => ['required', 'string', 'max:150'],
                'employee_number' => ['nullable', 'string', 'max:100', 'unique:clerks,employee_number'],
                'certification' => ['nullable', 'string', 'max:100'],
                'region' => ['nullable', 'string', 'max:100'],
                'phone' => ['nullable', 'string', 'max:50'],
                'role' => $roleRules,
            ]);

            $clerk = Clerk::create([
                'name' => $validated['name'],
                'employee_number' => $validated['employee_number'] ?? null,
                'certification' => $validated['certification'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'is_active' => true,
            ]);
        } else {
            $validated = $request->validate([
                'clerk_id' => ['required', 'uuid', 'exists:clerks,id'],
                'role' => $roleRules,
            ]);

            $clerk = Clerk::findOrFail($validated['clerk_id']);
        }

        $event->clerks()->syncWithoutDetaching([$clerk->id => ['role' => $validated['role']]]);

        return back()->with('success', "Panitera '{$clerk->name}' berhasil ditugaskan ke event.");
    }

    public function destroyEventClerk(Event $event, Clerk $clerk): RedirectResponse
    {
        $event->clerks()->detach($clerk->id);

        return back()->with('success', "Panitera '{$clerk->name}' telah dihapus dari event.");
    }

    public function storeEventFieldCoordinator(Request $request, Event $event): RedirectResponse
    {
        $areaRules = ['required', 'in:chief,court,logistics,liaison'];
        if ($request->boolean('create_new')) {
            $validated = $request->validate(['create_new' => ['boolean'], 'name' => ['required', 'string', 'max:150'], 'coordinator_number' => ['nullable', 'string', 'max:100', 'unique:field_coordinators,coordinator_number'], 'region' => ['nullable', 'string', 'max:100'], 'phone' => ['nullable', 'string', 'max:50'], 'assignment_area' => $areaRules]);
            $fieldCoordinator = FieldCoordinator::create(['name' => $validated['name'], 'coordinator_number' => $validated['coordinator_number'] ?? null, 'region' => $validated['region'] ?? null, 'phone' => $validated['phone'] ?? null, 'is_active' => true]);
        } else {
            $validated = $request->validate(['field_coordinator_id' => ['required', 'uuid', 'exists:field_coordinators,id'], 'assignment_area' => $areaRules]);
            $fieldCoordinator = FieldCoordinator::findOrFail($validated['field_coordinator_id']);
        }

        $event->fieldCoordinators()->syncWithoutDetaching([$fieldCoordinator->id => ['assignment_area' => $validated['assignment_area']]]);

        return back()->with('success', "Koordinator '{$fieldCoordinator->name}' berhasil ditugaskan ke event.");
    }

    public function destroyEventFieldCoordinator(Event $event, FieldCoordinator $fieldCoordinator): RedirectResponse
    {
        $event->fieldCoordinators()->detach($fieldCoordinator->id);

        return back()->with('success', "Koordinator '{$fieldCoordinator->name}' telah dihapus dari event.");
    }

    // ─────────────────────────────────────────────────────────────
    // SESI ACARA & RUNDOWN
    // ─────────────────────────────────────────────────────────────

    public function storeRundown(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'time' => ['nullable', 'string'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:time'],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', 'string', 'max:100'],
            'is_match_session' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
        ]);

        // Combine date and time
        $datetimeStr = $validated['date'];
        if (! empty($validated['time'])) {
            $datetimeStr .= ' '.$validated['time'].':00';
        } else {
            $datetimeStr .= ' 08:00:00';
        }

        $event->rundowns()->create([
            'date' => $datetimeStr,
            'end_time' => ! empty($validated['end_time']) ? $validated['date'].' '.$validated['end_time'].':00' : null,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'is_match_session' => (bool) ($validated['is_match_session'] ?? false),
            'description' => $validated['description'] ?? null,
            'order' => $validated['order'] ?? ($event->rundowns()->max('order') + 1),
        ]);

        return back()->with('success', "Sesi acara '{$validated['name']}' berhasil ditambahkan ke rundown.");
    }

    public function updateRundown(Request $request, Event $event, Rundown $rundown): RedirectResponse
    {
        abort_unless($rundown->event_id === $event->id, 404);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'time' => ['nullable', 'string'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:time'],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', 'string', 'max:100'],
            'is_match_session' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:500'],
            'order' => ['nullable', 'integer'],
        ]);

        $datetimeStr = $validated['date'];
        if (! empty($validated['time'])) {
            $datetimeStr .= ' '.$validated['time'].':00';
        } else {
            $datetimeStr .= ' 08:00:00';
        }

        $rundown->update([
            'date' => $datetimeStr,
            'end_time' => ! empty($validated['end_time']) ? $validated['date'].' '.$validated['end_time'].':00' : null,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'is_match_session' => (bool) ($validated['is_match_session'] ?? false),
            'description' => $validated['description'] ?? null,
            'order' => $validated['order'] ?? $rundown->order,
        ]);

        return back()->with('success', "Sesi acara '{$rundown->name}' berhasil diperbarui.");
    }

    public function destroyRundown(Event $event, Rundown $rundown): RedirectResponse
    {
        abort_unless($rundown->event_id === $event->id, 404);

        $name = $rundown->name;
        $rundown->delete();

        return back()->with('success', "Sesi rundown '{$name}' berhasil dihapus.");
    }
}
