<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\TournamentMatch;
use App\Services\EmbuParticipantDetails;
use App\Services\Panitera\EventContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PaniteraCourtMonitorController extends Controller
{
    /** @var list<string> */
    private const Modes = ['arena', 'timer', 'result', 'officials'];

    public function __construct(private readonly EmbuParticipantDetails $participantDetails) {}

    public function show(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): Response {
        $event = $eventContext->eventFor($request);
        abort_unless($eventCourt->event_id === $event->id, 404);

        $requestedMode = $request->string('mode')->toString();
        $mode = in_array($requestedMode, self::Modes, true) ? $requestedMode : 'arena';

        return Inertia::render('Admin/Panitera/CourtMonitor', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue']),
            'court' => $eventCourt->only(['id', 'name', 'location']),
            'mode' => $mode,
            'monitor' => $this->monitorData($event, $eventCourt),
            'stateUrl' => route('admin.panitera.monitors.state', [
                'eventCourt' => $eventCourt,
                'event_id' => $event->id,
            ]),
        ]);
    }

    public function state(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
    ): JsonResponse {
        $event = $eventContext->eventFor($request);
        abort_unless($eventCourt->event_id === $event->id, 404);

        return response()->json($this->monitorData($event, $eventCourt));
    }

    /** @return array<string, mixed> */
    private function monitorData(Event $event, EventCourt $court): array
    {
        $relations = ['matchCategory:id,name,type', 'embuScores', 'randoriScore'];
        $baseQuery = fn () => TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($court, 'court')
            ->where('is_bye', false);

        $activeMatch = $baseQuery()
            ->whereIn('status', ['ready', 'in_progress'])
            ->with($relations)
            ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
            ->orderByDesc('called_at')
            ->first();

        $lastCompletedMatch = $baseQuery()
            ->where('status', 'completed')
            ->with($relations)
            ->latest('updated_at')
            ->first();

        $queue = $baseQuery()
            ->when($activeMatch, fn ($query) => $query->whereKeyNot($activeMatch->id))
            ->whereIn('status', ['pending', 'ready'])
            ->with('matchCategory:id,name,type')
            ->orderByRaw('scheduled_start_at IS NULL')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->limit(10)
            ->get()
            ->reject(fn (TournamentMatch $match): bool => (bool) ($match->metadata['placeholder'] ?? false))
            ->take(3)
            ->map(fn (TournamentMatch $match): array => $this->queueMatchData($match))
            ->values();

        $serverNow = now();

        return [
            'server_now' => $serverNow->toIso8601String(),
            'server_now_ms' => $serverNow->getTimestampMs(),
            'court_status' => $court->is_active ? 'active' : 'inactive',
            'active_match' => $activeMatch ? $this->matchData($event, $activeMatch) : null,
            'last_result' => $lastCompletedMatch ? $this->matchData($event, $lastCompletedMatch) : null,
            'queue' => $queue,
            'staff' => $this->staffData($event, $court),
            'progress' => [
                'total' => $baseQuery()->count(),
                'completed' => $baseQuery()->where('status', 'completed')->count(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function matchData(Event $event, TournamentMatch $match): array
    {
        $metadata = $match->metadata ?? [];
        $embuScore = $match->embuScores->first();
        $randoriScore = $match->randoriScore;
        $type = $match->matchCategory?->type;
        $elapsedMilliseconds = max(0, (int) $match->timer_elapsed_ms);

        if ($elapsedMilliseconds === 0 && $match->timer_elapsed_seconds > 0) {
            $elapsedMilliseconds = $match->timer_elapsed_seconds * 1000;
        }

        $durationSeconds = max(10, (int) data_get($metadata, 'panitera.timer_duration_seconds', 120));

        return [
            'id' => $match->id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $type,
            'round_label' => $match->round_label,
            'sequence' => $match->match_sequence,
            'pool' => $match->pool,
            'participant_label' => $match->participant_label,
            'participant' => $type === 'embu' ? $this->participantDetails->forMatch($event, $match) : null,
            'aka_label' => $match->red_label,
            'shiro_label' => $match->blue_label,
            'status' => $match->status,
            'status_label' => $this->statusLabel($match->status),
            'call_status' => $match->call_status,
            'call_status_label' => $this->callStatusLabel($match->call_status),
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'timer' => [
                'status' => $match->timer_status,
                'started_at' => $match->timer_started_at?->toIso8601String(),
                'started_at_ms' => $match->timer_started_at_ms ?: $match->timer_started_at?->getTimestampMs(),
                'elapsed_seconds' => (int) floor($elapsedMilliseconds / 1000),
                'elapsed_ms' => $elapsedMilliseconds,
                'version' => max(0, (int) $match->timer_version),
                'is_finished' => (bool) data_get($metadata, 'panitera.finished_at'),
                'finished_at' => data_get($metadata, 'panitera.finished_at'),
                'time_penalty' => data_get($metadata, 'panitera.time_penalty'),
                'direction' => in_array(data_get($metadata, 'panitera.timer_direction'), ['up', 'down'], true)
                    ? data_get($metadata, 'panitera.timer_direction')
                    : 'up',
                'duration_seconds' => $durationSeconds,
                'duration_ms' => $durationSeconds * 1000,
            ],
            'result' => $type === 'embu'
                ? $this->embuResultData($embuScore)
                : ($randoriScore ? [
                    'aka_total' => $randoriScore->aka_total,
                    'shiro_total' => $randoriScore->shiro_total,
                    'winner_corner' => $randoriScore->winner_corner,
                    'verified_at' => $randoriScore->verified_at?->translatedFormat('d M Y, H:i'),
                ] : null),
        ];
    }

    /** @return array<string, mixed> */
    private function queueMatchData(TournamentMatch $match): array
    {
        return [
            'id' => $match->id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $match->matchCategory?->type,
            'round_label' => $match->round_label,
            'sequence' => $match->match_sequence,
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('H:i'),
        ];
    }

    /** @return array<string, mixed>|null */
    private function embuResultData(?EmbuScore $score): ?array
    {
        if (! $score) {
            return null;
        }

        return [
            'judge_scores' => $score->judge_scores,
            'time_penalty' => (float) $score->time_penalty,
            'final_score' => (float) $score->final_score,
            'duration_seconds' => $score->duration_seconds,
            'verified_at' => $score->verified_at?->translatedFormat('d M Y, H:i'),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function staffData(Event $event, EventCourt $court): array
    {
        $event->loadMissing([
            'referees:id,name',
            'clerks:id,name',
            'fieldCoordinators:id,name',
        ]);
        $court->loadMissing('assignments');
        $eventPresentRefereeIds = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereDate('attendance_date', now()->toDateString())
            ->where('is_present', true)
            ->pluck('referee_id');
        $presentRefereeIds = $court->refereeAttendances()
            ->whereDate('attendance_date', now()->toDateString())
            ->whereIn('referee_id', $eventPresentRefereeIds)
            ->pluck('referee_id');
        $staffNames = [
            'referee' => $event->referees->pluck('name', 'id'),
            'clerk' => $event->clerks->pluck('name', 'id'),
            'field_coordinator' => $event->fieldCoordinators->pluck('name', 'id'),
        ];

        return $court->assignments
            ->map(fn (EventCourtAssignment $assignment): array => [
                'id' => $assignment->id,
                'type' => $assignment->staff_type,
                'type_label' => match ($assignment->staff_type) {
                    'referee' => 'Wasit / Juri',
                    'clerk' => 'Panitera',
                    'field_coordinator' => 'Koordinator Lapangan',
                    default => Str::title(str_replace('_', ' ', $assignment->staff_type)),
                },
                'name' => $staffNames[$assignment->staff_type]?->get($assignment->staff_id, 'Perangkat tidak tersedia'),
                'role' => $assignment->staff_type === 'referee'
                    ? (RefereeCourtRole::tryFrom($assignment->role)?->label() ?? Str::title(str_replace('_', ' ', $assignment->role)))
                    : Str::title(str_replace('_', ' ', $assignment->role)),
                'is_present' => $assignment->staff_type !== 'referee' || $presentRefereeIds->contains($assignment->staff_id),
            ])
            ->values()
            ->all();
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'ready' => 'Siap Dipanggil',
            'in_progress' => 'Sedang Berlangsung',
            'completed' => 'Selesai',
            default => 'Menunggu',
        };
    }

    private function callStatusLabel(string $status): string
    {
        return match ($status) {
            'officials_called' => 'Ofisial Dipanggil',
            'participants_called' => 'Peserta Dipanggil',
            'completed' => 'Selesai',
            default => 'Belum Dipanggil',
        };
    }
}
