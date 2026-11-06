<?php

namespace App\Http\Controllers\Admin\Tournament;

use App\Actions\Admin\Master\SyncLoginAccountAction;
use App\Actions\Admin\Tournament\GenerateRefereeCourtPanelsAction;
use App\Actions\Admin\Tournament\SwapOrMoveRefereeAction;
use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tournament\SwapOrMoveRefereeRequest;
use App\Http\Requests\Admin\Tournament\UpdateRefereeAttendanceRequest;
use App\Http\Requests\Admin\Tournament\UpdateRefereeCourtPanelRequest;
use App\Http\Requests\Admin\Tournament\UpsertRefereeAccountRequest;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAssignmentHistory;
use App\Models\RefereeCourtAttendance;
use App\Models\User;
use App\Services\Panitera\EventContext;
use App\Services\Referee\RefereeCheckInCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EventRefereeController extends Controller
{
    public function index(Request $request, EventContext $eventContext, RefereeCheckInCodeService $refereeCodeService): Response
    {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        $today = now()->toDateString();
        $event->load([
            'referees' => fn ($query) => $query
                ->with('user:id,name,email,phone')
                ->with([
                    'attendances' => fn ($query) => $query
                        ->where('event_id', $event->id)
                        ->with('checkedInBy:id,name')
                        ->orderByDesc('attendance_date'),
                    'courtAttendances' => fn ($query) => $query
                        ->where('event_id', $event->id)
                        ->with('court:id,name')
                        ->orderByDesc('attendance_date'),
                ])
                ->orderBy('name'),
            'courts' => fn ($query) => $query
                ->where('is_active', true)
                ->with([
                    'assignments',
                    'refereeAttendances' => fn ($query) => $query->whereDate('attendance_date', $today),
                    'refereeAssignmentHistories' => fn ($query) => $query
                        ->with(['referee:id,name', 'changedBy:id,name'])
                        ->orderByDesc('occurred_at')
                        ->orderByDesc('created_at'),
                ]),
        ]);

        $legacyUsers = User::query()
            ->whereIn('email', $event->referees->whereNull('user_id')->pluck('email')->filter())
            ->get(['id', 'name', 'email', 'phone'])
            ->keyBy(fn (User $user): string => mb_strtolower($user->email));
        $courtNames = $event->courts->pluck('name', 'id');
        $assignmentsByReferee = EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts->modelKeys())
            ->where('staff_type', 'referee')
            ->get()
            ->groupBy('staff_id');
        $refereeNames = $event->referees->pluck('name', 'id');
        $refereesById = $event->referees->keyBy('id');
        $expiresAt = $this->qrExpiresAt($event);

        $availableCoordinators = FieldCoordinator::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'coordinator_number', 'region', 'phone', 'email']);
        $coordinatorsById = $availableCoordinators->keyBy('id');
        $coordinatorAssignments = EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts->modelKeys())
            ->where('staff_type', 'field_coordinator')
            ->where('role', 'court_coordinator')
            ->get()
            ->keyBy('event_court_id');

        $referees = $event->referees->map(function (Referee $referee) use ($assignmentsByReferee, $courtNames, $legacyUsers, $today): array {
            $attendance = $referee->attendances
                ->first(fn (RefereeAttendance $attendance): bool => $attendance->attendance_date?->toDateString() === $today);
            $account = $referee->user
                ?? $legacyUsers->get(mb_strtolower((string) $referee->email));

            return [
                'id' => $referee->id,
                'name' => $referee->name,
                'email' => $referee->email,
                'phone' => $referee->phone,
                'license_number' => $referee->license_number,
                'certification_level' => $referee->certification_level,
                'dan_grade' => $referee->dan_grade,
                'is_chief_qualified' => GenerateRefereeCourtPanelsAction::isChiefQualified($referee),
                'region' => $referee->region,
                'is_active' => (bool) $referee->is_active,
                'attendance_recorded' => $attendance !== null,
                'is_present' => (bool) $attendance?->is_present,
                'checked_in_at' => $attendance?->checked_in_at?->translatedFormat('d M Y, H:i'),
                'attendance_history' => $referee->attendances->map(fn (RefereeAttendance $history): array => [
                    'id' => $history->id,
                    'date' => $history->attendance_date?->toDateString(),
                    'date_label' => $history->attendance_date?->translatedFormat('d M Y'),
                    'is_present' => (bool) $history->is_present,
                    'checked_in_at' => $history->checked_in_at?->translatedFormat('H:i'),
                    'method' => $history->method,
                    'method_label' => $history->method === 'qr' ? 'QR' : 'Manual',
                    'notes' => $history->notes,
                    'updated_by' => $history->checkedInBy?->name,
                ])->values(),
                'court_attendance_history' => $referee->courtAttendances->map(fn (RefereeCourtAttendance $history): array => [
                    'id' => $history->id,
                    'date' => $history->attendance_date?->toDateString(),
                    'date_label' => $history->attendance_date?->translatedFormat('d M Y'),
                    'court_name' => $history->court?->name,
                    'checked_in_at' => $history->checked_in_at?->translatedFormat('H:i'),
                    'method_label' => $history->method === 'qr' ? 'QR' : 'Manual',
                ])->values(),
                'account' => $account ? [
                    'id' => $account->id,
                    'email' => $account->email,
                    'phone' => $account->phone,
                ] : null,
                'assignments' => $assignmentsByReferee->get($referee->id, collect())
                    ->map(fn (EventCourtAssignment $assignment): array => [
                        'court_id' => $assignment->event_court_id,
                        'court' => $courtNames->get($assignment->event_court_id),
                        'role' => RefereeCourtRole::tryFrom($assignment->role)?->label() ?? $assignment->role,
                        'role_key' => $assignment->role,
                    ])->values(),
            ];
        })->values();
        $presentRefereeIds = $referees->where('is_present', true)->pluck('id');

        $courts = $event->courts->map(function (EventCourt $court) use ($event, $expiresAt, $presentRefereeIds, $refereeNames, $refereesById, $coordinatorAssignments, $coordinatorsById, $refereeCodeService): array {
            $refereeAssignments = $court->assignments
                ->where('staff_type', 'referee')
                ->where('role', '!=', 'reserve')
                ->keyBy('role');
            $courtAttendances = $court->refereeAttendances->keyBy('referee_id');
            $panelComplete = collect(RefereeCourtRole::values())
                ->every(fn (string $role): bool => $refereeAssignments->has($role));
            $panelReady = $panelComplete && $refereeAssignments
                ->every(fn (EventCourtAssignment $assignment): bool => $presentRefereeIds->contains($assignment->staff_id)
                    && $courtAttendances->has($assignment->staff_id));

            $coordAssignment = $coordinatorAssignments->get($court->id);
            $coord = $coordAssignment ? $coordinatorsById->get($coordAssignment->staff_id) : null;
            $courtCheckInData = $refereeCodeService->issueCourtCheckIn($event, $court, null, $expiresAt);

            return [
                'id' => $court->id,
                'name' => $court->name,
                'location' => $court->location,
                'access_code' => $court->access_code,
                'coordinator' => $coord ? [
                    'id' => $coord->id,
                    'assignment_id' => $coordAssignment->id,
                    'name' => $coord->name,
                    'coordinator_number' => $coord->coordinator_number,
                    'region' => $coord->region,
                    'phone' => $coord->phone,
                ] : null,
                'check_in_url' => $courtCheckInData['url'],
                'check_in_code' => $courtCheckInData['code'],
                'panel_complete' => $panelComplete,
                'panel_ready' => $panelReady,
                'has_panel' => $court->assignments->where('staff_type', 'referee')->isNotEmpty(),
                'panel' => collect(RefereeCourtRole::cases())->map(function (RefereeCourtRole $role) use ($refereeAssignments, $courtAttendances, $presentRefereeIds, $refereeNames, $refereesById, $event, $court, $expiresAt, $refereeCodeService): array {
                    $assignment = $refereeAssignments->get($role->value);
                    $refereeId = $assignment?->staff_id;
                    $ref = $refereeId ? $refereesById->get($refereeId) : null;
                    $roleCheckInData = $refereeCodeService->issueCourtCheckIn($event, $court, $role->value, $expiresAt);

                    return [
                        'role' => $role->value,
                        'role_label' => $role->label(),
                        'judge_number' => $role->judgeNumber(),
                        'referee_id' => $refereeId,
                        'referee_name' => $refereeId ? $refereeNames->get($refereeId) : null,
                        'dan_grade' => $ref?->dan_grade,
                        'is_chief_qualified' => $ref ? GenerateRefereeCourtPanelsAction::isChiefQualified($ref) : false,
                        'region' => $ref?->region,
                        'court_present' => $refereeId
                            ? $presentRefereeIds->contains($refereeId) && $courtAttendances->has($refereeId)
                            : false,
                        'court_checked_in_at' => $refereeId
                            ? $courtAttendances->get($refereeId)?->checked_in_at?->translatedFormat('d M Y, H:i')
                            : null,
                        'check_in_url' => $roleCheckInData['url'],
                        'check_in_code' => $roleCheckInData['code'],
                    ];
                })->values(),
                'reserves' => $court->assignments
                    ->where('staff_type', 'referee')
                    ->where('role', 'reserve')
                    ->map(function (EventCourtAssignment $assignment) use ($refereesById, $courtAttendances, $presentRefereeIds, $event, $court, $expiresAt, $refereeCodeService): array {
                        $ref = $refereesById->get($assignment->staff_id);
                        $reserveCheckInData = $refereeCodeService->issueCourtCheckIn($event, $court, 'reserve', $expiresAt);

                        return [
                            'referee_id' => $assignment->staff_id,
                            'referee_name' => $ref?->name ?? 'Wasit tidak tersedia',
                            'dan_grade' => $ref?->dan_grade,
                            'is_chief_qualified' => $ref ? GenerateRefereeCourtPanelsAction::isChiefQualified($ref) : false,
                            'region' => $ref?->region,
                            'court_present' => $assignment->staff_id
                                ? $presentRefereeIds->contains($assignment->staff_id) && $courtAttendances->has($assignment->staff_id)
                                : false,
                            'court_checked_in_at' => $assignment->staff_id
                                ? $courtAttendances->get($assignment->staff_id)?->checked_in_at?->translatedFormat('d M Y, H:i')
                                : null,
                            'check_in_url' => $reserveCheckInData['url'],
                            'check_in_code' => $reserveCheckInData['code'],
                        ];
                    })->values(),
                'assignment_history' => $court->refereeAssignmentHistories->map(fn (RefereeCourtAssignmentHistory $history): array => [
                    'id' => $history->id,
                    'batch_id' => $history->batch_id,
                    'action' => $history->action,
                    'action_label' => match ($history->action) {
                        RefereeCourtAssignmentHistory::ActionAssigned => 'Ditugaskan',
                        RefereeCourtAssignmentHistory::ActionRemoved => 'Diganti',
                        RefereeCourtAssignmentHistory::ActionReset => 'Direset',
                        default => ucfirst($history->action),
                    },
                    'role' => $history->role,
                    'role_label' => RefereeCourtRole::tryFrom($history->role)?->label() ?? $history->role,
                    'referee_name' => $history->referee?->name ?? 'Wasit tidak tersedia',
                    'changed_by' => $history->changedBy?->name,
                    'occurred_at' => $history->occurred_at?->translatedFormat('d M Y, H:i:s'),
                ])->values(),
            ];
        })->values();

        $eventCheckInData = $refereeCodeService->issueEventCheckIn($event, $expiresAt);

        return Inertia::render('Admin/Tournament/EventReferees', [
            'activeEvent' => $event->only(['id', 'name', 'slug', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'referees' => $referees,
            'courts' => $courts,
            'availableCoordinators' => $availableCoordinators->map(fn ($c): array => [
                'id' => $c->id,
                'name' => $c->name,
                'coordinator_number' => $c->coordinator_number,
                'region' => $c->region,
                'phone' => $c->phone,
            ])->values(),
            'roles' => RefereeCourtRole::options(),
            'eventCheckInUrl' => $eventCheckInData['url'],
            'eventCheckInCode' => $eventCheckInData['code'],
            'qrExpiresAt' => $expiresAt->translatedFormat('d M Y, H:i'),
            'refereeLoginUrl' => route('wasit.login'),
            'today' => $today,
            'stats' => [
                'total' => $referees->count(),
                'present' => $referees->where('is_present', true)->count(),
                'assignable' => $referees->where('is_present', true)->where('is_active', true)->count(),
                'with_account' => $referees->whereNotNull('account')->count(),
                'courts_ready' => $courts->where('panel_ready', true)->count(),
            ],
        ]);
    }

    public function updateCourtPanel(
        UpdateRefereeCourtPanelRequest $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($eventCourt->event_id === $event->id, 404);

        /** @var array<string, string> $selectedByRole */
        $selectedByRole = $request->validated('referees');
        $selectedRefereeIds = array_values($selectedByRole);
        $eventRefereeIds = $event->referees()->whereIn('referees.id', $selectedRefereeIds)->pluck('referees.id');

        if ($eventRefereeIds->count() !== count($selectedRefereeIds)) {
            throw ValidationException::withMessages([
                'referees' => 'Semua wasit harus terdaftar pada roster event yang dipilih.',
            ]);
        }

        $presentRefereeIds = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereIn('referee_id', $selectedRefereeIds)
            ->whereDate('attendance_date', now()->toDateString())
            ->where('is_present', true)
            ->pluck('referee_id');

        if ($presentRefereeIds->count() !== count($selectedRefereeIds)) {
            throw ValidationException::withMessages([
                'referees' => 'Hanya wasit yang sudah scan QR absensi event yang dapat ditugaskan.',
            ]);
        }

        if (isset($selectedByRole[RefereeCourtRole::Chief->value])) {
            $chiefReferee = Referee::query()->find($selectedByRole[RefereeCourtRole::Chief->value]);
            if ($chiefReferee && ! GenerateRefereeCourtPanelsAction::isChiefQualified($chiefReferee)) {
                throw ValidationException::withMessages([
                    'referees' => "Wasit Utama ({$chiefReferee->name}) wajib memiliki kualifikasi minimal IV DAN ke atas atau Wasit Nasional.",
                ]);
            }
        }

        $otherCourtAssignment = EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts()->whereKeyNot($eventCourt->id)->pluck('id'))
            ->where('staff_type', 'referee')
            ->whereIn('staff_id', $selectedRefereeIds)
            ->first();

        if ($otherCourtAssignment) {
            $refereeName = Referee::query()->whereKey($otherCourtAssignment->staff_id)->value('name');

            throw ValidationException::withMessages([
                'referees' => "{$refereeName} masih bertugas di court lain. Lepaskan penugasan tersebut terlebih dahulu.",
            ]);
        }

        DB::transaction(function () use ($event, $eventCourt, $request, $selectedByRole, $selectedRefereeIds): void {
            $occurredAt = now();
            $batchId = (string) Str::uuid();
            $existingAssignments = EventCourtAssignment::query()
                ->whereBelongsTo($eventCourt, 'court')
                ->where('staff_type', 'referee')
                ->lockForUpdate()
                ->get();

            $this->recordAssignmentHistory(
                event: $event,
                eventCourt: $eventCourt,
                assignments: $existingAssignments,
                action: RefereeCourtAssignmentHistory::ActionRemoved,
                changedByUserId: $request->user()?->id,
                batchId: $batchId,
                occurredAt: $occurredAt,
            );

            EventCourtAssignment::query()
                ->whereKey($existingAssignments->modelKeys())
                ->delete();

            $newAssignments = collect();

            foreach ($selectedByRole as $role => $refereeId) {
                $newAssignments->push(EventCourtAssignment::query()->create([
                    'event_court_id' => $eventCourt->id,
                    'staff_type' => 'referee',
                    'staff_id' => $refereeId,
                    'role' => $role,
                ]));
            }

            $this->recordAssignmentHistory(
                event: $event,
                eventCourt: $eventCourt,
                assignments: $newAssignments,
                action: RefereeCourtAssignmentHistory::ActionAssigned,
                changedByUserId: $request->user()?->id,
                batchId: $batchId,
                occurredAt: $occurredAt,
            );

            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereBelongsTo($eventCourt, 'court')
                ->whereDate('attendance_date', now()->toDateString())
                ->whereNotIn('referee_id', $selectedRefereeIds)
                ->delete();
        });

        return back()->with('success', "Panel lima wasit {$eventCourt->name} berhasil disimpan. Selanjutnya setiap wasit wajib scan QR court.");
    }

    public function generateCourtPanels(
        Request $request,
        EventContext $eventContext,
        GenerateRefereeCourtPanelsAction $generateRefereeCourtPanels,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);

        $assignmentCount = $generateRefereeCourtPanels->allocateCourts($event, $request->user()?->id);
        $courtCount = $event->courts()->where('is_active', true)->count();

        return back()->with('success', "Pembagian {$assignmentCount} penugasan wasit untuk {$courtCount} court berhasil digenerate seimbang per kota dan tingkatan DAN.");
    }

    public function swapOrMoveReferee(
        SwapOrMoveRefereeRequest $request,
        EventContext $eventContext,
        SwapOrMoveRefereeAction $swapAction,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);

        $validated = $request->validated();
        $sourceReferee = Referee::query()->findOrFail($validated['source_referee_id']);
        $targetReferee = ! empty($validated['target_referee_id'])
            ? Referee::query()->findOrFail($validated['target_referee_id'])
            : null;
        $targetCourt = ! empty($validated['target_court_id'])
            ? EventCourt::query()->findOrFail($validated['target_court_id'])
            : null;

        $message = $swapAction->execute(
            event: $event,
            sourceReferee: $sourceReferee,
            targetReferee: $targetReferee,
            targetCourt: $targetCourt,
            targetRole: $validated['target_role'] ?? null,
            changedByUserId: $request->user()?->id,
        );

        return back()->with('success', $message);
    }

    public function rotateCourtPanel(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
        GenerateRefereeCourtPanelsAction $generateRefereeCourtPanels,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($eventCourt->event_id === $event->id, 404);

        $count = $generateRefereeCourtPanels->rotateCourtPanel($eventCourt, $request->user()?->id);

        return back()->with('success', "Penugasan wasit {$eventCourt->name} berhasil dirotasi untuk nomor pertandingan berikutnya.");
    }

    public function resetCourtPanel(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($eventCourt->event_id === $event->id, 404);

        $removedCount = DB::transaction(function () use ($event, $eventCourt, $request): int {
            $assignments = EventCourtAssignment::query()
                ->whereBelongsTo($eventCourt, 'court')
                ->where('staff_type', 'referee')
                ->lockForUpdate()
                ->get();

            if ($assignments->isEmpty()) {
                return 0;
            }

            $this->recordAssignmentHistory(
                event: $event,
                eventCourt: $eventCourt,
                assignments: $assignments,
                action: RefereeCourtAssignmentHistory::ActionReset,
                changedByUserId: $request->user()?->id,
                batchId: (string) Str::uuid(),
                occurredAt: now(),
            );

            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereBelongsTo($eventCourt, 'court')
                ->whereDate('attendance_date', now()->toDateString())
                ->whereIn('referee_id', $assignments->pluck('staff_id'))
                ->delete();

            EventCourtAssignment::query()
                ->whereKey($assignments->modelKeys())
                ->delete();

            return $assignments->count();
        });

        if ($removedCount === 0) {
            return back()->with('success', "Panel wasit {$eventCourt->name} sudah kosong.");
        }

        return back()->with('success', "Panel wasit {$eventCourt->name} berhasil direset. Penugasan dapat digenerate kembali.");
    }

    public function upsertAccount(
        UpsertRefereeAccountRequest $request,
        Referee $referee,
        EventContext $eventContext,
        SyncLoginAccountAction $syncLoginAccount,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($event->referees()->whereKey($referee->id)->exists(), 404);
        $validated = $request->validated();

        DB::transaction(function () use ($event, $referee, $syncLoginAccount, $validated): void {
            $user = $referee->user;

            if (! $user && $referee->email && mb_strtolower($referee->email) === mb_strtolower($validated['email'])) {
                $user = User::query()->where('email', $validated['email'])->first();
            }

            $user = $syncLoginAccount->execute(
                $referee->name,
                $validated['email'],
                $validated['password'],
                'Wasit',
                $user,
                $validated['phone'] ?? $referee->phone,
            );

            if (! $user) {
                throw ValidationException::withMessages(['email' => 'Akun login wasit tidak dapat dibuat.']);
            }

            $event->users()->syncWithoutDetaching([
                $user->id => ['access_role' => Event::AccessRoleStaff],
            ]);
            $referee->update([
                'user_id' => $user->id,
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? $referee->phone,
            ]);
        });

        return back()->with('success', "Akun login {$referee->name} berhasil disiapkan.");
    }

    public function updateAttendance(
        UpdateRefereeAttendanceRequest $request,
        Referee $referee,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($event->referees()->whereKey($referee->id)->exists(), 404);
        $validated = $request->validated();
        $isPresent = (bool) $validated['is_present'];
        $now = now();
        $checkedInAt = $isPresent
            ? Carbon::parse($validated['attendance_date'], config('app.timezone'))
                ->setTime($now->hour, $now->minute, $now->second)
            : null;

        $attendance = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', $validated['attendance_date'])
            ->first() ?? new RefereeAttendance([
                'event_id' => $event->id,
                'referee_id' => $referee->id,
                'attendance_date' => $validated['attendance_date'],
            ]);
        $attendance->fill([
            'is_present' => $isPresent,
            'checked_in_by_user_id' => $request->user()?->id,
            'checked_in_at' => $checkedInAt,
            'method' => 'manual',
            'notes' => ($validated['notes'] ?? null) ?: null,
        ]);
        $attendance->save();

        $status = $isPresent ? 'hadir' : 'tidak hadir';
        $dateLabel = ($checkedInAt ?? Carbon::parse($validated['attendance_date']))->translatedFormat('d M Y');

        return back()->with('success', "Kehadiran {$referee->name} pada {$dateLabel} diperbarui menjadi {$status}.");
    }

    public function resetAttendance(
        Request $request,
        Referee $referee,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($event->referees()->whereKey($referee->id)->exists(), 404);

        $date = $request->input('attendance_date')
            ?? $request->query('attendance_date')
            ?? now()->toDateString();

        RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', $date)
            ->delete();

        RefereeCourtAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', $date)
            ->delete();

        $assignments = EventCourtAssignment::query()
            ->where('staff_type', 'referee')
            ->where('staff_id', $referee->id)
            ->get();
        foreach ($assignments as $asn) {
            Cache::forget("referee_session_lock:court_{$asn->event_court_id}:role_{$asn->role}");
        }

        $dateLabel = Carbon::parse($date)->translatedFormat('d M Y');

        return back()->with('success', "Kehadiran {$referee->name} pada {$dateLabel} berhasil direset.");
    }

    public function updateCourtCoordinator(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($eventCourt->event_id === $event->id, 404);

        $validated = $request->validate([
            'coordinator_id' => ['required', 'uuid', 'exists:field_coordinators,id'],
        ], [
            'coordinator_id.required' => 'Pilih koordinator court yang ingin ditugaskan.',
            'coordinator_id.exists' => 'Data koordinator court tidak ditemukan.',
        ]);

        $coordinator = FieldCoordinator::query()->findOrFail($validated['coordinator_id']);

        DB::transaction(function () use ($event, $eventCourt, $coordinator): void {
            // Remove existing coordinator on this court
            EventCourtAssignment::query()
                ->where('event_court_id', $eventCourt->id)
                ->where('staff_type', 'field_coordinator')
                ->where('role', 'court_coordinator')
                ->delete();

            // Reassign: remove this coordinator from any other court in this event
            EventCourtAssignment::query()
                ->whereIn('event_court_id', $event->courts()->pluck('id'))
                ->where('staff_type', 'field_coordinator')
                ->where('staff_id', $coordinator->id)
                ->delete();

            EventCourtAssignment::query()->create([
                'event_court_id' => $eventCourt->id,
                'staff_type' => 'field_coordinator',
                'staff_id' => $coordinator->id,
                'role' => 'court_coordinator',
            ]);
        });

        return back()->with('success', "Koordinator Court {$coordinator->name} berhasil ditugaskan ke {$eventCourt->name}.");
    }

    public function resetCourtCoordinator(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);
        abort_unless($eventCourt->event_id === $event->id, 404);

        $deleted = EventCourtAssignment::query()
            ->where('event_court_id', $eventCourt->id)
            ->where('staff_type', 'field_coordinator')
            ->where('role', 'court_coordinator')
            ->delete();

        if ($deleted === 0) {
            return back()->with('success', "Koordinator Court pada {$eventCourt->name} sudah kosong.");
        }

        return back()->with('success', "Penugasan Koordinator Court pada {$eventCourt->name} berhasil direset.");
    }

    public function generateCourtCoordinators(
        Request $request,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanManageEventReferees($request, $event);

        $courts = $event->courts()->where('is_active', true)->orderBy('order')->orderBy('id')->get();
        if ($courts->isEmpty()) {
            throw ValidationException::withMessages([
                'coordinators' => 'Belum ada court aktif.',
            ]);
        }

        $coordinators = FieldCoordinator::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        if ($coordinators->isEmpty()) {
            throw ValidationException::withMessages([
                'coordinators' => 'Belum ada data Master Koordinator Lapangan yang aktif.',
            ]);
        }

        $assignedCount = DB::transaction(function () use ($courts, $coordinators): int {
            EventCourtAssignment::query()
                ->whereIn('event_court_id', $courts->pluck('id'))
                ->where('staff_type', 'field_coordinator')
                ->where('role', 'court_coordinator')
                ->delete();

            $count = 0;
            $coordPool = $coordinators->values();

            foreach ($courts as $index => $court) {
                if (isset($coordPool[$index])) {
                    EventCourtAssignment::query()->create([
                        'event_court_id' => $court->id,
                        'staff_type' => 'field_coordinator',
                        'staff_id' => $coordPool[$index]->id,
                        'role' => 'court_coordinator',
                    ]);
                    $count++;
                }
            }

            return $count;
        });

        return back()->with('success', "Berhasil menempatkan {$assignedCount} Koordinator Court secara merata pada arena pertandingan.");
    }

    private function ensureCanManageEventReferees(Request $request, Event $event): void
    {
        $user = $request->user();
        $eventAccessRole = $user ? $event->accessRoleFor($user) : null;
        $canManage = $user && (
            $user->hasAnyRole(['Super Admin', 'Admin', 'Arbitrase', 'Koordinator Lapangan', 'Pertandingan'])
            || in_array($eventAccessRole, [
                Event::AccessRoleResponsible,
                Event::AccessRoleAdmin,
            ], true)
            || ($eventAccessRole === Event::AccessRoleStaff && $user->hasRole('Panitera'))
        );

        abort_unless($canManage, 403);
    }

    /**
     * @param  iterable<int, EventCourtAssignment>  $assignments
     */
    private function recordAssignmentHistory(
        Event $event,
        EventCourt $eventCourt,
        iterable $assignments,
        string $action,
        ?string $changedByUserId,
        string $batchId,
        Carbon $occurredAt,
    ): void {
        foreach ($assignments as $assignment) {
            RefereeCourtAssignmentHistory::query()->create([
                'event_id' => $event->id,
                'event_court_id' => $eventCourt->id,
                'referee_id' => $assignment->staff_id,
                'changed_by_user_id' => $changedByUserId,
                'batch_id' => $batchId,
                'action' => $action,
                'role' => $assignment->role,
                'occurred_at' => $occurredAt,
            ]);
        }
    }

    private function qrExpiresAt(Event $event): Carbon
    {
        $eventExpiry = $event->end_date?->copy()->endOfDay()->addDay();

        return $eventExpiry && $eventExpiry->isAfter(now()->addDay())
            ? $eventExpiry
            : now()->addDay();
    }
}
