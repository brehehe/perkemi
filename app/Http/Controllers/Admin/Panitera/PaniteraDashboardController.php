<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\EventCourtAssignment;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PaniteraDashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request, EventContext $eventContext): Response
    {
        $event = $eventContext->eventFor($request);
        $event->load(['courts.assignments', 'clerks:id,name']);
        $clerkNames = $event->clerks->pluck('name', 'id');

        $matchModels = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where('is_bye', false)
            ->with(['matchCategory:id,name,type', 'court:id,name'])
            ->orderByRaw('scheduled_start_at IS NULL')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get();

        $courts = $event->courts->map(function ($court) use ($clerkNames, $matchModels): array {
            $clerks = $court->assignments
                ->where('staff_type', 'clerk')
                ->map(fn (EventCourtAssignment $assignment): array => [
                    'id' => $assignment->id,
                    'name' => $clerkNames->get($assignment->staff_id, 'Panitera tidak tersedia'),
                    'role' => Str::title(str_replace('_', ' ', $assignment->role)),
                ])->values();
            $courtMatches = $matchModels->where('event_court_id', $court->id);
            $activeMatch = $courtMatches->first(fn (TournamentMatch $match): bool => in_array($match->status, ['ready', 'in_progress'], true));

            return [
                'id' => $court->id,
                'name' => $court->name,
                'location' => $court->location,
                'is_active' => (bool) $court->is_active,
                'clerks' => $clerks,
                'total_matches' => $courtMatches->count(),
                'completed_matches' => $courtMatches->where('status', 'completed')->count(),
                'active_match' => $activeMatch ? [
                    'id' => $activeMatch->id,
                    'label' => "Partai #{$activeMatch->match_sequence} · {$activeMatch->matchCategory?->name}",
                ] : null,
            ];
        })->values();

        $matches = $matchModels
            ->map(fn (TournamentMatch $match): array => [
                'id' => $match->id,
                'category_name' => $match->matchCategory?->name,
                'category_type' => $match->matchCategory?->type,
                'court_id' => $match->event_court_id,
                'court' => $match->court?->name ?? 'Belum diplot',
                'round_label' => $match->round_label,
                'sequence' => $match->match_sequence,
                'participant' => $match->participant_label ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label])),
                'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                'status' => $match->status,
                'status_label' => match ($match->status) {
                    'ready' => 'Siap Dipanggil',
                    'in_progress' => 'Sedang Berlangsung',
                    'completed' => 'Selesai',
                    default => 'Menunggu',
                },
                'call_status' => $match->call_status,
                'call_status_label' => match ($match->call_status) {
                    'officials_called' => 'Ofisial Dipanggil',
                    'participants_called' => 'Peserta Dipanggil',
                    'completed' => 'Selesai',
                    default => 'Belum Dipanggil',
                },
                'is_placeholder' => (bool) ($match->metadata['placeholder'] ?? false),
            ]);

        return Inertia::render('Admin/Panitera/Dashboard', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'canManage' => $eventContext->canManage($request, $event),
            'stats' => [
                'total_matches' => $event->tournamentMatches()->where('is_bye', false)->count(),
                'completed_matches' => $event->tournamentMatches()->where('status', 'completed')->count(),
                'embu_scored' => $event->embuScores()->where('status', 'verified')->count(),
                'randori_scored' => $event->randoriScores()->where('status', 'verified')->count(),
            ],
            'courts' => $courts,
            'embuMatches' => $matches->where('category_type', 'embu')->values(),
            'randoriMatches' => $matches->where('category_type', 'randori')->values(),
        ]);
    }
}
