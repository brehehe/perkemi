<?php

namespace App\Http\Controllers\Admin\Arbitration;

use App\Actions\Admin\Tournament\GenerateRefereeCourtPanelsAction;
use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAssignmentHistory;
use App\Models\RefereeCourtAttendance;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CourtCoordinatorController extends Controller
{
    public function index(Request $request, EventContext $eventContext): Response
    {
        $event = $eventContext->eventFor($request);
        $user = $request->user();

        $isSupervisor = $user?->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan', 'Arbitrase']) ?? false;

        // Resolve FieldCoordinator identity for user
        $fieldCoordinator = null;
        if ($user) {
            $fieldCoordinator = FieldCoordinator::query()
                ->where('is_active', true)
                ->where(function ($q) use ($user): void {
                    $q->whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
                        ->orWhere('coordinator_number', $user->nik_perkemi);
                })
                ->first();
        }

        // Check if assigned as coordinator to any court in this event
        $assignedCourtId = null;
        if ($fieldCoordinator) {
            $assignedCourtId = EventCourtAssignment::query()
                ->whereIn('event_court_id', $event->courts()->select('id'))
                ->where('staff_type', 'field_coordinator')
                ->where('staff_id', $fieldCoordinator->id)
                ->where('role', 'court_coordinator')
                ->value('event_court_id');
        }

        // Active courts for this event
        $allCourts = $event->courts()
            ->where('is_active', true)
            ->orderBy('order')
            ->orderBy('id')
            ->with(['assignments' => fn ($q) => $q->where('staff_type', 'field_coordinator')->where('role', 'court_coordinator')])
            ->get();

        $coordinatorMap = FieldCoordinator::query()
            ->whereIn('id', EventCourtAssignment::query()
                ->whereIn('event_court_id', $allCourts->pluck('id'))
                ->where('staff_type', 'field_coordinator')
                ->where('role', 'court_coordinator')
                ->pluck('staff_id'))
            ->get()
            ->keyBy('id');

        $courtsData = $allCourts->map(function (EventCourt $court) use ($coordinatorMap): array {
            $coordAssignment = $court->assignments->first();
            $coordinator = $coordAssignment ? $coordinatorMap->get($coordAssignment->staff_id) : null;

            return [
                'id' => $court->id,
                'name' => $court->name,
                'location' => $court->location,
                'access_code' => $court->access_code,
                'is_active' => (bool) $court->is_active,
                'coordinator' => $coordinator ? [
                    'id' => $coordinator->id,
                    'name' => $coordinator->name,
                    'coordinator_number' => $coordinator->coordinator_number,
                    'region' => $coordinator->region,
                    'phone' => $coordinator->phone,
                ] : null,
            ];
        });

        // Determine which court is being viewed
        $selectedCourtId = null;
        if ($isSupervisor) {
            $requestedCourtId = $request->string('court_id')->toString();
            if ($requestedCourtId && $allCourts->contains('id', $requestedCourtId)) {
                $selectedCourtId = $requestedCourtId;
            } elseif ($assignedCourtId && $allCourts->contains('id', $assignedCourtId)) {
                $selectedCourtId = $assignedCourtId;
            } else {
                $selectedCourtId = $allCourts->first()?->id;
            }
        } else {
            // Strictly locked to assigned court
            $selectedCourtId = $assignedCourtId;
        }

        $selectedCourt = $selectedCourtId ? $allCourts->firstWhere('id', $selectedCourtId) : null;

        $panelData = [];
        $reservesData = [];
        $categoriesData = [];
        $dutyCountsByReferee = collect();
        $today = now()->toDateString();

        if ($selectedCourt) {
            // 1. Current Panel for selected court
            $refereeAssignments = EventCourtAssignment::query()
                ->where('event_court_id', $selectedCourt->id)
                ->where('staff_type', 'referee')
                ->get();

            $courtRefereeIds = $refereeAssignments->pluck('staff_id')->unique();

            $courtReferees = Referee::query()
                ->whereIn('id', $courtRefereeIds)
                ->get()
                ->keyBy('id');

            // Today's court attendances (QR scans)
            $courtAttendances = RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->where('event_court_id', $selectedCourt->id)
                ->whereDate('attendance_date', $today)
                ->get()
                ->keyBy('referee_id');

            // Compute Duty Counts for all referees involved
            $historyQuery = RefereeCourtAssignmentHistory::query()
                ->where('event_id', $event->id)
                ->where('action', RefereeCourtAssignmentHistory::ActionAssigned);

            $courtHistoryCounts = (clone $historyQuery)
                ->where('event_court_id', $selectedCourt->id)
                ->selectRaw('referee_id, COUNT(*) as count')
                ->groupBy('referee_id')
                ->pluck('count', 'referee_id');

            $totalHistoryCounts = (clone $historyQuery)
                ->selectRaw('referee_id, COUNT(*) as count')
                ->groupBy('referee_id')
                ->pluck('count', 'referee_id');

            $activeRoleOrder = [
                RefereeCourtRole::Chief->value => 'Wasit Utama',
                RefereeCourtRole::RegionalOne->value => 'Wasit Pembantu 1 (Regional)',
                RefereeCourtRole::RegionalTwo->value => 'Wasit Pembantu 2 (Regional)',
                RefereeCourtRole::AssistantOne->value => 'Wasit Pembantu 3',
                RefereeCourtRole::AssistantTwo->value => 'Wasit Pembantu 4',
            ];

            $expiresAt = now()->addDays(7);
            $courtCheckInUrl = URL::temporarySignedRoute('wasit.check-in.court', $expiresAt, [
                'event' => $event,
                'eventCourt' => $selectedCourt,
            ]);

            $panelData = collect($activeRoleOrder)->map(function (string $roleLabel, string $roleKey) use (
                $refereeAssignments, $courtReferees, $courtAttendances, $courtHistoryCounts, $totalHistoryCounts, $event, $selectedCourt, $expiresAt
            ): array {
                $assignment = $refereeAssignments->firstWhere('role', $roleKey);
                $ref = $assignment ? $courtReferees->get($assignment->staff_id) : null;
                $att = $assignment ? $courtAttendances->get($assignment->staff_id) : null;

                return [
                    'id' => $assignment?->id,
                    'role' => $roleKey,
                    'role_label' => $roleLabel,
                    'check_in_url' => URL::temporarySignedRoute('wasit.check-in.court', $expiresAt, [
                        'event' => $event,
                        'eventCourt' => $selectedCourt,
                        'role' => $roleKey,
                    ]),
                    'referee' => $ref ? [
                        'id' => $ref->id,
                        'name' => $ref->name,
                        'dan_grade' => $ref->dan_grade,
                        'license_number' => $ref->license_number,
                        'certification_level' => $ref->certification_level,
                        'region' => $ref->region,
                        'profile_photo_url' => $ref->profile_photo_url ?? null,
                        'court_duty_count' => (int) ($courtHistoryCounts->get($ref->id) ?? 0),
                        'total_duty_count' => (int) ($totalHistoryCounts->get($ref->id) ?? 0),
                    ] : null,
                    'is_checked_in' => $att !== null,
                    'checked_in_at' => $att?->checked_in_at?->translatedFormat('H:i') ?? null,
                ];
            })->values()->all();

            $reservesData = $refereeAssignments
                ->where('role', 'reserve')
                ->map(function (EventCourtAssignment $assignment) use (
                    $courtReferees, $courtAttendances, $courtHistoryCounts, $totalHistoryCounts, $event, $selectedCourt, $expiresAt
                ): array {
                    $ref = $courtReferees->get($assignment->staff_id);
                    $att = $courtAttendances->get($assignment->staff_id);

                    return [
                        'id' => $assignment->id,
                        'role' => 'reserve',
                        'role_label' => 'Wasit Cadangan',
                        'check_in_url' => URL::temporarySignedRoute('wasit.check-in.court', $expiresAt, [
                            'event' => $event,
                            'eventCourt' => $selectedCourt,
                            'role' => 'reserve',
                        ]),
                        'referee' => $ref ? [
                            'id' => $ref->id,
                            'name' => $ref->name,
                            'dan_grade' => $ref->dan_grade,
                            'license_number' => $ref->license_number,
                            'certification_level' => $ref->certification_level,
                            'region' => $ref->region,
                            'court_duty_count' => (int) ($courtHistoryCounts->get($ref->id) ?? 0),
                            'total_duty_count' => (int) ($totalHistoryCounts->get($ref->id) ?? 0),
                        ] : null,
                        'is_checked_in' => $att !== null,
                        'checked_in_at' => $att?->checked_in_at?->translatedFormat('H:i') ?? null,
                    ];
                })->values()->all();

            // 2. Scheduled Match Categories on this Court
            $courtMatches = TournamentMatch::query()
                ->whereBelongsTo($event)
                ->where('event_court_id', $selectedCourt->id)
                ->where('is_bye', false)
                ->with([
                    'matchCategory:id,name,type,gender,order',
                    'redEntry.athlete.contingent:id,name',
                    'blueEntry.athlete.contingent:id,name',
                    'participantEntry.athlete.contingent:id,name',
                ])
                ->orderByRaw('scheduled_start_at IS NULL')
                ->orderBy('scheduled_start_at')
                ->orderBy('match_sequence')
                ->get();

            $matchesByCategory = $courtMatches->groupBy('event_match_category_id');

            $categoriesData = $matchesByCategory->map(function (Collection $matches, string $categoryId): array {
                $category = $matches->first()?->matchCategory;
                $earliestMatch = $matches->filter(fn ($m) => $m->scheduled_start_at !== null)->first();
                $total = $matches->count();
                $completed = $matches->where('status', 'completed')->count();

                return [
                    'id' => $categoryId,
                    'name' => $category?->name ?? 'Kategori Pertandingan',
                    'type' => $category?->type ?? 'randori',
                    'gender' => $category?->gender ?? 'campuran',
                    'total_matches' => $total,
                    'completed_matches' => $completed,
                    'is_completed' => $total > 0 && $completed >= $total,
                    'scheduled_time' => $earliestMatch?->scheduled_start_at?->translatedFormat('d M Y, H:i') ?? 'Jadwal belum ditentukan',
                    'matches' => $matches->map(function (TournamentMatch $m) use ($category): array {
                        $akaName = $m->redEntry?->athlete?->name ?: $m->red_label ?: 'AKA';
                        $akaContingent = $m->redEntry?->athlete?->contingent?->name ?: '';
                        $shiroName = $m->blueEntry?->athlete?->name ?: $m->blue_label ?: 'SHIRO';
                        $shiroContingent = $m->blueEntry?->athlete?->contingent?->name ?: '';

                        if ($category?->type === 'embu' && ($m->participant_label || $m->participantEntry)) {
                            $akaName = $m->participantEntry?->athlete?->name ?: $m->participant_label ?: 'Kontestan';
                            $akaContingent = $m->participantEntry?->athlete?->contingent?->name ?: '';
                        }

                        return [
                            'id' => $m->id,
                            'sequence' => $m->match_sequence,
                            'round_label' => $m->round_label,
                            'status' => $m->status,
                            'aka_name' => $akaName,
                            'aka_contingent' => $akaContingent,
                            'shiro_name' => $shiroName,
                            'shiro_contingent' => $shiroContingent,
                            'scheduled_time' => $m->scheduled_start_at?->translatedFormat('H:i') ?? '—',
                        ];
                    })->values()->all(),
                ];
            })->values()->all();
        }

        return Inertia::render('Admin/Arbitration/CourtCoordinator', [
            'activeEvent' => [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'venue' => $event->venue,
                'start_date' => $event->start_date?->translatedFormat('d M Y'),
                'end_date' => $event->end_date?->translatedFormat('d M Y'),
            ],
            'events' => $eventContext->accessibleEvents($request),
            'isSupervisor' => $isSupervisor,
            'isAssigned' => $selectedCourt !== null,
            'assignedCourtId' => $assignedCourtId,
            'selectedCourtId' => $selectedCourtId,
            'selectedCourt' => $selectedCourt ? [
                'id' => $selectedCourt->id,
                'name' => $selectedCourt->name,
                'location' => $selectedCourt->location,
                'access_code' => $selectedCourt->access_code,
                'check_in_url' => $courtCheckInUrl ?? null,
                'has_panel' => collect($panelData)->some(fn ($p) => $p['referee'] !== null),
                'panel_ready' => collect($panelData)->every(fn ($p) => $p['referee'] !== null && $p['is_checked_in']),
                'coordinator' => $selectedCourt->assignments
                    ->firstWhere('role', 'court_coordinator') ? [
                        'name' => $coordinatorMap->get($selectedCourt->assignments->firstWhere('role', 'court_coordinator')->staff_id)?->name ?? '—',
                        'coordinator_number' => $coordinatorMap->get($selectedCourt->assignments->firstWhere('role', 'court_coordinator')->staff_id)?->coordinator_number ?? '—',
                        'region' => $coordinatorMap->get($selectedCourt->assignments->firstWhere('role', 'court_coordinator')->staff_id)?->region ?? '—',
                    ] : null,
            ] : null,
            'courts' => $courtsData,
            'panel' => $panelData,
            'reserves' => $reservesData,
            'categories' => $categoriesData,
        ]);
    }

    public function generatePanel(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
        GenerateRefereeCourtPanelsAction $generator,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanOperateCourt($request, $event, $eventCourt);

        DB::transaction(function () use ($event, $eventCourt, $request, $generator): void {
            // Check present referees
            $presentRefereeIds = RefereeAttendance::query()
                ->whereBelongsTo($event)
                ->whereDate('attendance_date', now()->toDateString())
                ->where('is_present', true)
                ->pluck('referee_id');

            if ($presentRefereeIds->count() < 5) {
                throw ValidationException::withMessages([
                    'panel' => 'Dibutuhkan minimal 5 wasit yang hadir untuk membentuk panel court ini.',
                ]);
            }

            // Exclude referees actively serving in other courts (whether chief, assistant, or reserve)
            $otherCourtRefereeIds = EventCourtAssignment::query()
                ->where('event_court_id', '!=', $eventCourt->id)
                ->whereIn('event_court_id', $event->courts()->select('id'))
                ->where('staff_type', 'referee')
                ->pluck('staff_id')
                ->unique();

            $availableReferees = Referee::query()
                ->whereIn('id', $presentRefereeIds)
                ->whereNotIn('id', $otherCourtRefereeIds)
                ->where('is_active', true)
                ->get();

            if ($availableReferees->count() < 5) {
                // If not enough unique, use all present referees
                $availableReferees = Referee::query()
                    ->whereIn('id', $presentRefereeIds)
                    ->where('is_active', true)
                    ->get();
            }

            // Select 5-referee panel using anti-bias rules
            $panel = $generator->selectMatchPanel($availableReferees);

            $occurredAt = now();
            $batchId = (string) Str::uuid();

            // Clear old assignments for this court
            $oldAssignments = EventCourtAssignment::query()
                ->where('event_court_id', $eventCourt->id)
                ->where('staff_type', 'referee')
                ->get();

            if ($oldAssignments->isNotEmpty()) {
                foreach ($oldAssignments as $assignment) {
                    RefereeCourtAssignmentHistory::query()->create([
                        'event_id' => $event->id,
                        'event_court_id' => $eventCourt->id,
                        'referee_id' => $assignment->staff_id,
                        'changed_by_user_id' => $request->user()?->id,
                        'batch_id' => $batchId,
                        'action' => RefereeCourtAssignmentHistory::ActionRemoved,
                        'role' => $assignment->role,
                        'occurred_at' => $occurredAt,
                    ]);
                }

                EventCourtAssignment::query()
                    ->whereKey($oldAssignments->modelKeys())
                    ->delete();
            }

            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->where('event_court_id', $eventCourt->id)
                ->whereDate('attendance_date', now()->toDateString())
                ->delete();

            $newAssignments = collect();

            // Chief
            $newAssignments->push(EventCourtAssignment::query()->create([
                'event_court_id' => $eventCourt->id,
                'staff_type' => 'referee',
                'staff_id' => $panel['chief']->id,
                'role' => RefereeCourtRole::Chief->value,
            ]));

            // 4 Assistants
            $assistantRoles = [
                RefereeCourtRole::RegionalOne->value,
                RefereeCourtRole::RegionalTwo->value,
                RefereeCourtRole::AssistantOne->value,
                RefereeCourtRole::AssistantTwo->value,
            ];

            foreach ($panel['assistants'] as $index => $assistant) {
                $role = $assistantRoles[$index] ?? RefereeCourtRole::AssistantTwo->value;
                $newAssignments->push(EventCourtAssignment::query()->create([
                    'event_court_id' => $eventCourt->id,
                    'staff_type' => 'referee',
                    'staff_id' => $assistant->id,
                    'role' => $role,
                ]));
            }

            // Reserves (maksimal 2 personil cadangan per court agar tidak menumpuk seluruh wasit ke satu court)
            $selectedReserves = $panel['reserves']->take(2);
            foreach ($selectedReserves as $reserve) {
                $newAssignments->push(EventCourtAssignment::query()->create([
                    'event_court_id' => $eventCourt->id,
                    'staff_type' => 'referee',
                    'staff_id' => $reserve->id,
                    'role' => 'reserve',
                ]));
            }

            // Record history
            foreach ($newAssignments as $assignment) {
                RefereeCourtAssignmentHistory::query()->create([
                    'event_id' => $event->id,
                    'event_court_id' => $eventCourt->id,
                    'referee_id' => $assignment->staff_id,
                    'changed_by_user_id' => $request->user()?->id,
                    'batch_id' => $batchId,
                    'action' => RefereeCourtAssignmentHistory::ActionAssigned,
                    'role' => $assignment->role,
                    'occurred_at' => $occurredAt,
                ]);
            }
        });

        return back()->with('success', "Roster 5 Wasit untuk {$eventCourt->name} berhasil digenerate seimbang.");
    }

    public function rotatePanel(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
        GenerateRefereeCourtPanelsAction $generator,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanOperateCourt($request, $event, $eventCourt);

        $generator->rotateCourtPanel($eventCourt, $request->user()?->id);

        return back()->with('success', "Susunan wasit {$eventCourt->name} berhasil dirotasi untuk nomor tanding berikutnya.");
    }

    public function swapReferees(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanOperateCourt($request, $event, $eventCourt);

        $validated = $request->validate([
            'source_referee_id' => ['required', 'uuid', 'exists:referees,id'],
            'target_referee_id' => ['nullable', 'uuid', 'exists:referees,id', 'different:source_referee_id'],
            'target_role' => ['nullable', 'string', 'in:chief,regional_1,regional_2,assistant_1,assistant_2,reserve'],
        ]);

        if (empty($validated['target_referee_id']) && empty($validated['target_role'])) {
            throw ValidationException::withMessages([
                'swap' => 'Tentukan wasit target atau posisi target untuk pertukaran.',
            ]);
        }

        $message = DB::transaction(function () use ($event, $eventCourt, $validated, $request): string {
            $sourceAssignment = EventCourtAssignment::query()
                ->where('event_court_id', $eventCourt->id)
                ->where('staff_type', 'referee')
                ->where('staff_id', $validated['source_referee_id'])
                ->lockForUpdate()
                ->first();

            if (! $sourceAssignment) {
                throw ValidationException::withMessages([
                    'swap' => 'Wasit asal tidak terdaftar dalam penugasan court ini.',
                ]);
            }

            $sourceReferee = Referee::query()->find($sourceAssignment->staff_id);
            if (! $sourceReferee || ! $sourceReferee->is_active) {
                throw ValidationException::withMessages([
                    'swap' => "Wasit {$sourceReferee?->name} berstatus tidak aktif sehingga tidak dapat ditugaskan di arena (SOP Wasit 3.1).",
                ]);
            }

            $targetReferee = null;
            $batchId = (string) Str::uuid();
            $occurredAt = now();

            $targetAssignment = null;
            if (! empty($validated['target_referee_id'])) {
                $targetAssignment = EventCourtAssignment::query()
                    ->where('event_court_id', $eventCourt->id)
                    ->where('staff_type', 'referee')
                    ->where('staff_id', $validated['target_referee_id'])
                    ->lockForUpdate()
                    ->first();

                if (! $targetAssignment) {
                    throw ValidationException::withMessages([
                        'swap' => 'Wasit tujuan tidak terdaftar dalam penugasan court ini.',
                    ]);
                }

                $targetReferee = Referee::query()->find($targetAssignment->staff_id);
                if (! $targetReferee || ! $targetReferee->is_active) {
                    throw ValidationException::withMessages([
                        'swap' => "Wasit {$targetReferee?->name} berstatus tidak aktif sehingga tidak dapat ditugaskan di arena (SOP Wasit 3.1).",
                    ]);
                }
            } elseif (! empty($validated['target_role'])) {
                $targetAssignment = EventCourtAssignment::query()
                    ->where('event_court_id', $eventCourt->id)
                    ->where('staff_type', 'referee')
                    ->where('role', $validated['target_role'])
                    ->lockForUpdate()
                    ->first();

                if ($targetAssignment) {
                    $targetReferee = Referee::query()->find($targetAssignment->staff_id);
                    if ($targetReferee && ! $targetReferee->is_active) {
                        throw ValidationException::withMessages([
                            'swap' => "Wasit {$targetReferee->name} berstatus tidak aktif sehingga tidak dapat ditugaskan di arena (SOP Wasit 3.1).",
                        ]);
                    }
                }
            }

            // Validasi Kehadiran Hari Ini (SOP Wasit 3.1) bila pencatatan kehadiran tercatat pada event ini
            $hasAttendanceTracking = RefereeAttendance::query()
                ->whereBelongsTo($event)
                ->whereDate('attendance_date', now()->toDateString())
                ->exists();

            if ($hasAttendanceTracking) {
                $sourcePresent = RefereeAttendance::query()
                    ->whereBelongsTo($event)
                    ->whereDate('attendance_date', now()->toDateString())
                    ->where('referee_id', $sourceReferee->id)
                    ->where('is_present', true)
                    ->exists();

                if (! $sourcePresent) {
                    throw ValidationException::withMessages([
                        'swap' => "Wasit {$sourceReferee->name} belum terverifikasi hadir hari ini pada absensi SOP Wasit (3.1).",
                    ]);
                }

                if ($targetReferee) {
                    $targetPresent = RefereeAttendance::query()
                        ->whereBelongsTo($event)
                        ->whereDate('attendance_date', now()->toDateString())
                        ->where('referee_id', $targetReferee->id)
                        ->where('is_present', true)
                        ->exists();

                    if (! $targetPresent) {
                        throw ValidationException::withMessages([
                            'swap' => "Wasit {$targetReferee->name} belum terverifikasi hadir hari ini pada absensi SOP Wasit (3.1).",
                        ]);
                    }
                }
            }

            // Simulasi seluruh penugasan court ini pasca pertukaran
            $allCourtAssignments = EventCourtAssignment::query()
                ->where('event_court_id', $eventCourt->id)
                ->where('staff_type', 'referee')
                ->lockForUpdate()
                ->get();

            $simulatedRoles = [];
            foreach ($allCourtAssignments as $asn) {
                $simulatedRoles[$asn->staff_id] = $asn->role;
            }

            if ($targetAssignment && $targetAssignment->id !== $sourceAssignment->id) {
                $simulatedRoles[$sourceAssignment->staff_id] = $targetAssignment->role;
                $simulatedRoles[$targetAssignment->staff_id] = $sourceAssignment->role;
            } else {
                $newRole = $validated['target_role'] ?? $sourceAssignment->role;
                $simulatedRoles[$sourceAssignment->staff_id] = $newRole;
            }

            $refereeModels = Referee::query()
                ->whereIn('id', array_keys($simulatedRoles))
                ->get()
                ->keyBy('id');

            // 1. VALIDASI KUALIFIKASI WASIT UTAMA (W1) [SOP Wasit 3.3]
            $chiefId = null;
            foreach ($simulatedRoles as $refId => $role) {
                if ($role === RefereeCourtRole::Chief->value) {
                    $chiefId = $refId;
                    break;
                }
            }

            if ($chiefId && $refereeModels->has($chiefId)) {
                $newChief = $refereeModels->get($chiefId);
                $isQualified = GenerateRefereeCourtPanelsAction::isChiefQualified($newChief);

                if (! $isQualified) {
                    $hasQualifiedCandidate = $refereeModels->contains(
                        fn (Referee $r): bool => GenerateRefereeCourtPanelsAction::isChiefQualified($r)
                    );

                    if ($hasQualifiedCandidate) {
                        throw ValidationException::withMessages([
                            'swap' => "Pertukaran ditolak: Wasit {$newChief->name} ({$newChief->dan_grade}) belum memenuhi kualifikasi Wasit Utama (minimal IV DAN atau Wasit Nasional) sesuai ketentuan SOP Wasit (3.3).",
                        ]);
                    }
                }
            }

            // 2. VALIDASI ANTI-BIAS ASAL DAERAH: MAKSIMAL 2 WASIT DARI KOTA YANG SAMA DI TATAMI [SOP Wasit 3.2 & 3.3]
            $tatamiRoles = [
                RefereeCourtRole::Chief->value,
                RefereeCourtRole::RegionalOne->value,
                RefereeCourtRole::RegionalTwo->value,
                RefereeCourtRole::AssistantOne->value,
                RefereeCourtRole::AssistantTwo->value,
            ];

            $tatamiReferees = collect();
            foreach ($simulatedRoles as $refId => $role) {
                if (in_array($role, $tatamiRoles, true) && $refereeModels->has($refId)) {
                    $tatamiReferees->push($refereeModels->get($refId));
                }
            }

            $cityCounts = [];
            foreach ($tatamiReferees as $tatamiRef) {
                $city = GenerateRefereeCourtPanelsAction::normalizeCity($tatamiRef->region);
                $cityCounts[$city] = ($cityCounts[$city] ?? 0) + 1;
            }

            foreach ($cityCounts as $city => $count) {
                if ($count > 2) {
                    throw ValidationException::withMessages([
                        'swap' => "Pertukaran ditolak: Dalam satu susunan 5 wasit tatami, maksimal hanya boleh 2 wasit dari daerah yang sama ({$city}: {$count} orang) sesuai ketentuan anti-bias SOP Wasit (3.3).",
                    ]);
                }
            }

            // 3. VALIDASI BENTURAN KEPENTINGAN DENGAN ATLET BERTANDING [SOP Wasit 3.3 & 4]
            $activeMatch = TournamentMatch::query()
                ->where('event_court_id', $eventCourt->id)
                ->whereIn('status', ['in_progress', 'ongoing', 'calling'])
                ->with(['redEntry.athlete.contingent', 'blueEntry.athlete.contingent', 'participantEntry.athlete.contingent'])
                ->first();

            if ($activeMatch) {
                $competingRegions = collect([
                    $activeMatch->redEntry?->athlete?->contingent?->name,
                    $activeMatch->blueEntry?->athlete?->contingent?->name,
                    $activeMatch->participantEntry?->athlete?->contingent?->name,
                ])->filter()->map(fn ($c) => GenerateRefereeCourtPanelsAction::normalizeCity($c))->unique();

                foreach ($tatamiReferees as $tatamiRef) {
                    $refCity = GenerateRefereeCourtPanelsAction::normalizeCity($tatamiRef->region);
                    if ($competingRegions->contains($refCity)) {
                        throw ValidationException::withMessages([
                            'swap' => "Pertukaran ditolak karena benturan kepentingan: Wasit {$tatamiRef->name} berasal dari daerah yang sama ({$tatamiRef->region}) dengan atlet/kontingen yang sedang bertanding di arena saat ini (SOP Wasit 3.3 & 4).",
                        ]);
                    }
                }
            }

            // Eksekusi mutasi role di database
            $affectedRefereeIds = [$sourceAssignment->staff_id];

            if ($targetAssignment && $targetAssignment->id !== $sourceAssignment->id) {
                $sourceRole = $sourceAssignment->role;
                $targetRole = $targetAssignment->role;

                $sourceAssignment->update(['role' => $targetRole]);
                $targetAssignment->update(['role' => $sourceRole]);

                $affectedRefereeIds[] = $targetAssignment->staff_id;

                RefereeCourtAssignmentHistory::query()->create([
                    'event_id' => $event->id,
                    'event_court_id' => $eventCourt->id,
                    'referee_id' => $sourceAssignment->staff_id,
                    'changed_by_user_id' => $request->user()?->id,
                    'batch_id' => $batchId,
                    'action' => RefereeCourtAssignmentHistory::ActionAssigned,
                    'role' => $targetRole,
                    'occurred_at' => $occurredAt,
                ]);

                RefereeCourtAssignmentHistory::query()->create([
                    'event_id' => $event->id,
                    'event_court_id' => $eventCourt->id,
                    'referee_id' => $targetAssignment->staff_id,
                    'changed_by_user_id' => $request->user()?->id,
                    'batch_id' => $batchId,
                    'action' => RefereeCourtAssignmentHistory::ActionAssigned,
                    'role' => $sourceRole,
                    'occurred_at' => $occurredAt,
                ]);
            } else {
                $newRole = $validated['target_role'] ?? $sourceAssignment->role;
                $sourceAssignment->update(['role' => $newRole]);

                RefereeCourtAssignmentHistory::query()->create([
                    'event_id' => $event->id,
                    'event_court_id' => $eventCourt->id,
                    'referee_id' => $sourceAssignment->staff_id,
                    'changed_by_user_id' => $request->user()?->id,
                    'batch_id' => $batchId,
                    'action' => RefereeCourtAssignmentHistory::ActionAssigned,
                    'role' => $newRole,
                    'occurred_at' => $occurredAt,
                ]);
            }

            // Reset check-in QR code hari ini untuk wasit yang bertukar posisi agar wajib scan ulang di posisi barunya (SOP Wasit 3.4)
            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->where('event_court_id', $eventCourt->id)
                ->whereDate('attendance_date', now()->toDateString())
                ->whereIn('referee_id', $affectedRefereeIds)
                ->delete();

            $sourceName = $sourceReferee?->name ?? 'Wasit';
            $targetName = $targetReferee?->name;

            if ($targetName) {
                return "Posisi {$sourceName} dan {$targetName} berhasil ditukar sesuai ketentuan SOP Wasit (3.3). Wasit yang berpindah posisi wajib memindai ulang QR code posisi barunya sebelum menilai pertandingan.";
            }

            return "Posisi {$sourceName} berhasil dipindahkan sesuai ketentuan SOP Wasit (3.3). Wasit wajib memindai ulang QR code posisi barunya sebelum menilai pertandingan.";
        });

        return back()->with('success', $message);
    }

    public function resetDutyCount(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanOperateCourt($request, $event, $eventCourt);

        $scope = $request->input('scope', 'court'); // 'court' atau 'all'

        DB::transaction(function () use ($event, $eventCourt, $scope): void {
            $query = RefereeCourtAssignmentHistory::query()
                ->where('event_id', $event->id)
                ->where('action', RefereeCourtAssignmentHistory::ActionAssigned);

            if ($scope === 'court') {
                $query->where('event_court_id', $eventCourt->id);
            }

            // Soft delete seluruh record jam terbang terkait
            $query->delete();
        });

        $targetLabel = $scope === 'all' ? "seluruh Court di {$event->name}" : $eventCourt->name;

        return back()->with('success', "Jam terbang wasit untuk {$targetLabel} berhasil direset ke 0x (disimpan aman dalam arsip soft delete).");
    }

    public function resetPanel(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $this->ensureCanOperateCourt($request, $event, $eventCourt);

        DB::transaction(function () use ($event, $eventCourt, $request): void {
            $assignments = EventCourtAssignment::query()
                ->where('event_court_id', $eventCourt->id)
                ->where('staff_type', 'referee')
                ->lockForUpdate()
                ->get();

            if ($assignments->isEmpty()) {
                return;
            }

            $batchId = (string) Str::uuid();
            $occurredAt = now();

            foreach ($assignments as $assignment) {
                RefereeCourtAssignmentHistory::query()->create([
                    'event_id' => $event->id,
                    'event_court_id' => $eventCourt->id,
                    'referee_id' => $assignment->staff_id,
                    'changed_by_user_id' => $request->user()?->id,
                    'batch_id' => $batchId,
                    'action' => RefereeCourtAssignmentHistory::ActionReset,
                    'role' => $assignment->role,
                    'occurred_at' => $occurredAt,
                ]);
            }

            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->where('event_court_id', $eventCourt->id)
                ->whereDate('attendance_date', now()->toDateString())
                ->delete();

            EventCourtAssignment::query()
                ->whereKey($assignments->modelKeys())
                ->delete();
        });

        return back()->with('success', "Penugasan wasit pada {$eventCourt->name} berhasil direset. Riwayat tugas dan seluruh nilai pertandingan tetap aman.");
    }

    private function ensureCanOperateCourt(Request $request, Event $event, EventCourt $court): void
    {
        abort_unless($court->event_id === $event->id, 404);

        $user = $request->user();
        if ($user?->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan', 'Arbitrase'])) {
            return;
        }

        // Check if assigned coordinator
        $coordinator = FieldCoordinator::query()
            ->where('is_active', true)
            ->where(function ($q) use ($user): void {
                $q->whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
                    ->orWhere('coordinator_number', $user->nik_perkemi);
            })
            ->first();

        abort_unless($coordinator, 403, 'Akun Anda tidak memiliki hak akses sebagai Koordinator Court.');

        $isAssigned = EventCourtAssignment::query()
            ->where('event_court_id', $court->id)
            ->where('staff_type', 'field_coordinator')
            ->where('staff_id', $coordinator->id)
            ->where('role', 'court_coordinator')
            ->exists();

        abort_unless($isAssigned, 403, 'Anda hanya dapat mengelola court yang ditugaskan kepada Anda.');
    }
}
