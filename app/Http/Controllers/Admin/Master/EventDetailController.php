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
use App\Models\Arbitrator;
use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\EventMatchCategory;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentResult;
use App\Models\User;
use App\Services\Admin\Master\EventDetailViewService;
use App\Services\Arbitration\ArbitrationExportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
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

    /**
     * Export multi-sheet Excel report for unified arbitration (Jadwal, History Absensi, History Penilaian, Hasil Juara).
     */
    public function exportArbitration(
        Request $request,
        EventDetailViewService $viewService,
        ArbitrationExportService $exportService,
        ?Event $event = null,
    ): HttpResponse {
        $event = $viewService->resolveEvent($request, $event);

        if (! $event) {
            abort(404, 'Event tidak ditemukan.');
        }

        $binary = $exportService->export($event);
        $filename = $exportService->filename($event);

        return response($binary, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Content-Length' => strlen($binary),
            'Cache-Control' => 'max-age=0, must-revalidate',
            'Pragma' => 'public',
        ]);
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
            ...Arr::except($validated, ['regenerate_token']),
            'access_code' => EventCourt::generateUniqueAccessCode(),
            'order' => $validated['order'] ?? ($event->courts()->max('order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return back()->with('success', "Lapangan '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateCourt(SaveEventCourtRequest $request, Event $event, EventCourt $court): RedirectResponse
    {
        abort_unless($court->event_id === $event->id, 404);

        $validated = $request->validated();

        if (! empty($validated['regenerate_token']) || empty($court->access_code)) {
            $court->access_code = EventCourt::generateUniqueAccessCode();
        }

        $court->update(Arr::except($validated, ['regenerate_token']));

        return back()->with('success', "Lapangan '{$court->name}' berhasil diperbarui.");
    }

    public function regenerateCourtToken(Event $event, EventCourt $court): RedirectResponse
    {
        abort_unless($court->event_id === $event->id, 404);

        $court->access_code = EventCourt::generateUniqueAccessCode();
        $court->save();

        return back()->with('success', "Token Panitera untuk '{$court->name}' berhasil diperbarui: {$court->access_code}");
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
            'is_exhibition' => $validated['is_exhibition'] ?? false,
        ]);

        return back()->with('success', "Nomer pertandingan '{$validated['name']}' berhasil ditambahkan.");
    }

    public function updateMatchCategory(SaveEventMatchCategoryRequest $request, Event $event, EventMatchCategory $matchCategory): RedirectResponse
    {
        abort_unless($matchCategory->event_id === $event->id, 404);

        $validated = $request->validated();

        $matchCategory->update($validated);

        // Pastikan hasil juara yang sudah tercatat tetap sinkron jika kategori diubah
        TournamentResult::where('event_match_category_id', $matchCategory->id)->update([
            'is_exhibition' => (bool) $matchCategory->is_exhibition,
            'match_category' => $matchCategory->name,
        ]);

        return back()->with('success', "Nomer pertandingan '{$matchCategory->name}' berhasil diperbarui.");
    }

    public function toggleMatchCategoryExhibition(Event $event, EventMatchCategory $matchCategory): RedirectResponse
    {
        abort_unless($matchCategory->event_id === $event->id, 404);

        $matchCategory->update([
            'is_exhibition' => ! $matchCategory->is_exhibition,
        ]);

        // Sinkronisasi status ekshibisi pada hasil juara terkait
        TournamentResult::where('event_match_category_id', $matchCategory->id)->update([
            'is_exhibition' => (bool) $matchCategory->is_exhibition,
        ]);

        $status = $matchCategory->is_exhibition ? 'Ekshibisi' : 'Dipertandingkan (Resmi)';

        return back()->with('success', "Status nomer pertandingan '{$matchCategory->name}' diubah menjadi {$status}.");
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
        $roleRules = ['required', 'string', 'max:50'];

        if ($request->boolean('create_new')) {
            $validated = $request->validate([
                'create_new' => ['boolean'],
                'name' => ['required', 'string', 'max:150'],
                'gender' => ['nullable', 'in:male,female'],
                'dan_grade' => ['nullable', 'string', 'max:50'],
                'certification_level' => ['nullable', 'string', 'max:100'],
                'license_number' => ['nullable', 'string', 'max:100', Rule::unique('referees', 'license_number')->withoutTrashed()],
                'region' => ['nullable', 'string', 'max:100'],
                'phone' => ['nullable', 'string', 'max:50'],
                'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
                'password' => ['nullable', 'confirmed', Password::defaults()],
                'role' => $roleRules,
            ]);

            $referee = Referee::create([
                'name' => $validated['name'],
                'gender' => $validated['gender'] ?? 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'certification_level' => $validated['certification_level'] ?? null,
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

    public function updateEventReferee(
        Request $request,
        Event $event,
        Referee $referee,
        SyncLoginAccountAction $syncLoginAccount,
    ): RedirectResponse {
        $roleRules = ['required', 'string', 'max:50'];

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['nullable', 'in:male,female'],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'license_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('referees', 'license_number')->ignore($referee->id)->withoutTrashed(),
            ],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => $roleRules,
        ]);

        $password = $validated['password'] ?? null;

        DB::transaction(function () use ($event, $referee, $validated, $password, $syncLoginAccount): void {
            $referee->update([
                'name' => $validated['name'],
                'gender' => $validated['gender'] ?? $referee->gender ?? 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'certification_level' => $validated['certification_level'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
            ]);

            $user = $syncLoginAccount->execute(
                $referee->name,
                $referee->email,
                $password,
                'Wasit',
                $referee->user,
                phone: $referee->phone,
            );

            if ($user && Referee::query()->where('user_id', $user->id)->whereKeyNot($referee->id)->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'Email login tersebut sudah terhubung ke wasit lain.',
                ]);
            }

            if ($user && $referee->user_id !== $user->id) {
                $referee->update(['user_id' => $user->id]);
            }

            $event->referees()->updateExistingPivot($referee->id, [
                'role' => $validated['role'],
            ]);

            if ($referee->user) {
                $event->users()->syncWithoutDetaching([
                    $referee->user->id => ['access_role' => Event::AccessRoleStaff],
                ]);
            }
        });

        return back()->with('success', "Data wasit '{$referee->name}' berhasil diperbarui.");
    }

    public function destroyEventReferee(Event $event, Referee $referee): RedirectResponse
    {
        $event->referees()->detach($referee->id);
        EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts()->select('id'))
            ->where('staff_type', 'referee')
            ->where('staff_id', $referee->id)
            ->delete();

        return back()->with('success', "Wasit '{$referee->name}' telah dihapus dari event.");
    }

    public function transferRefereeToCoordinator(
        Request $request,
        Event $event,
        Referee $referee,
    ): RedirectResponse {
        $validated = $request->validate([
            'assignment_area' => ['required', 'in:chief,court,logistics,liaison'],
            'detach_source' => ['nullable', 'boolean'],
        ]);

        $detachSource = $request->boolean('detach_source', true);
        $area = $validated['assignment_area'];

        DB::transaction(function () use ($event, $referee, $area, $detachSource): void {
            $coordinator = null;
            if (filled($referee->email)) {
                $coordinator = FieldCoordinator::query()
                    ->whereRaw('LOWER(email) = ?', [mb_strtolower($referee->email)])
                    ->first();
            }
            if (! $coordinator && filled($referee->phone)) {
                $coordinator = FieldCoordinator::query()
                    ->where('phone', $referee->phone)
                    ->first();
            }
            if (! $coordinator) {
                $coordinator = FieldCoordinator::query()
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($referee->name)])
                    ->first();
            }

            if (! $coordinator) {
                $coordinator = FieldCoordinator::create([
                    'name' => $referee->name,
                    'coordinator_number' => $referee->license_number ?? null,
                    'region' => $referee->region ?? null,
                    'phone' => $referee->phone ?? null,
                    'email' => $referee->email ?? null,
                    'notes' => $referee->dan_grade ? "Dialihkan dari Wasit ({$referee->dan_grade})" : null,
                    'is_active' => true,
                ]);
            }

            $event->fieldCoordinators()->syncWithoutDetaching([
                $coordinator->id => ['assignment_area' => $area],
            ]);

            $user = $referee->user;
            if (! $user && filled($referee->email)) {
                $user = User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($referee->email)])->first();
            }
            if ($user) {
                $user->assignRole(Role::findOrCreate('Koordinator Lapangan', 'web'));
                $event->users()->syncWithoutDetaching([
                    $user->id => ['access_role' => Event::AccessRoleStaff],
                ]);
            }

            if ($detachSource) {
                $event->referees()->detach($referee->id);
                EventCourtAssignment::query()
                    ->whereIn('event_court_id', $event->courts()->select('id'))
                    ->where('staff_type', 'referee')
                    ->where('staff_id', $referee->id)
                    ->delete();
            }
        });

        $actionText = $detachSource ? 'dialihkan menjadi' : 'ditugaskan juga sebagai';
        $areaLabels = [
            'chief' => 'Koordinator Utama',
            'court' => 'Koordinator Lapangan / Court',
            'logistics' => 'Koordinator Logistik',
            'liaison' => 'Liaison / Penghubung',
        ];
        $areaLabel = $areaLabels[$area] ?? $area;

        return back()->with('success', "Wasit '{$referee->name}' berhasil {$actionText} Koordinator Lapangan ({$areaLabel}).");
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
        $areaRules = ['required', 'string', 'max:100'];
        if ($request->boolean('create_new')) {
            $validated = $request->validate([
                'create_new' => ['boolean'],
                'name' => ['required', 'string', 'max:150'],
                'gender' => ['nullable', 'in:male,female'],
                'dan_grade' => ['nullable', 'string', 'max:50'],
                'certification_level' => ['nullable', 'string', 'max:100'],
                'coordinator_number' => ['nullable', 'string', 'max:100', 'unique:field_coordinators,coordinator_number'],
                'region' => ['nullable', 'string', 'max:100'],
                'phone' => ['nullable', 'string', 'max:50'],
                'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
                'password' => ['nullable', 'confirmed', Password::defaults()],
                'assignment_area' => $areaRules,
            ]);
            $fieldCoordinator = FieldCoordinator::create([
                'name' => $validated['name'],
                'gender' => $validated['gender'] ?? 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'certification_level' => $validated['certification_level'] ?? null,
                'coordinator_number' => $validated['coordinator_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'is_active' => true,
            ]);
            $user = $syncLoginAccount->execute(
                $fieldCoordinator->name,
                $fieldCoordinator->email,
                $validated['password'] ?? null,
                'Koordinator Lapangan',
                phone: $fieldCoordinator->phone,
            );
            if ($user) {
                $fieldCoordinator->update(['user_id' => $user->id]);
            }
        } else {
            $validated = $request->validate(['field_coordinator_id' => ['required', 'uuid', 'exists:field_coordinators,id'], 'assignment_area' => $areaRules]);
            $fieldCoordinator = FieldCoordinator::findOrFail($validated['field_coordinator_id']);
        }

        $event->fieldCoordinators()->syncWithoutDetaching([$fieldCoordinator->id => ['assignment_area' => $validated['assignment_area']]]);

        $coordinatorUser = $fieldCoordinator->user ?: ($fieldCoordinator->email
            ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($fieldCoordinator->email)])->first()
            : null);

        if ($coordinatorUser) {
            $event->users()->syncWithoutDetaching([
                $coordinatorUser->id => ['access_role' => Event::AccessRoleStaff],
            ]);
        }

        return back()->with('success', "Koordinator '{$fieldCoordinator->name}' berhasil ditugaskan ke event.");
    }

    public function updateEventFieldCoordinator(
        Request $request,
        Event $event,
        FieldCoordinator $fieldCoordinator,
        SyncLoginAccountAction $syncLoginAccount,
    ): RedirectResponse {
        $areaRules = ['required', 'string', 'max:100'];
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['nullable', 'in:male,female'],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'coordinator_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('field_coordinators', 'coordinator_number')->ignore($fieldCoordinator->id)->withoutTrashed(),
            ],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'assignment_area' => $areaRules,
        ]);

        $password = filled($validated['password'] ?? null) ? (string) $validated['password'] : null;

        DB::transaction(function () use ($event, $fieldCoordinator, $validated, $password, $syncLoginAccount): void {
            $fieldCoordinator->update([
                'name' => $validated['name'],
                'gender' => $validated['gender'] ?? $fieldCoordinator->gender ?? 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'certification_level' => $validated['certification_level'] ?? null,
                'coordinator_number' => $validated['coordinator_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
            ]);

            $existingUser = $fieldCoordinator->user ?: ($fieldCoordinator->email
                ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($fieldCoordinator->email)])->first()
                : null);

            $user = $syncLoginAccount->execute(
                $fieldCoordinator->name,
                $fieldCoordinator->email,
                $password,
                'Koordinator Lapangan',
                $existingUser,
                phone: $fieldCoordinator->phone,
            );

            if ($user && $fieldCoordinator->user_id !== $user->id) {
                $fieldCoordinator->update(['user_id' => $user->id]);
            }

            $event->fieldCoordinators()->updateExistingPivot($fieldCoordinator->id, [
                'assignment_area' => $validated['assignment_area'],
            ]);

            if ($user) {
                $event->users()->syncWithoutDetaching([
                    $user->id => ['access_role' => Event::AccessRoleStaff],
                ]);
            }
        });

        return back()->with('success', "Data koordinator '{$fieldCoordinator->name}' berhasil diperbarui.");
    }

    public function destroyEventFieldCoordinator(Event $event, FieldCoordinator $fieldCoordinator): RedirectResponse
    {
        $event->fieldCoordinators()->detach($fieldCoordinator->id);
        EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts()->select('id'))
            ->where('staff_type', 'field_coordinator')
            ->where('staff_id', $fieldCoordinator->id)
            ->delete();

        return back()->with('success', "Koordinator '{$fieldCoordinator->name}' telah dihapus dari event.");
    }

    public function transferCoordinatorToReferee(
        Request $request,
        Event $event,
        FieldCoordinator $fieldCoordinator,
    ): RedirectResponse {
        $validated = $request->validate([
            'role' => ['required', 'in:chief,referee,judge,reserve'],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'license_number' => ['nullable', 'string', 'max:100'],
            'detach_source' => ['nullable', 'boolean'],
        ]);

        $detachSource = $request->boolean('detach_source', true);
        $role = $validated['role'];

        DB::transaction(function () use ($event, $fieldCoordinator, $validated, $role, $detachSource): void {
            $referee = null;
            if (filled($fieldCoordinator->email)) {
                $referee = Referee::query()
                    ->whereRaw('LOWER(email) = ?', [mb_strtolower($fieldCoordinator->email)])
                    ->first();
            }
            if (! $referee && filled($fieldCoordinator->phone)) {
                $referee = Referee::query()
                    ->where('phone', $fieldCoordinator->phone)
                    ->first();
            }
            if (! $referee) {
                $referee = Referee::query()
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($fieldCoordinator->name)])
                    ->first();
            }

            if (! $referee) {
                $referee = Referee::create([
                    'name' => $fieldCoordinator->name,
                    'gender' => 'male',
                    'dan_grade' => $validated['dan_grade'] ?? null,
                    'certification_level' => $validated['certification_level'] ?? null,
                    'license_number' => $validated['license_number'] ?? $fieldCoordinator->coordinator_number ?? null,
                    'region' => $fieldCoordinator->region ?? null,
                    'phone' => $fieldCoordinator->phone ?? null,
                    'email' => $fieldCoordinator->email ?? null,
                    'is_active' => true,
                ]);
            } else {
                $updates = [];
                if (filled($validated['dan_grade'] ?? null) && blank($referee->dan_grade)) {
                    $updates['dan_grade'] = $validated['dan_grade'];
                }
                if (filled($validated['certification_level'] ?? null) && blank($referee->certification_level)) {
                    $updates['certification_level'] = $validated['certification_level'];
                }
                if (filled($validated['license_number'] ?? null) && blank($referee->license_number)) {
                    $updates['license_number'] = $validated['license_number'];
                }
                if ($updates) {
                    $referee->update($updates);
                }
            }

            $event->referees()->syncWithoutDetaching([
                $referee->id => ['role' => $role],
            ]);

            $user = $referee->user;
            if (! $user && filled($fieldCoordinator->email)) {
                $user = User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($fieldCoordinator->email)])->first();
            }
            if ($user) {
                $user->assignRole(Role::findOrCreate('Wasit', 'web'));
                if (! $referee->user_id) {
                    $referee->update(['user_id' => $user->id]);
                }
                $event->users()->syncWithoutDetaching([
                    $user->id => ['access_role' => Event::AccessRoleStaff],
                ]);
            }

            if ($detachSource) {
                $event->fieldCoordinators()->detach($fieldCoordinator->id);
                EventCourtAssignment::query()
                    ->whereIn('event_court_id', $event->courts()->select('id'))
                    ->where('staff_type', 'field_coordinator')
                    ->where('staff_id', $fieldCoordinator->id)
                    ->delete();
            }
        });

        $actionText = $detachSource ? 'dialihkan menjadi' : 'ditugaskan juga sebagai';
        $roleLabels = [
            'chief' => 'Wasit Utama',
            'referee' => 'Wasit Juri',
            'judge' => 'Juri Nilai',
            'reserve' => 'Wasit Cadangan',
        ];
        $roleLabel = $roleLabels[$role] ?? $role;

        return back()->with('success', "Koordinator '{$fieldCoordinator->name}' berhasil {$actionText} Wasit ({$roleLabel}).");
    }

    // ─────────────────────────────────────────────────────────────
    // ARBITRASE EVENT
    // ─────────────────────────────────────────────────────────────

    public function storeEventArbitrator(Request $request, Event $event, SyncLoginAccountAction $syncLoginAccount): RedirectResponse
    {
        $roleRules = ['required', 'string', 'max:100'];

        if ($request->boolean('create_new')) {
            $validated = $request->validate([
                'create_new' => ['boolean'],
                'name' => ['required', 'string', 'max:150'],
                'gender' => ['nullable', 'in:male,female'],
                'dan_grade' => ['nullable', 'string', 'max:50'],
                'certification_level' => ['nullable', 'string', 'max:100'],
                'license_number' => ['nullable', 'string', 'max:100', Rule::unique('arbitrators', 'license_number')->withoutTrashed()],
                'region' => ['nullable', 'string', 'max:100'],
                'phone' => ['nullable', 'string', 'max:50'],
                'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
                'password' => ['nullable', 'confirmed', Password::defaults()],
                'role' => $roleRules,
            ]);

            $arbitrator = Arbitrator::create([
                'name' => $validated['name'],
                'gender' => $validated['gender'] ?? 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'certification_level' => $validated['certification_level'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'is_active' => true,
            ]);

            $user = $syncLoginAccount->execute(
                $arbitrator->name,
                $arbitrator->email,
                $validated['password'] ?? null,
                'Arbitrase',
                phone: $arbitrator->phone,
            );

            if ($user) {
                $arbitrator->update(['user_id' => $user->id]);
            }
        } else {
            $validated = $request->validate([
                'arbitrator_id' => ['required', 'uuid', 'exists:arbitrators,id'],
                'role' => $roleRules,
            ]);

            $arbitrator = Arbitrator::findOrFail($validated['arbitrator_id']);
        }

        $event->arbitrators()->syncWithoutDetaching([$arbitrator->id => ['role' => $validated['role']]]);

        if ($arbitrator->user) {
            $event->users()->syncWithoutDetaching([
                $arbitrator->user->id => ['access_role' => Event::AccessRoleStaff],
            ]);
        }

        return back()->with('success', "Personil arbitrase '{$arbitrator->name}' berhasil ditugaskan ke event.");
    }

    public function updateEventArbitrator(
        Request $request,
        Event $event,
        Arbitrator $arbitrator,
        SyncLoginAccountAction $syncLoginAccount,
    ): RedirectResponse {
        $roleRules = ['required', 'string', 'max:100'];

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['nullable', 'in:male,female'],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'license_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('arbitrators', 'license_number')->ignore($arbitrator->id)->withoutTrashed(),
            ],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => $roleRules,
        ]);

        $password = filled($validated['password'] ?? null) ? (string) $validated['password'] : null;

        DB::transaction(function () use ($event, $arbitrator, $validated, $password, $syncLoginAccount): void {
            $arbitrator->update([
                'name' => $validated['name'],
                'gender' => $validated['gender'] ?? $arbitrator->gender ?? 'male',
                'dan_grade' => $validated['dan_grade'] ?? null,
                'certification_level' => $validated['certification_level'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'region' => $validated['region'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
            ]);

            $existingUser = $arbitrator->user ?: ($arbitrator->email
                ? User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($arbitrator->email)])->first()
                : null);

            $user = $syncLoginAccount->execute(
                $arbitrator->name,
                $arbitrator->email,
                $password,
                'Arbitrase',
                $existingUser,
                phone: $arbitrator->phone,
            );

            if ($user && $arbitrator->user_id !== $user->id) {
                $arbitrator->update(['user_id' => $user->id]);
            }

            $event->arbitrators()->updateExistingPivot($arbitrator->id, [
                'role' => $validated['role'],
            ]);

            if ($user) {
                $event->users()->syncWithoutDetaching([
                    $user->id => ['access_role' => Event::AccessRoleStaff],
                ]);
            }
        });

        return back()->with('success', "Data arbitrase '{$arbitrator->name}' berhasil diperbarui.");
    }

    public function destroyEventArbitrator(Event $event, Arbitrator $arbitrator): RedirectResponse
    {
        $event->arbitrators()->detach($arbitrator->id);

        return back()->with('success', "Personil arbitrase '{$arbitrator->name}' telah dihapus dari event.");
    }

    /**
     * Alihkan penugasan personil secara universal (Arbitrase ⇄ Wasit & Juri ⇄ Koordinator Lapangan).
     */
    public function transferOfficial(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'source_category' => ['required', 'in:arbitrator,referee,coordinator'],
            'source_id' => ['required', 'uuid'],
            'target_category' => ['required', 'in:arbitrator,referee,coordinator', 'different:source_category'],
            'target_role' => ['required', 'string', 'max:100'],
            'detach_source' => ['nullable', 'boolean'],
            'gender' => ['nullable', 'in:male,female'],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'license_number' => ['nullable', 'string', 'max:100'],
        ]);

        $detachSource = $request->boolean('detach_source', true);
        $sourceCat = $validated['source_category'];
        $targetCat = $validated['target_category'];
        $targetRole = $validated['target_role'];

        $sourcePerson = match ($sourceCat) {
            'arbitrator' => Arbitrator::findOrFail($validated['source_id']),
            'referee' => Referee::findOrFail($validated['source_id']),
            'coordinator' => FieldCoordinator::findOrFail($validated['source_id']),
        };

        $name = $sourcePerson->name;
        $gender = $validated['gender'] ?? $sourcePerson->gender ?? 'male';
        $danGrade = $validated['dan_grade'] ?? $sourcePerson->dan_grade ?? null;
        $cert = $validated['certification_level'] ?? $sourcePerson->certification_level ?? null;
        $lic = $validated['license_number'] ?? $sourcePerson->license_number ?? ($sourcePerson->coordinator_number ?? null);
        $region = $sourcePerson->region ?? null;
        $phone = $sourcePerson->phone ?? null;
        $email = $sourcePerson->email ?? null;

        DB::transaction(function () use (
            $event,
            $sourcePerson,
            $sourceCat,
            $targetCat,
            $targetRole,
            $detachSource,
            $name,
            $gender,
            $danGrade,
            $cert,
            $lic,
            $region,
            $phone,
            $email
        ): void {
            if ($targetCat === 'arbitrator') {
                $arbitrator = null;
                if (filled($lic)) {
                    $arbitrator = Arbitrator::where('license_number', $lic)->first();
                }
                if (! $arbitrator && filled($email)) {
                    $arbitrator = Arbitrator::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first();
                }
                if (! $arbitrator) {
                    $arbitrator = Arbitrator::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
                }

                if (! $arbitrator) {
                    $arbitrator = Arbitrator::create([
                        'name' => $name,
                        'gender' => $gender,
                        'dan_grade' => $danGrade,
                        'certification_level' => $cert,
                        'license_number' => $lic,
                        'region' => $region,
                        'phone' => $phone,
                        'email' => $email,
                        'is_active' => true,
                    ]);
                } else {
                    $arbitrator->update(array_filter([
                        'gender' => $gender,
                        'dan_grade' => $danGrade ?: $arbitrator->dan_grade,
                        'certification_level' => $cert ?: $arbitrator->certification_level,
                        'license_number' => $lic ?: $arbitrator->license_number,
                        'region' => $region ?: $arbitrator->region,
                        'phone' => $phone ?: $arbitrator->phone,
                        'email' => $email ?: $arbitrator->email,
                    ]));
                }

                $event->arbitrators()->syncWithoutDetaching([$arbitrator->id => ['role' => $targetRole]]);
                $user = $arbitrator->user ?: ($email ? User::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first() : null);
                if ($user) {
                    $user->assignRole(Role::findOrCreate('Arbitrase', 'web'));
                    $event->users()->syncWithoutDetaching([$user->id => ['access_role' => Event::AccessRoleStaff]]);
                    if (! $arbitrator->user_id) {
                        $arbitrator->update(['user_id' => $user->id]);
                    }
                }
            } elseif ($targetCat === 'referee') {
                $referee = null;
                if (filled($lic)) {
                    $referee = Referee::where('license_number', $lic)->first();
                }
                if (! $referee && filled($email)) {
                    $referee = Referee::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first();
                }
                if (! $referee) {
                    $referee = Referee::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
                }

                if (! $referee) {
                    $referee = Referee::create([
                        'name' => $name,
                        'gender' => $gender,
                        'dan_grade' => $danGrade,
                        'certification_level' => $cert,
                        'license_number' => $lic,
                        'region' => $region,
                        'phone' => $phone,
                        'email' => $email,
                        'is_active' => true,
                    ]);
                } else {
                    $referee->update(array_filter([
                        'gender' => $gender,
                        'dan_grade' => $danGrade ?: $referee->dan_grade,
                        'certification_level' => $cert ?: $referee->certification_level,
                        'license_number' => $lic ?: $referee->license_number,
                        'region' => $region ?: $referee->region,
                        'phone' => $phone ?: $referee->phone,
                        'email' => $email ?: $referee->email,
                    ]));
                }

                $event->referees()->syncWithoutDetaching([$referee->id => ['role' => $targetRole]]);
                $user = $referee->user ?: ($email ? User::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first() : null);
                if ($user) {
                    $user->assignRole(Role::findOrCreate('Wasit', 'web'));
                    $event->users()->syncWithoutDetaching([$user->id => ['access_role' => Event::AccessRoleStaff]]);
                    if (! $referee->user_id) {
                        $referee->update(['user_id' => $user->id]);
                    }
                }
            } elseif ($targetCat === 'coordinator') {
                $coord = null;
                if (filled($lic)) {
                    $coord = FieldCoordinator::where('coordinator_number', $lic)->first();
                }
                if (! $coord && filled($email)) {
                    $coord = FieldCoordinator::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first();
                }
                if (! $coord) {
                    $coord = FieldCoordinator::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
                }

                if (! $coord) {
                    $coord = FieldCoordinator::create([
                        'name' => $name,
                        'gender' => $gender,
                        'dan_grade' => $danGrade,
                        'certification_level' => $cert,
                        'coordinator_number' => $lic,
                        'region' => $region,
                        'phone' => $phone,
                        'email' => $email,
                        'is_active' => true,
                    ]);
                } else {
                    $coord->update(array_filter([
                        'gender' => $gender,
                        'dan_grade' => $danGrade ?: $coord->dan_grade,
                        'certification_level' => $cert ?: $coord->certification_level,
                        'coordinator_number' => $lic ?: $coord->coordinator_number,
                        'region' => $region ?: $coord->region,
                        'phone' => $phone ?: $coord->phone,
                        'email' => $email ?: $coord->email,
                    ]));
                }

                $event->fieldCoordinators()->syncWithoutDetaching([$coord->id => ['assignment_area' => $targetRole]]);
                $user = $coord->user ?: ($email ? User::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first() : null);
                if ($user) {
                    $user->assignRole(Role::findOrCreate('Koordinator Lapangan', 'web'));
                    $event->users()->syncWithoutDetaching([$user->id => ['access_role' => Event::AccessRoleStaff]]);
                    if (! $coord->user_id) {
                        $coord->update(['user_id' => $user->id]);
                    }
                }
            }

            if ($detachSource) {
                if ($sourceCat === 'arbitrator') {
                    $event->arbitrators()->detach($sourcePerson->id);
                } elseif ($sourceCat === 'referee') {
                    $event->referees()->detach($sourcePerson->id);
                    EventCourtAssignment::query()
                        ->whereIn('event_court_id', $event->courts()->select('id'))
                        ->where('staff_type', 'referee')
                        ->where('staff_id', $sourcePerson->id)
                        ->delete();
                } elseif ($sourceCat === 'coordinator') {
                    $event->fieldCoordinators()->detach($sourcePerson->id);
                    EventCourtAssignment::query()
                        ->whereIn('event_court_id', $event->courts()->select('id'))
                        ->where('staff_type', 'field_coordinator')
                        ->where('staff_id', $sourcePerson->id)
                        ->delete();
                }
            }
        });

        $catLabels = [
            'arbitrator' => 'Arbitrase',
            'referee' => 'Wasit & Juri',
            'coordinator' => 'Koordinator Lapangan',
        ];
        $actionText = $detachSource ? 'dialihkan menjadi' : 'ditugaskan juga sebagai';

        return back()->with('success', "Personil '{$name}' berhasil {$actionText} {$catLabels[$targetCat]} ({$targetRole}).");
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
