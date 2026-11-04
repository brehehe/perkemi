<?php

namespace App\Services\Tournament;

use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentDrawing;
use App\Services\TournamentDrawingGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class TournamentDrawingViewService
{
    public function __construct(private TournamentDrawingGenerator $generator) {}

    /**
     * Build the view dataset for the Tournament Drawing page.
     *
     * @param  Collection<int, array<string, mixed>>  $accessibleEvents
     * @return array<string, mixed>
     */
    public function buildViewData(Request $request, ?Event $activeEvent, Collection $accessibleEvents, bool $canManageDrawing): array
    {
        $prechecks = $activeEvent instanceof Event ? $this->generator->precheck($activeEvent) : collect();
        $drawings = $activeEvent instanceof Event
            ? $activeEvent->tournamentDrawings()->get()->keyBy('event_match_category_id')
            : collect();

        $matchStats = $activeEvent instanceof Event
            ? $activeEvent->tournamentMatches()
                ->selectRaw('event_match_category_id, 
                    count(*) as total_nodes, 
                    count(case when is_bye = false then 1 end) as total_non_bye,
                    count(case when is_bye = true then 1 end) as total_byes,
                    count(case when is_bye = false and scheduled_start_at is not null then 1 end) as scheduled,
                    count(case when is_bye = false and scheduled_start_at is null then 1 end) as unscheduled,
                    min(scheduled_start_at) as earliest_start,
                    max(scheduled_start_at) as latest_start')
                ->groupBy('event_match_category_id')
                ->get()
                ->keyBy('event_match_category_id')
            : collect();

        $categoryCourts = $activeEvent instanceof Event
            ? $activeEvent->tournamentMatches()
                ->whereNotNull('scheduled_start_at')
                ->whereNotNull('event_court_id')
                ->with('court:id,name')
                ->get(['id', 'event_match_category_id', 'event_court_id'])
                ->groupBy('event_match_category_id')
                ->map(fn ($matches) => $matches->pluck('court.name')->unique()->filter()->implode(', '))
            : collect();

        $categories = $prechecks->map(function (array $check) use ($drawings, $matchStats, $categoryCourts): array {
            $drawing = $drawings->get($check['id']);
            $stats = $matchStats->get($check['id']);
            $totalNodes = (int) ($stats->total_nodes ?? 0);
            $totalNonBye = (int) ($stats->total_non_bye ?? 0);
            $totalByes = (int) ($stats->total_byes ?? 0);
            $scheduledMatches = (int) ($stats->scheduled ?? 0);
            $unscheduledMatches = (int) ($stats->unscheduled ?? 0);
            $isGenerated = $drawing !== null && in_array($drawing->status, ['generated', 'published', 'in_progress', 'completed']);
            $percent = $totalNonBye > 0 ? (int) round(($scheduledMatches / $totalNonBye) * 100) : 0;
            $earliestStart = ! empty($stats->earliest_start) ? Carbon::parse($stats->earliest_start) : null;
            $latestStart = ! empty($stats->latest_start) ? Carbon::parse($stats->latest_start) : null;
            $scheduleRange = null;
            if ($earliestStart && $latestStart) {
                $scheduleRange = $earliestStart->isSameDay($latestStart)
                    ? "{$earliestStart->translatedFormat('d M Y')}, {$earliestStart->format('H:i')}–{$latestStart->format('H:i')}"
                    : "{$earliestStart->translatedFormat('d M H:i')} – {$latestStart->translatedFormat('d M H:i')}";
            } elseif ($earliestStart) {
                $scheduleRange = $earliestStart->translatedFormat('d M Y, H:i');
            }

            return [
                ...collect($check)->except('participants')->all(),
                'type_label' => ucfirst($check['type']),
                'quota' => $check['capacity'],
                'drawing_status' => $drawing?->status ?? 'not_generated',
                'drawing_id' => $drawing?->id,
                'is_generated' => $isGenerated,
                'total_nodes_count' => $totalNodes,
                'total_matches_count' => $totalNonBye > 0 ? $totalNonBye : $totalNodes,
                'non_bye_matches_count' => $totalNonBye,
                'bye_matches_count' => $totalByes,
                'scheduled_matches_count' => $scheduledMatches,
                'unscheduled_matches_count' => $unscheduledMatches,
                'scheduled_percent' => $percent,
                'has_unscheduled_matches' => $unscheduledMatches > 0,
                'court_names' => $categoryCourts->get($check['id']),
                'schedule_range_formatted' => $scheduleRange,
            ];
        })->values();

        $selectedCategoryId = $request->string('category')->toString() ?: ($categories->first()['id'] ?? null);
        $selectedCategory = $activeEvent instanceof Event && $selectedCategoryId
            ? $activeEvent->matchCategories()->where('is_active', true)->find($selectedCategoryId)
            : null;

        $participants = $selectedCategory instanceof EventMatchCategory
            ? $this->generator->participantsFor($activeEvent, $selectedCategory)
            : collect();

        $contestants = $participants->map(fn (array $participant, int $index) => [
            'id' => $participant['key'],
            'entry_id' => $participant['entry_id'],
            'seed' => $index + 1,
            'name' => $participant['label'],
            'contingent' => $participant['contingent_name'],
            'city' => $participant['city'],
            'members' => $participant['members'] ?? [],
        ])->values();

        if ($selectedCategory && $selectedCategory->type === 'randori') {
            $this->generator->syncCategoryByes($selectedCategory);
        }

        $selectedDrawing = $selectedCategory
            ? TournamentDrawing::query()
                ->whereBelongsTo($activeEvent)
                ->where('event_match_category_id', $selectedCategory->id)
                ->with([
                    'matches.court:id,name',
                    'matches.rundown:id,name',
                    'matches.randoriScore',
                    'matches.redEntry.athlete.contingent:id,name',
                    'matches.blueEntry.athlete.contingent:id,name',
                ])
                ->first()
            : null;

        $matches = $selectedDrawing?->matches->map(fn ($match) => [
            'id' => $match->id,
            'phase' => $match->phase,
            'round_label' => $match->round_label,
            'pool' => $match->pool,
            'sequence' => $match->match_sequence,
            'position' => $match->bracket_position,
            'red_label' => $match->red_label,
            'blue_label' => $match->blue_label,
            'aka_label' => $match->red_label,
            'shiro_label' => $match->blue_label,
            'aka_contingent' => $match->metadata['red']['contingent_name'] ?? $match->metadata['red']['city'] ?? $match->redEntry?->athlete?->contingent?->name,
            'shiro_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->metadata['blue']['city'] ?? $match->blueEntry?->athlete?->contingent?->name,
            'red_contingent' => $match->metadata['red']['contingent_name'] ?? $match->metadata['red']['city'] ?? $match->redEntry?->athlete?->contingent?->name,
            'blue_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->metadata['blue']['city'] ?? $match->blueEntry?->athlete?->contingent?->name,
            'participant_label' => $match->participant_label,
            'is_bye' => (bool) $match->is_bye,
            'is_ready' => ! ($match->metadata['placeholder'] ?? false),
            'status' => $match->status,
            'court' => $match->court?->name,
            'session' => $match->rundown?->name,
            'scheduled_start' => $match->scheduled_start_at?->format('Y-m-d H:i'),
            'scheduled_start_formatted' => $match->scheduled_start_at?->translatedFormat('d M, H:i'),
            'scheduled_end_formatted' => $match->scheduled_end_at?->format('H:i'),
            'metadata' => $match->metadata,
            'score' => $match->randoriScore ? [
                'winner_corner' => $match->randoriScore->winner_corner,
                'aka_total' => $match->randoriScore->aka_total,
                'shiro_total' => $match->randoriScore->shiro_total,
                'is_locked' => $match->randoriScore->locked_at !== null,
            ] : null,
        ])->values() ?? collect();

        $scheduleCourts = $activeEvent instanceof Event
            ? $activeEvent->courts()->where('is_active', true)->get(['id', 'name'])->map(fn ($court) => [
                'id' => $court->id,
                'name' => $court->name,
            ])->values()
            : collect();

        $scheduleSessions = $activeEvent instanceof Event
            ? $activeEvent->rundowns()->where('is_match_session', true)->orderBy('date')->get()->map(fn ($session) => [
                'id' => $session->id,
                'name' => $session->name,
                'date' => $session->date?->format('Y-m-d'),
                'date_formatted' => $session->date?->translatedFormat('d F Y'),
                'start_time' => $session->date?->format('H:i'),
                'end_time' => $session->end_time?->format('H:i'),
            ])->values()
            : collect();

        $scheduledMatchesQuery = $activeEvent instanceof Event
            ? $activeEvent->tournamentMatches()
                ->whereNotNull('scheduled_start_at')
                ->with([
                    'matchCategory:id,name,type',
                    'court:id,name',
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
        $scheduleAnalysis = $detector->detectAndAnnotate($scheduledMatchesQuery);
        $eventSchedule = $scheduleAnalysis['matches'];
        $scheduleConflictSummary = $scheduleAnalysis['summary'];

        $workflowStatus = match (true) {
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'in_progress') => 'in_progress',
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'completed') => 'completed',
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'published') => 'published',
            $drawings->contains(fn (TournamentDrawing $drawing) => $drawing->status === 'generated') => 'generated',
            default => 'draft',
        };

        $generatedCategoriesCount = $drawings->whereIn('status', ['generated', 'published', 'in_progress', 'completed'])->count();
        $ungeneratedCategoriesCount = max(0, $categories->count() - $generatedCategoriesCount);
        $totalNonByeMatches = $activeEvent ? (int) $activeEvent->tournamentMatches()->where('is_bye', false)->count() : 0;
        $totalScheduledMatches = $activeEvent ? (int) $activeEvent->tournamentMatches()->where('is_bye', false)->whereNotNull('scheduled_start_at')->count() : 0;
        $totalUnscheduledMatches = max(0, $totalNonByeMatches - $totalScheduledMatches);

        return [
            'activeEvent' => $activeEvent?->only(['id', 'name', 'venue', 'city', 'start_date', 'end_date', 'status', 'is_active']),
            'events' => $accessibleEvents,
            'categories' => $categories,
            'selectedCategory' => $selectedCategory?->id,
            'contestants' => $contestants,
            'drawing' => $selectedDrawing ? [
                'id' => $selectedDrawing->id,
                'status' => $selectedDrawing->status,
                'format' => $selectedDrawing->bracket_type,
                'participant_count' => $selectedDrawing->participant_count,
                'contingent_count' => $selectedDrawing->contingent_count,
                'skip_reason' => $selectedDrawing->skip_reason,
            ] : null,
            'matches' => $matches,
            'scheduleCourts' => $scheduleCourts,
            'scheduleSessions' => $scheduleSessions,
            'eventSchedule' => $eventSchedule,
            'scheduleConflictSummary' => $scheduleConflictSummary,
            'workflow' => [
                'status' => $workflowStatus,
                'total_categories' => $categories->count(),
                'ready_categories' => $categories->where('is_eligible', true)->count(),
                'merge_categories' => $categories->where('is_eligible', false)->count(),
                'generated_categories' => $generatedCategoriesCount,
                'ungenerated_categories' => $ungeneratedCategoriesCount,
                'skipped_categories' => $drawings->where('status', 'skipped')->count(),
                'total_matches' => $activeEvent?->tournamentMatches()->count() ?? 0,
                'total_non_bye_matches' => $totalNonByeMatches,
                'total_scheduled_matches' => $totalScheduledMatches,
                'total_unscheduled_matches' => $totalUnscheduledMatches,
            ],
            'settings' => $activeEvent ? [
                'match_duration_minutes' => (int) $activeEvent->match_duration_minutes,
                'minimum_rest_minutes' => (int) $activeEvent->minimum_rest_minutes,
                'minimum_entries_per_category' => (int) $activeEvent->minimum_entries_per_category,
                'minimum_contingents_per_category' => (int) $activeEvent->minimum_contingents_per_category,
                'courts_count' => $activeEvent->courts()->where('is_active', true)->count(),
                'sessions_count' => $activeEvent->rundowns()->where('is_match_session', true)->count(),
            ] : null,
            'capacityStats' => $this->computeScheduleCapacityStats($activeEvent),
            'canManageDrawing' => $canManageDrawing,
        ];
    }

    /**
     * Compute event-wide slot capacity, per-court remaining slots, and date schedule limits.
     *
     * @return array<string, mixed>
     */
    public function computeScheduleCapacityStats(?Event $activeEvent): array
    {
        if (! $activeEvent instanceof Event) {
            return [
                'total_capacity_slots' => 0,
                'total_used_slots' => 0,
                'total_remaining_slots' => 0,
                'utilization_percent' => 0,
                'match_duration_minutes' => 7,
                'courts' => [],
                'dates' => [],
            ];
        }

        $duration = max(1, (int) $activeEvent->match_duration_minutes);
        $courts = $activeEvent->courts()->where('is_active', true)->orderBy('order')->orderBy('id')->get();
        $sessions = $activeEvent->rundowns()->where('is_match_session', true)->orderBy('date')->orderBy('order')->orderBy('id')->get();

        $allSlots = collect();
        foreach ($sessions as $session) {
            $start = CarbonImmutable::instance($session->date);
            $end = $session->end_time ? CarbonImmutable::instance($session->end_time) : $start->addHours(4);
            for ($cursor = $start; $cursor->addMinutes($duration)->lessThanOrEqualTo($end); $cursor = $cursor->addMinutes($duration)) {
                foreach ($courts as $court) {
                    $allSlots->push([
                        'court_id' => $court->id,
                        'court_name' => $court->name,
                        'session_id' => $session->id,
                        'session_name' => $session->name,
                        'date' => $cursor->format('Y-m-d'),
                        'start' => $cursor,
                        'end' => $cursor->addMinutes($duration),
                    ]);
                }
            }
        }

        $scheduledMatches = $activeEvent->tournamentMatches()
            ->where('is_bye', false)
            ->whereNotNull('scheduled_start_at')
            ->whereNotNull('event_court_id')
            ->with(['court:id,name', 'rundown:id,name', 'matchCategory:id,name,type'])
            ->orderBy('scheduled_start_at')
            ->get();

        $totalCapacitySlots = $allSlots->count();
        $totalUsedSlots = $scheduledMatches->count();
        $totalRemainingSlots = max(0, $totalCapacitySlots - $totalUsedSlots);
        $overallUtilization = $totalCapacitySlots > 0 ? (int) round(($totalUsedSlots / $totalCapacitySlots) * 100) : 0;

        // Per-court capacity & remaining slots
        $courtStats = $courts->map(function ($court) use ($allSlots, $scheduledMatches, $duration) {
            $courtCapacity = $allSlots->where('court_id', $court->id)->count();
            $courtMatches = $scheduledMatches->where('event_court_id', $court->id);
            $courtUsed = $courtMatches->count();
            $courtRemaining = max(0, $courtCapacity - $courtUsed);
            $utilization = $courtCapacity > 0 ? (int) round(($courtUsed / $courtCapacity) * 100) : 0;
            $first = $courtMatches->sortBy('scheduled_start_at')->first();
            $last = $courtMatches->sortBy('scheduled_start_at')->last();

            $lastEnd = null;
            if ($last) {
                $lastEnd = $last->scheduled_end_at
                    ? $last->scheduled_end_at->format('H:i')
                    : ($last->scheduled_start_at ? $last->scheduled_start_at->addMinutes($duration)->format('H:i') : null);
            }

            return [
                'court_id' => $court->id,
                'court_name' => $court->name,
                'capacity_slots' => $courtCapacity,
                'used_slots' => $courtUsed,
                'remaining_slots' => $courtRemaining,
                'utilization_percent' => $utilization,
                'first_match_time' => $first?->scheduled_start_at?->translatedFormat('d M, H:i'),
                'last_match_end' => $lastEnd,
                'status_label' => $courtRemaining > 0 ? "Tersisa {$courtRemaining} Slot" : 'Kapasitas Penuh',
            ];
        })->values();

        // Per-date schedule limits & estimates
        $dates = $sessions->pluck('date')->map(fn ($d) => $d->format('Y-m-d'))->unique()->values();
        $dateStats = $dates->map(function ($dateStr) use ($sessions, $allSlots, $scheduledMatches, $courts, $duration) {
            $dateSessions = $sessions->filter(fn ($s) => $s->date->format('Y-m-d') === $dateStr);
            $dateSlots = $allSlots->where('date', $dateStr);
            $dateMatches = $scheduledMatches->filter(fn ($m) => $m->scheduled_start_at->format('Y-m-d') === $dateStr);
            $dateCapacity = $dateSlots->count();
            $dateUsed = $dateMatches->count();
            $dateRemaining = max(0, $dateCapacity - $dateUsed);
            $dateUtilization = $dateCapacity > 0 ? (int) round(($dateUsed / $dateCapacity) * 100) : 0;

            $firstMatch = $dateMatches->sortBy('scheduled_start_at')->first();
            $lastMatch = $dateMatches->sortBy('scheduled_start_at')->last();

            $latestRundownEnd = $dateSessions->map(fn ($s) => $s->end_time ?: $s->date->addHours(4))->sortDesc()->first();

            $lastMatchEndAt = null;
            if ($lastMatch) {
                $lastMatchEndAt = $lastMatch->scheduled_end_at
                    ? CarbonImmutable::instance($lastMatch->scheduled_end_at)
                    : CarbonImmutable::instance($lastMatch->scheduled_start_at)->addMinutes($duration);
            }

            $bufferMinutes = null;
            if ($lastMatchEndAt && $latestRundownEnd) {
                $bufferMinutes = (int) $lastMatchEndAt->diffInMinutes($latestRundownEnd, false);
            }

            // Per court on this date
            $courtsOnDate = $courts->map(function ($court) use ($dateMatches, $duration) {
                $cm = $dateMatches->where('event_court_id', $court->id);
                $first = $cm->sortBy('scheduled_start_at')->first();
                $last = $cm->sortBy('scheduled_start_at')->last();

                $lastEndTime = null;
                if ($last) {
                    $lastEndTime = $last->scheduled_end_at
                        ? $last->scheduled_end_at->format('H:i')
                        : ($last->scheduled_start_at ? $last->scheduled_start_at->addMinutes($duration)->format('H:i') : null);
                }

                return [
                    'court_id' => $court->id,
                    'court_name' => $court->name,
                    'matches_count' => $cm->count(),
                    'first_start' => $first?->scheduled_start_at?->format('H:i'),
                    'last_end' => $lastEndTime,
                ];
            })->values();

            $carbonDate = Carbon::parse($dateStr);

            return [
                'date' => $dateStr,
                'date_formatted' => $carbonDate->translatedFormat('l, d F Y'),
                'date_short' => $carbonDate->translatedFormat('d M Y'),
                'capacity_slots' => $dateCapacity,
                'used_slots' => $dateUsed,
                'remaining_slots' => $dateRemaining,
                'utilization_percent' => $dateUtilization,
                'first_match_time' => $firstMatch?->scheduled_start_at?->format('H:i'),
                'last_match_end' => $lastMatchEndAt?->format('H:i'),
                'rundown_end' => $latestRundownEnd?->format('H:i'),
                'buffer_minutes' => $bufferMinutes,
                'courts' => $courtsOnDate,
            ];
        })->values();

        return [
            'total_capacity_slots' => $totalCapacitySlots,
            'total_used_slots' => $totalUsedSlots,
            'total_remaining_slots' => $totalRemainingSlots,
            'utilization_percent' => $overallUtilization,
            'match_duration_minutes' => $duration,
            'courts' => $courtStats,
            'dates' => $dateStats,
        ];
    }
}
