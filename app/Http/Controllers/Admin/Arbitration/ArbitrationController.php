<?php

namespace App\Http\Controllers\Admin\Arbitration;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Arbitration\StoreEventCourtAssignmentRequest;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\TournamentMatch;
use App\Services\EmbuParticipantDetails;
use App\Services\Referee\RefereeIdentity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ArbitrationController extends Controller
{
    /**
     * Display a listing of registered referees and judges.
     */
    public function referee(Request $request): Response
    {
        $activeEvent = $this->eventForRequest($request);
        $search = $request->string('search')->trim()->toString();
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $assignedReferees = $activeEvent instanceof Event
            ? $activeEvent->referees()
                ->select(['referees.id', 'referees.name', 'referees.dan_grade', 'referees.license_number', 'referees.certification_level', 'referees.region', 'referees.phone', 'referees.is_active'])
                ->when($search, fn ($query) => $query->where(fn ($query) => $query
                    ->where('referees.name', $likeOperator, "%{$search}%")
                    ->orWhere('referees.dan_grade', $likeOperator, "%{$search}%")
                    ->orWhere('referees.license_number', $likeOperator, "%{$search}%")
                    ->orWhere('referees.certification_level', $likeOperator, "%{$search}%")
                    ->orWhere('referees.region', $likeOperator, "%{$search}%")))
                ->get()
            : collect();

        $nationalA = $assignedReferees->filter(fn ($referee) => Str::contains(Str::lower((string) $referee->certification_level), ['nasional a', 'national a']))->count();
        $nationalB = $assignedReferees->filter(fn ($referee) => Str::contains(Str::lower((string) $referee->certification_level), ['nasional b', 'national b']))->count();

        $referees = $assignedReferees->map(fn ($referee) => [
            'id' => $referee->id,
            'name' => $referee->name,
            'dan_grade' => $referee->dan_grade ?: '-',
            'license' => $referee->certification_level ?: ($referee->license_number ?: 'Belum terverifikasi'),
            'region' => $referee->region ?: '-',
            'phone' => $referee->phone ?: '-',
            'role' => $referee->pivot->role,
            'is_active' => $referee->is_active,
        ])->values();

        $canManageEventReferees = $this->canManageEventStaff($request, $activeEvent);

        return Inertia::render('Admin/Arbitration/Referee', [
            'referees' => $referees,
            'stats' => [
                'total_referees' => $assignedReferees->count(),
                'national_a' => $nationalA,
                'national_b' => $nationalB,
                'regional' => $assignedReferees->count() - $nationalA - $nationalB,
            ],
            'filters' => [
                'search' => $search,
            ],
            'activeEvent' => $activeEvent?->only(['id', 'name']),
            'canManageEventReferees' => $canManageEventReferees,
        ]);
    }

    /**
     * Display court / tatami referee assignments.
     */
    public function assignment(Request $request): Response
    {
        $activeEvent = $this->eventForRequest($request);

        if ($activeEvent instanceof Event) {
            $activeEvent->load([
                'courts.assignments',
                'referees:id,name,dan_grade,is_active',
                'clerks:id,name,is_active',
                'fieldCoordinators:id,name,is_active',
            ]);
        }

        $staffNames = [
            'referee' => $activeEvent?->referees->pluck('name', 'id') ?? collect(),
            'clerk' => $activeEvent?->clerks->pluck('name', 'id') ?? collect(),
            'field_coordinator' => $activeEvent?->fieldCoordinators->pluck('name', 'id') ?? collect(),
        ];

        $tatamis = $activeEvent?->courts
            ->map(function ($court) use ($staffNames) {
                $assignments = $court->assignments->map(fn (EventCourtAssignment $assignment) => [
                    'id' => $assignment->id,
                    'staff_type' => $assignment->staff_type,
                    'staff_name' => $staffNames[$assignment->staff_type]->get($assignment->staff_id, 'Perangkat tidak tersedia'),
                    'role' => $assignment->role,
                ]);

                return [
                    'id' => $court->id,
                    'name' => $court->name,
                    'current_match' => $court->location ?: ($court->description ?: 'Belum ada jadwal pertandingan'),
                    'status' => $court->is_active ? 'Siap digunakan' : 'Tidak aktif',
                    'chief_referee' => $assignments->first(fn ($assignment) => $assignment['staff_type'] === 'referee' && $assignment['role'] === 'chief')['staff_name'] ?? 'Belum ditentukan',
                    'judges' => $assignments->filter(fn ($assignment) => $assignment['staff_type'] === 'referee' && $assignment['role'] !== 'chief')->map(fn ($assignment) => Str::title($assignment['role']).': '.$assignment['staff_name'])->values(),
                    'clerks' => $assignments->filter(fn ($assignment) => $assignment['staff_type'] === 'clerk')->map(fn ($assignment) => Str::title($assignment['role']).': '.$assignment['staff_name'])->values(),
                    'field_coordinators' => $assignments->filter(fn ($assignment) => $assignment['staff_type'] === 'field_coordinator')->map(fn ($assignment) => Str::title($assignment['role']).': '.$assignment['staff_name'])->values(),
                    'assignments' => $assignments,
                ];
            })
            ->values()
            ->all() ?? [];

        return Inertia::render('Admin/Arbitration/Assignment', [
            'activeEvent' => $activeEvent?->only(['id', 'name']),
            'tatamis' => $tatamis,
            'canManageEventStaff' => $this->canManageEventStaff($request, $activeEvent),
            'staffOptions' => [
                'referee' => $activeEvent?->referees->map(fn ($staff) => ['id' => $staff->id, 'name' => $staff->name])->values(),
                'clerk' => $activeEvent?->clerks->map(fn ($staff) => ['id' => $staff->id, 'name' => $staff->name])->values(),
                'field_coordinator' => $activeEvent?->fieldCoordinators->map(fn ($staff) => ['id' => $staff->id, 'name' => $staff->name])->values(),
            ],
        ]);
    }

    public function storeCourtAssignment(StoreEventCourtAssignmentRequest $request, EventCourt $court): RedirectResponse
    {
        $event = $this->eventForRequest($request);
        abort_unless($this->canManageEventStaff($request, $event) && $event?->is($court->event), 403);

        $validated = $request->validated();
        $relation = match ($validated['staff_type']) {
            'referee' => $event->referees(),
            'clerk' => $event->clerks(),
            'field_coordinator' => $event->fieldCoordinators(),
        };
        abort_unless($relation->whereKey($validated['staff_id'])->exists(), 404);

        EventCourtAssignment::updateOrCreate(
            ['event_court_id' => $court->id, 'staff_type' => $validated['staff_type'], 'staff_id' => $validated['staff_id']],
            ['role' => $validated['role']],
        );

        return back()->with('success', 'Perangkat berhasil ditugaskan ke lapangan.');
    }

    public function destroyCourtAssignment(Request $request, EventCourt $court, EventCourtAssignment $assignment): RedirectResponse
    {
        $event = $this->eventForRequest($request);
        abort_unless($this->canManageEventStaff($request, $event) && $event?->is($court->event) && $assignment->event_court_id === $court->id, 404);

        $assignment->delete();

        return back()->with('success', 'Penugasan perangkat lapangan dihapus.');
    }

    /**
     * Display the active Embu scoring sheet for the assigned referee and court.
     */
    public function scoring(
        Request $request,
        RefereeIdentity $refereeIdentity,
        EmbuParticipantDetails $participantDetails,
    ): Response {
        $activeEvent = $this->eventForRequest($request);
        $refereeSession = null;
        $user = $request->user();

        if ($activeEvent && $user?->hasRole('Wasit') && ! $user->hasAnyRole(['Super Admin', 'Admin'])) {
            $referee = $refereeIdentity->forEvent($user, $activeEvent);
            abort_unless($referee, 403);
            $courtIds = $activeEvent->courts()->pluck('id');
            $requestedCourtId = $request->string('court_id')->toString();
            $assignment = EventCourtAssignment::query()
                ->whereIn('event_court_id', $courtIds)
                ->where('staff_type', 'referee')
                ->where('staff_id', $referee->id)
                ->when($requestedCourtId !== '', fn ($query) => $query->where('event_court_id', $requestedCourtId))
                ->first();
            abort_unless($assignment, 403, 'Anda belum memiliki penugasan court pada event ini.');
            $role = RefereeCourtRole::tryFrom($assignment->role);
            abort_unless($role, 403, 'Posisi juri pada court belum valid.');
            $court = $activeEvent->courts()->findOrFail($assignment->event_court_id);
            $activeMatch = TournamentMatch::query()
                ->whereBelongsTo($activeEvent)
                ->whereBelongsTo($court, 'court')
                ->whereIn('status', ['ready', 'in_progress'])
                ->where('call_status', 'participants_called')
                ->with('matchCategory:id,name,type')
                ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
                ->orderByRaw('scheduled_start_at IS NULL')
                ->orderBy('scheduled_start_at')
                ->orderBy('match_sequence')
                ->first();
            $judgeScore = $activeMatch?->matchCategory?->type === 'embu'
                ? $activeMatch->embuJudgeScores()
                    ->where('tiebreak_round', 0)
                    ->where('judge_number', $role->judgeNumber())
                    ->first()
                : null;

            $refereeSession = [
                'referee_name' => $referee->name,
                'court_id' => $court->id,
                'court_name' => $court->name,
                'role_key' => $assignment->role,
                'role' => $role->label(),
                'judge_number' => $role->judgeNumber(),
                'is_checked_in' => RefereeAttendance::query()
                    ->whereBelongsTo($activeEvent)
                    ->whereBelongsTo($referee)
                    ->whereDate('attendance_date', now()->toDateString())
                    ->where('is_present', true)
                    ->exists()
                    && RefereeCourtAttendance::query()
                        ->whereBelongsTo($activeEvent)
                        ->whereBelongsTo($court, 'court')
                        ->whereBelongsTo($referee)
                        ->whereDate('attendance_date', now()->toDateString())
                        ->exists(),
                'active_match' => $activeMatch ? [
                    'id' => $activeMatch->id,
                    'category_name' => $activeMatch->matchCategory?->name,
                    'category_type' => $activeMatch->matchCategory?->type,
                    'sequence' => $activeMatch->match_sequence,
                    'round_label' => $activeMatch->round_label,
                    'participant_label' => $activeMatch->participant_label,
                    'red_label' => $activeMatch->red_label,
                    'blue_label' => $activeMatch->blue_label,
                    'scheduled_at' => $activeMatch->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                    'status' => $activeMatch->status,
                    'call_status' => $activeMatch->call_status,
                    'participant' => $participantDetails->forMatch($activeEvent, $activeMatch),
                    'score_update_url' => route('admin.arbitrase.scoring.embu.update', $activeMatch, false),
                ] : null,
                'score' => $judgeScore ? [
                    'aspect_scores' => $judgeScore->aspect_scores,
                    'completed_items' => $judgeScore->completed_items,
                    'technique_subtotal' => (float) $judgeScore->technique_subtotal,
                    'expression_subtotal' => (float) $judgeScore->expression_subtotal,
                    'total_score' => (float) $judgeScore->total_score,
                    'status' => $judgeScore->status,
                    'signature' => $judgeScore->signature,
                    'notes' => $judgeScore->notes,
                    'signed_at' => $judgeScore->signed_at?->toIso8601String(),
                    'updated_at' => $judgeScore->updated_at?->toIso8601String(),
                ] : null,
            ];
        }

        return Inertia::render('Admin/Arbitration/Scoring', [
            'activeEvent' => $activeEvent,
            'refereeSession' => $refereeSession,
        ]);
    }

    private function eventForRequest(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        return $tenantEvent instanceof Event
            ? $tenantEvent
            : Event::where('is_active', true)->first();
    }

    private function canManageEventStaff(Request $request, ?Event $event): bool
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
        ], true);
    }
}
