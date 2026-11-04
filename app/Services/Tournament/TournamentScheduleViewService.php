<?php

namespace App\Services\Tournament;

use App\Models\Event;
use App\Models\TournamentMatch;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TournamentScheduleViewService
{
    /**
     * Build the view dataset for the Tournament Schedule board.
     *
     * @param  Collection<int, array<string, mixed>>  $accessibleEvents
     * @return array<string, mixed>
     */
    public function buildViewData(Request $request, ?Event $activeEvent, Collection $accessibleEvents, bool $canManageSchedule): array
    {
        $courts = $activeEvent instanceof Event
            ? $activeEvent->courts()
                ->where('is_active', true)
                ->orderBy('order')
                ->get(['id', 'name', 'order'])
                ->map(fn ($court) => [
                    'id' => $court->id,
                    'name' => $court->name,
                    'order' => (int) $court->order,
                ])->values()
            : collect();

        $sessions = $activeEvent instanceof Event
            ? $activeEvent->rundowns()
                ->where('is_match_session', true)
                ->orderBy('date')
                ->orderBy('order')
                ->get()
                ->map(fn ($session) => [
                    'id' => $session->id,
                    'name' => $session->name,
                    'date' => $session->date?->format('Y-m-d'),
                    'date_formatted' => $session->date?->translatedFormat('d F Y'),
                    'start_time' => $session->date?->format('H:i'),
                    'end_time' => $session->end_time?->format('H:i'),
                    'order' => (int) $session->order,
                ])->values()
            : collect();

        $scheduledMatches = $activeEvent instanceof Event
            ? $activeEvent->tournamentMatches()
                ->where('is_bye', false)
                ->whereNotNull('scheduled_start_at')
                ->with([
                    'matchCategory:id,name,type,order',
                    'court:id,name,order',
                    'rundown:id,name',
                    'redEntry.athlete.contingent:id,name',
                    'blueEntry.athlete.contingent:id,name',
                    'participantEntry.athlete.contingent:id,name',
                ])
                ->orderBy('scheduled_start_at')
                ->orderBy('match_sequence')
                ->get()
            : collect();

        $detector = app(TournamentScheduleConflictDetector::class);
        $analysis = $detector->detectAndAnnotate($scheduledMatches);
        $matches = $analysis['matches'];
        $conflictSummary = $analysis['summary'];

        $unscheduledMatchesList = $activeEvent?->tournamentMatches()
            ->where('is_bye', false)
            ->whereNull('scheduled_start_at')
            ->with([
                'matchCategory:id,name,type',
                'redEntry.athlete.contingent:id,name',
                'blueEntry.athlete.contingent:id,name',
                'participantEntry.athlete.contingent:id,name',
            ])
            ->orderBy('match_sequence')
            ->get()
            ->map(function (TournamentMatch $match): array {
                $meta = is_array($match->metadata) ? $match->metadata : [];
                $isEmbu = $match->matchCategory?->type === 'embu';
                $contingent = $isEmbu
                    ? ($meta['contingent_name'] ?? $meta['city'] ?? $match->participantEntry?->athlete?->contingent?->name)
                    : ($meta['red']['contingent_name'] ?? $meta['red']['city'] ?? $match->redEntry?->athlete?->contingent?->name);

                $athletes = [];
                if ($isEmbu && ! empty($meta['members'])) {
                    $athletes = $meta['members'];
                } elseif (! $isEmbu) {
                    if ($match->redEntry?->athlete?->name) {
                        $athletes[] = $match->redEntry->athlete->name;
                    }
                    if ($match->blueEntry?->athlete?->name) {
                        $athletes[] = $match->blueEntry->athlete->name;
                    }
                }

                return [
                    'id' => $match->id,
                    'category_id' => $match->event_match_category_id,
                    'category_name' => $match->matchCategory?->name,
                    'category_type' => $match->matchCategory?->type,
                    'round_label' => $match->round_label,
                    'sequence' => $match->match_sequence,
                    'participant' => $match->participant_label
                        ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label])),
                    'contingent_name' => $contingent,
                    'athlete_names' => $athletes,
                    'athlete_name' => ! empty($athletes) ? implode(' & ', $athletes) : null,
                ];
            })->values() ?? collect();

        $drawingsPublished = $activeEvent?->tournamentDrawings()
            ->whereIn('status', ['published', 'in_progress', 'completed'])
            ->exists() ?? false;

        $categories = $activeEvent instanceof Event
            ? $activeEvent->matchCategories()
                ->where('is_active', true)
                ->orderBy('order')
                ->get(['id', 'name', 'type', 'order'])
                ->map(function ($cat) use ($scheduledMatches, $unscheduledMatchesList) {
                    $catMatches = $scheduledMatches->where('event_match_category_id', $cat->id);
                    $unschedCount = $unscheduledMatchesList->where('category_id', $cat->id)->count();
                    $courtNames = $catMatches->pluck('court.name')->filter()->unique()->values()->all();

                    return [
                        'id' => $cat->id,
                        'name' => $cat->name,
                        'type' => $cat->type,
                        'scheduled_count' => $catMatches->count(),
                        'unscheduled_count' => $unschedCount,
                        'total_count' => $catMatches->count() + $unschedCount,
                        'courts' => $courtNames,
                        'primary_court_id' => $catMatches->first()?->event_court_id,
                    ];
                })
                ->filter(fn ($cat) => $cat['total_count'] > 0)
                ->values()
            : collect();

        return [
            'activeEvent' => $activeEvent?->only(['id', 'name', 'venue', 'city', 'start_date', 'end_date', 'status', 'is_active']),
            'events' => $accessibleEvents,
            'courts' => $courts,
            'sessions' => $sessions,
            'categories' => $categories,
            'matches' => $matches,
            'unscheduledMatches' => $unscheduledMatchesList,
            'conflictSummary' => $conflictSummary,
            'settings' => $activeEvent ? [
                'match_duration_minutes' => (int) $activeEvent->match_duration_minutes,
                'minimum_rest_minutes' => (int) $activeEvent->minimum_rest_minutes,
            ] : null,
            'summary' => [
                'scheduled_matches' => $matches->count(),
                'unscheduled_matches' => $unscheduledMatchesList->count(),
                'categories' => $scheduledMatches->pluck('event_match_category_id')->unique()->count(),
                'courts' => $courts->count(),
            ],
            'drawingsPublished' => $drawingsPublished,
            'scheduleIsLocked' => false,
            'canManageSchedule' => $canManageSchedule,
        ];
    }
}
