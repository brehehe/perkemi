<?php

namespace App\Http\Controllers\Referee;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Services\Panitera\EventContext;
use App\Services\Referee\RefereeIdentity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RefereeAttendanceHistoryController extends Controller
{
    public function __invoke(
        Request $request,
        EventContext $eventContext,
        RefereeIdentity $refereeIdentity,
    ): Response {
        $event = $eventContext->eventFor($request);
        $user = $request->user();
        abort_unless($user && $user->hasRole('Wasit'), 403);

        $referee = $refereeIdentity->forEvent($user, $event);
        abort_unless($referee, 403, 'Akun login belum ditautkan ke master Wasit pada event ini.');

        $event->load(['courts' => fn ($query) => $query->where('is_active', true)]);
        $courtNames = $event->courts->pluck('name', 'id');
        $courtLocations = $event->courts->pluck('location', 'id');

        $assignments = EventCourtAssignment::query()
            ->whereIn('event_court_id', $event->courts->modelKeys())
            ->where('staff_type', 'referee')
            ->where('staff_id', $referee->id)
            ->get();

        $eventAttendances = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->orderByDesc('attendance_date')
            ->orderByDesc('checked_in_at')
            ->get()
            ->map(fn (RefereeAttendance $att): array => [
                'id' => $att->id,
                'date' => $att->attendance_date?->translatedFormat('l, d F Y') ?? '—',
                'raw_date' => $att->attendance_date?->toDateString(),
                'is_present' => (bool) $att->is_present,
                'checked_in_at' => $att->checked_in_at?->translatedFormat('H:i:s') ?? ($att->is_present ? 'Tercatat' : '—'),
                'notes' => $att->notes,
                'status_label' => $att->is_present ? 'Hadir' : 'Tidak Hadir',
            ]);

        $courtAttendances = RefereeCourtAttendance::query()
            ->whereBelongsTo($event)
            ->where('referee_id', $referee->id)
            ->with('court:id,name,location')
            ->orderByDesc('attendance_date')
            ->orderByDesc('checked_in_at')
            ->get()
            ->map(fn (RefereeCourtAttendance $cAtt): array => [
                'id' => $cAtt->id,
                'court_id' => $cAtt->event_court_id,
                'court_name' => $cAtt->court?->name ?? $courtNames->get($cAtt->event_court_id, 'Court'),
                'court_location' => $cAtt->court?->location ?? $courtLocations->get($cAtt->event_court_id, '—'),
                'date' => $cAtt->attendance_date?->translatedFormat('l, d F Y') ?? '—',
                'raw_date' => $cAtt->attendance_date?->toDateString(),
                'checked_in_at' => $cAtt->checked_in_at?->translatedFormat('H:i:s') ?? '—',
                'notes' => $cAtt->notes,
            ]);

        $todayDate = now()->toDateString();
        $todayEventAttendance = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', $todayDate)
            ->first();

        $assignmentData = $assignments->map(fn (EventCourtAssignment $assignment): array => [
            'court_id' => $assignment->event_court_id,
            'court_name' => $courtNames->get($assignment->event_court_id),
            'court_location' => $courtLocations->get($assignment->event_court_id),
            'role' => $assignment->role,
            'role_label' => RefereeCourtRole::tryFrom($assignment->role)?->label() ?? $assignment->role,
        ])->values();

        return Inertia::render('Referee/AttendanceHistory', [
            'activeEvent' => $event->only(['id', 'name', 'slug', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'referee' => [
                'id' => $referee->id,
                'name' => $referee->name,
                'license_number' => $referee->license_number,
                'certification_level' => $referee->certification_level,
                'dan_grade' => $referee->dan_grade,
                'region' => $referee->region,
            ],
            'summary' => [
                'total_event_present' => $eventAttendances->where('is_present', true)->count(),
                'total_court_checkins' => $courtAttendances->count(),
                'today_present' => (bool) $todayEventAttendance?->is_present,
                'today_checked_in_at' => $todayEventAttendance?->checked_in_at?->translatedFormat('H:i'),
                'assigned_courts_count' => $assignments->count(),
            ],
            'eventAttendances' => $eventAttendances,
            'courtAttendances' => $courtAttendances,
            'assignments' => $assignmentData,
        ]);
    }
}
