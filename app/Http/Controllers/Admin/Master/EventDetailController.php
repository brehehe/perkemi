<?php

namespace App\Http\Controllers\Admin\Master;

use App\Actions\Admin\Event\SyncEventRegistrationFeesAction;
use App\Actions\Admin\Event\SyncEventUsersAction;
use App\Actions\Admin\Master\SyncLoginAccountAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Event\SaveEventAgeCategoryRequest;
use App\Http\Requests\Admin\Event\SaveEventCourtRequest;
use App\Http\Requests\Admin\Event\SaveEventMatchCategoryRequest;
use App\Http\Requests\Admin\Event\SaveEventRundownRequest;
use App\Http\Requests\Admin\Event\UpdateEventCoverRequest;
use App\Http\Requests\Admin\Event\UpdateEventDatesRequest;
use App\Http\Requests\Admin\Event\UpdateEventFeesRequest;
use App\Http\Requests\Admin\Event\UpdateEventGeneralRequest;
use App\Http\Requests\Admin\Event\UpdateEventUsersRequest;
use App\Http\Requests\Admin\Event\UpdateParticipantRulesRequest;
use App\Http\Requests\Admin\Master\UpdateEventTournamentSettingsRequest;
use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\Rundown;
use App\Models\User;
use App\Services\Admin\Master\EventDetailViewService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class EventDetailController extends Controller
{
    public function updateParticipantRules(UpdateParticipantRulesRequest $request, Event $event): RedirectResponse
    {
        $event->update(['participant_rules' => $request->rulesData()]);

        return back()->with('success', 'Persyaratan peserta tersimpan. Perubahan aturan memerlukan pemeriksaan ulang data sekolah dan registrasi.');
    }

    /**
     * Display the detail & settings page for a specific or active event.
     */
    public function show(
        Request $request,
        EventDetailViewService $viewService,
        ?Event $event = null,
    ): Response|RedirectResponse {
        $event = $viewService->resolveEvent($request, $event);

        if (! $event) {
            return redirect()->route('admin.master.event.index')
                ->with('error', 'Belum ada data event. Silakan buat event terlebih dahulu.');
        }

        return Inertia::render('Admin/Master/Event/Detail', $viewService->build($request, $event));
    }

    public function updateTournamentSettings(UpdateEventTournamentSettingsRequest $request, Event $event): RedirectResponse
    {
        $event->update($request->validated());

        return back()->with('success', 'Pengaturan Drawing dan pertandingan berhasil disimpan.');
    }

    /**
     * Update general event details.
     */
    public function updateGeneral(UpdateEventGeneralRequest $request, Event $event): RedirectResponse
    {
        $validated = $request->validated();

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
        UpdateEventUsersRequest $request,
        Event $event,
        SyncEventUsersAction $syncEventUsers,
    ): RedirectResponse {
        $validated = $request->validated();

        $syncEventUsers->execute($event, $validated['users'] ?? []);

        return back()->with('success', 'Penanggung jawab dan akses pengguna event berhasil diperbarui.');
    }

    /**
     * Update event dates and registration window.
     */
    public function updateDates(UpdateEventDatesRequest $request, Event $event): RedirectResponse
    {
        $validated = $request->validated();

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

    public function storeAgeCategory(SaveEventAgeCategoryRequest $request, Event $event): RedirectResponse
    {
        $validated = $request->validated();

        $event->ageCategories()->create([
            ...$validated,
            'order' => $validated['order'] ?? ($event->ageCategories()->max('order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', "Kelompok umur '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateAgeCategory(SaveEventAgeCategoryRequest $request, Event $event, EventAgeCategory $ageCategory): RedirectResponse
    {
        abort_unless($ageCategory->event_id === $event->id, 404);

        $validated = $request->validated();

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

    public function storeCourt(SaveEventCourtRequest $request, Event $event): RedirectResponse
    {
        $validated = $request->validated();

        $event->courts()->create([
            ...$validated,
            'order' => $validated['order'] ?? ($event->courts()->max('order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', "Lapangan '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateCourt(SaveEventCourtRequest $request, Event $event, EventCourt $court): RedirectResponse
    {
        abort_unless($court->event_id === $event->id, 404);

        $validated = $request->validated();

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

    public function storeMatchCategory(SaveEventMatchCategoryRequest $request, Event $event): RedirectResponse
    {
        $validated = $request->validated();

        $event->matchCategories()->create([
            ...$validated,
            'order' => $validated['order'] ?? ($event->matchCategories()->max('order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', "Nomer pertandingan '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateMatchCategory(SaveEventMatchCategoryRequest $request, Event $event, EventMatchCategory $matchCategory): RedirectResponse
    {
        abort_unless($matchCategory->event_id === $event->id, 404);

        $validated = $request->validated();

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

    public function storeEventReferee(Request $request, Event $event, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
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
                'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
                'password' => ['nullable', 'confirmed', Password::defaults()],
                'role' => $roleRules,
            ]);

            $referee = Referee::create([
                'name' => $validated['name'],
                'gender' => 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'is_active' => true,
            ]);

            $user = $syncLoginAccount->execute(
                $referee->name,
                $referee->email,
                $validated['password'] ?? null,
                'Wasit',
                phone: $referee->phone,
            );

            if ($user) {
                $referee->update(['user_id' => $user->id]);
            }
        } else {
            $validated = $request->validate([
                'referee_id' => ['required', 'uuid', 'exists:referees,id'],
                'role' => $roleRules,
            ]);

            $referee = Referee::findOrFail($validated['referee_id']);
        }

        $event->referees()->syncWithoutDetaching([$referee->id => ['role' => $validated['role']]]);

        if ($referee->user) {
            $event->users()->syncWithoutDetaching([
                $referee->user->id => ['access_role' => Event::AccessRoleStaff],
            ]);
        }

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

    public function storeEventClerk(Request $request, Event $event, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
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
                'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
                'password' => ['nullable', 'confirmed', Password::defaults()],
                'role' => $roleRules,
            ]);

            $clerk = Clerk::create([
                'name' => $validated['name'],
                'employee_number' => $validated['employee_number'] ?? null,
                'certification' => $validated['certification'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'is_active' => true,
            ]);

            $syncLoginAccount->execute(
                $clerk->name,
                $clerk->email,
                $validated['password'] ?? null,
                'Panitera',
                phone: $clerk->phone,
            );
        } else {
            $validated = $request->validate([
                'clerk_id' => ['required', 'uuid', 'exists:clerks,id'],
                'role' => $roleRules,
            ]);

            $clerk = Clerk::findOrFail($validated['clerk_id']);
        }

        $event->clerks()->syncWithoutDetaching([$clerk->id => ['role' => $validated['role']]]);

        $clerkUser = $clerk->email
            ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($clerk->email)])->first()
            : null;

        if ($clerkUser) {
            $event->users()->syncWithoutDetaching([
                $clerkUser->id => ['access_role' => Event::AccessRoleStaff],
            ]);
        }

        return back()->with('success', "Panitera '{$clerk->name}' berhasil ditugaskan ke event.");
    }

    public function destroyEventClerk(Event $event, Clerk $clerk): RedirectResponse
    {
        $event->clerks()->detach($clerk->id);

        return back()->with('success', "Panitera '{$clerk->name}' telah dihapus dari event.");
    }

    public function storeEventFieldCoordinator(Request $request, Event $event, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $areaRules = ['required', 'in:chief,court,logistics,liaison'];
        if ($request->boolean('create_new')) {
            $validated = $request->validate([
                'create_new' => ['boolean'],
                'name' => ['required', 'string', 'max:150'],
                'coordinator_number' => ['nullable', 'string', 'max:100', 'unique:field_coordinators,coordinator_number'],
                'region' => ['nullable', 'string', 'max:100'],
                'phone' => ['nullable', 'string', 'max:50'],
                'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
                'password' => ['nullable', 'confirmed', Password::defaults()],
                'assignment_area' => $areaRules,
            ]);
            $fieldCoordinator = FieldCoordinator::create([
                'name' => $validated['name'],
                'coordinator_number' => $validated['coordinator_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'is_active' => true,
            ]);
            $syncLoginAccount->execute(
                $fieldCoordinator->name,
                $fieldCoordinator->email,
                $validated['password'] ?? null,
                'Koordinator Lapangan',
                phone: $fieldCoordinator->phone,
            );
        } else {
            $validated = $request->validate(['field_coordinator_id' => ['required', 'uuid', 'exists:field_coordinators,id'], 'assignment_area' => $areaRules]);
            $fieldCoordinator = FieldCoordinator::findOrFail($validated['field_coordinator_id']);
        }

        $event->fieldCoordinators()->syncWithoutDetaching([$fieldCoordinator->id => ['assignment_area' => $validated['assignment_area']]]);

        $coordinatorUser = $fieldCoordinator->email
            ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($fieldCoordinator->email)])->first()
            : null;

        if ($coordinatorUser) {
            $event->users()->syncWithoutDetaching([
                $coordinatorUser->id => ['access_role' => Event::AccessRoleStaff],
            ]);
        }

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

    public function storeRundown(SaveEventRundownRequest $request, Event $event): RedirectResponse
    {
        $validated = $request->validated();

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

    public function updateRundown(SaveEventRundownRequest $request, Event $event, Rundown $rundown): RedirectResponse
    {
        abort_unless($rundown->event_id === $event->id, 404);

        $validated = $request->validated();

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
