<?php

namespace App\Http\Controllers\Referee;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\EmbuJudgeScore;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\TournamentMatch;
use App\Services\EmbuParticipantDetails;
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
        EmbuParticipantDetails $participantDetails,
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

        // Hanya tampilkan pertandingan yang SEDANG DINILAI saat ini untuk menjaga integritas & menghindari konspirasi
        $activeMatch = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereIn('event_court_id', $assignedCourtIds)
            ->whereIn('status', ['ready', 'in_progress'])
            ->where('call_status', 'participants_called')
            ->with(['matchCategory:id,name,type', 'court:id,name'])
            ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
            ->orderByRaw('scheduled_start_at IS NULL')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->first();

        $activeMatchData = $activeMatch ? [
            'id' => $activeMatch->id,
            'court_id' => $activeMatch->event_court_id,
            'court_name' => $activeMatch->court?->name,
            'category_name' => $activeMatch->matchCategory?->name,
            'category_type' => $activeMatch->matchCategory?->type,
            'round_label' => $activeMatch->round_label,
            'sequence' => $activeMatch->match_sequence,
            'participant' => $activeMatch->participant_label ?: implode(' vs ', array_filter([$activeMatch->red_label, $activeMatch->blue_label])),
            'scheduled_at' => $activeMatch->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'status' => $activeMatch->status,
            'status_label' => $activeMatch->status === 'in_progress' ? 'Sedang Berlangsung' : 'Siap Dinilai',
            'scoring_url' => route('admin.arbitrase.scoring', [
                'event_id' => $event->id,
                'court_id' => $activeMatch->event_court_id,
            ], false),
        ] : null;

        // Data pertandingan yang SUDAH selesai dinilai oleh wasit ini
        $evaluatedMatches = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->where('status', 'submitted')
            ->with([
                'court:id,name',
                'tournamentMatch:id,event_id,event_match_category_id,event_court_id,round_label,match_sequence,participant_label,metadata,participant_entry_id',
                'tournamentMatch.matchCategory:id,name,type',
            ])
            ->latest('updated_at')
            ->limit(30)
            ->get()
            ->map(function (EmbuJudgeScore $score) use ($event, $participantDetails): array {
                $match = $score->tournamentMatch;
                $details = $match ? $participantDetails->forMatch($event, $match) : [];
                $athleteNames = ! empty($details['athletes'])
                    ? collect($details['athletes'])->pluck('name')->join(' · ')
                    : ($match?->participant_label ?? '—');

                return [
                    'id' => $score->id,
                    'match_id' => $score->tournament_match_id,
                    'court' => $score->court?->name ?? '—',
                    'category_name' => $match?->matchCategory?->name ?? 'Embu',
                    'category_type' => $match?->matchCategory?->type ?? 'embu',
                    'sequence' => $match?->match_sequence ?? '—',
                    'round_label' => $match?->round_label ?? '—',
                    'participant' => $athleteNames,
                    'contingent' => $details['contingent_name'] ?? '—',
                    'technique_subtotal' => (float) $score->technique_subtotal,
                    'expression_subtotal' => (float) $score->expression_subtotal,
                    'total_score' => (float) $score->total_score,
                    'status' => 'submitted',
                    'status_label' => 'Selesai',
                    'evaluated_at' => $score->updated_at?->translatedFormat('d M Y, H:i') ?? '—',
                ];
            })
            ->values();

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
            'activeMatch' => $activeMatchData,
            'evaluatedMatches' => $evaluatedMatches,
            // Fallback backward compatibility
            'matches' => $evaluatedMatches,
        ]);
    }
}
