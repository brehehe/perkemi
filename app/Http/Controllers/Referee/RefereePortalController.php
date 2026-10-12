<?php

namespace App\Http\Controllers\Referee;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use App\Services\Referee\RefereeIdentity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RefereePortalController extends Controller
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
        $courtAttendances = RefereeCourtAttendance::query()
            ->whereBelongsTo($event)
            ->where('referee_id', $referee->id)
            ->whereDate('attendance_date', now()->toDateString())
            ->get()
            ->keyBy('event_court_id');
        $eventAttendance = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', now()->toDateString())
            ->where('is_present', true)
            ->first();

        $assignmentData = $assignments->map(function (EventCourtAssignment $assignment) use ($courtNames, $courtLocations, $courtAttendances, $eventAttendance): array {
            $attendance = $courtAttendances->get($assignment->event_court_id);

            return [
                'court_id' => $assignment->event_court_id,
                'court_name' => $courtNames->get($assignment->event_court_id),
                'court_location' => $courtLocations->get($assignment->event_court_id),
                'role' => $assignment->role,
                'role_label' => RefereeCourtRole::tryFrom($assignment->role)?->label() ?? $assignment->role,
                'is_checked_in' => $eventAttendance !== null && $attendance !== null,
                'checked_in_at' => $attendance?->checked_in_at?->translatedFormat('d M Y, H:i'),
            ];
        })->values();
        $assignedCourtIds = $assignments->pluck('event_court_id');
        $matches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereIn('event_court_id', $assignedCourtIds)
            ->where('is_bye', false)
            ->whereIn('status', ['pending', 'ready', 'in_progress'])
            ->with(['matchCategory:id,name,type', 'court:id,name'])
            ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 WHEN status = 'ready' THEN 1 ELSE 2 END")
            ->orderByRaw('scheduled_start_at IS NULL')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->limit(12)
            ->get()
            ->map(fn (TournamentMatch $match): array => [
                'id' => $match->id,
                'court' => $match->court?->name,
                'category_name' => $match->matchCategory?->name,
                'category_type' => $match->matchCategory?->type,
                'round_label' => $match->round_label,
                'sequence' => $match->match_sequence,
                'participant' => $match->participant_label ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label])),
                'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                'status' => $match->status,
                'status_label' => match ($match->status) {
                    'in_progress' => 'Sedang Berlangsung',
                    'ready' => 'Siap Dipanggil',
                    default => 'Menunggu',
                },
            ]);

        return Inertia::render('Referee/Portal', [
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
            'attendance' => [
                'event_present' => $eventAttendance !== null,
                'event_checked_in_at' => $eventAttendance?->checked_in_at?->translatedFormat('d M Y, H:i'),
            ],
            'assignments' => $assignmentData,
            'matches' => $matches,
        ]);
    }
}
