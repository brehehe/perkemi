<?php

namespace App\Http\Controllers\Admin\Tournament;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Tournament\UpdateRefereeAttendanceRequest;
use App\Http\Requests\Admin\Tournament\UpdateRefereeCourtPanelRequest;
use App\Http\Requests\Admin\Tournament\UpsertRefereeAccountRequest;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAssignmentHistory;
use App\Models\RefereeCourtAttendance;
use App\Models\Role;
use App\Models\User;
use App\Services\Panitera\EventContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EventRefereeController extends Controller
{
    public function index(Request $request, EventContext $eventContext): Response
    {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        $today = now()->toDateString();
        $event->load([
            'referees' => fn ($query) => $query
                ->with('user:id,name,email')
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
            ->get(['id', 'name', 'email'])
            ->keyBy(fn (User $user): string => mb_strtolower($user->email));
        $courtNames = $event->courts->pluck('name', 'id');
        $assignmentsByReferee = EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts->modelKeys())
            ->where('staff_type', 'referee')
            ->get()
            ->groupBy('staff_id');
        $refereeNames = $event->referees->pluck('name', 'id');
        $expiresAt = $this->qrExpiresAt($event);

        $referees = $event->referees->map(function (Referee $referee) use ($assignmentsByReferee, $courtNames, $legacyUsers, $today): array {
            $attendance = $referee->attendances
                ->first(fn (RefereeAttendance $attendance): bool => $attendance->attendance_date?->toDateString() === $today);
            $account = $referee->user
                ?? $legacyUsers->get(mb_strtolower((string) $referee->email));

            return [
                'id' => $referee->id,
                'name' => $referee->name,
                'email' => $referee->email,
                'license_number' => $referee->license_number,
                'certification_level' => $referee->certification_level,
                'dan_grade' => $referee->dan_grade,
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
                ] : null,
                'assignments' => $assignmentsByReferee->get($referee->id, collect())
                    ->map(fn (EventCourtAssignment $assignment): array => [
                        'court_id' => $assignment->event_court_id,
                        'court' => $courtNames->get($assignment->event_court_id),
                        'role' => RefereeCourtRole::tryFrom($assignment->role)?->label() ?? $assignment->role,
                    ])->values(),
            ];
        })->values();
        $presentRefereeIds = $referees->where('is_present', true)->pluck('id');

        $courts = $event->courts->map(function (EventCourt $court) use ($event, $expiresAt, $presentRefereeIds, $refereeNames): array {
            $refereeAssignments = $court->assignments
                ->where('staff_type', 'referee')
                ->keyBy('role');
            $courtAttendances = $court->refereeAttendances->keyBy('referee_id');
            $panelComplete = collect(RefereeCourtRole::values())
                ->every(fn (string $role): bool => $refereeAssignments->has($role));
            $panelReady = $panelComplete && $refereeAssignments
                ->every(fn (EventCourtAssignment $assignment): bool => $presentRefereeIds->contains($assignment->staff_id)
                    && $courtAttendances->has($assignment->staff_id));

            return [
                'id' => $court->id,
                'name' => $court->name,
                'location' => $court->location,
                'check_in_url' => URL::temporarySignedRoute('wasit.check-in.court', $expiresAt, [
                    'event' => $event,
                    'eventCourt' => $court,
                ]),
                'panel_complete' => $panelComplete,
                'panel_ready' => $panelReady,
                'has_panel' => $refereeAssignments->isNotEmpty(),
                'panel' => collect(RefereeCourtRole::cases())->map(function (RefereeCourtRole $role) use ($refereeAssignments, $courtAttendances, $presentRefereeIds, $refereeNames): array {
                    $assignment = $refereeAssignments->get($role->value);
                    $refereeId = $assignment?->staff_id;

                    return [
                        'role' => $role->value,
                        'role_label' => $role->label(),
                        'referee_id' => $refereeId,
                        'referee_name' => $refereeId ? $refereeNames->get($refereeId) : null,
                        'court_present' => $refereeId
                            ? $presentRefereeIds->contains($refereeId) && $courtAttendances->has($refereeId)
                            : false,
                        'court_checked_in_at' => $refereeId
                            ? $courtAttendances->get($refereeId)?->checked_in_at?->translatedFormat('d M Y, H:i')
                            : null,
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

        return Inertia::render('Admin/Tournament/EventReferees', [
            'activeEvent' => $event->only(['id', 'name', 'slug', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'referees' => $referees,
            'courts' => $courts,
            'roles' => RefereeCourtRole::options(),
            'eventCheckInUrl' => URL::temporarySignedRoute('wasit.check-in.event', $expiresAt, ['event' => $event]),
            'qrExpiresAt' => $expiresAt->translatedFormat('d M Y, H:i'),
            'refereeLoginUrl' => route('wasit.login'),
            'today' => $today,
            'stats' => [
                'total' => $referees->count(),
                'present' => $referees->where('is_present', true)->count(),
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
        $eventContext->ensureCanManage($request, $event);
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

    public function resetCourtPanel(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
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

        return back()->with('success', "Panel wasit {$eventCourt->name} berhasil direset. Kelima wasit dapat dipilih kembali.");
    }

    public function upsertAccount(
        UpsertRefereeAccountRequest $request,
        Referee $referee,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($event->referees()->whereKey($referee->id)->exists(), 404);
        $validated = $request->validated();

        DB::transaction(function () use ($event, $referee, $validated): void {
            $user = $referee->user;

            if (! $user && $referee->email && mb_strtolower($referee->email) === mb_strtolower($validated['email'])) {
                $user = User::query()->where('email', $validated['email'])->first();
            }

            $user ??= new User;
            $user->fill([
                'name' => $referee->name,
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);
            $user->email_verified_at ??= now();
            $user->save();
            $user->assignRole(Role::findOrCreate('Wasit', 'web'));
            $event->users()->syncWithoutDetaching([
                $user->id => ['access_role' => Event::AccessRoleStaff],
            ]);
            $referee->update([
                'user_id' => $user->id,
                'email' => $validated['email'],
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
        $eventContext->ensureCanManage($request, $event);
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
