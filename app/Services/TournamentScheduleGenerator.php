<?php

namespace App\Services;

use App\Models\Event;
use App\Models\TournamentMatch;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentScheduleGenerator
{
    public function schedule(Event $event): void
    {
        DB::transaction(function () use ($event): void {
            $this->scheduleWithinTransaction($event);
        });
    }

    private function scheduleWithinTransaction(Event $event): void
    {
        $courts = $event->courts()
            ->where('is_active', true)
            ->orderBy('order')
            ->orderBy('id')
            ->get();
        $sessions = $event->rundowns()
            ->where('is_match_session', true)
            ->orderBy('date')
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        if ($courts->isEmpty() || $sessions->isEmpty()) {
            return;
        }

        $duration = max(1, (int) $event->match_duration_minutes);
        // Sesuai kebutuhan panitia: jangan ada slot kosong di jadwal pertandingan.
        // Penjadwalan otomatis mengisi setiap slot berurutan tanpa jeda jeda kosong.
        // Panitia/koordinator tetap dapat menggeser/menukar jadwal secara manual jika diperlukan.
        $rest = max(0, (int) $event->minimum_rest_minutes);
        $breaks = $this->getEventBreaks($event);
        $slots = $this->slots($courts, $sessions, $duration, $breaks);

        $event->tournamentMatches()
            ->whereHas('drawing', fn ($query) => $query->where('status', 'generated'))
            ->update([
                'event_court_id' => null,
                'rundown_id' => null,
                'scheduled_start_at' => null,
                'scheduled_end_at' => null,
            ]);

        $matches = $event->tournamentMatches()
            ->whereHas('drawing', fn ($query) => $query->where('status', 'generated'))
            ->where('is_bye', false)
            ->with('matchCategory:id,type,order')
            ->get()
            ->sortBy(fn (TournamentMatch $match): array => [
                $match->matchCategory?->type === 'embu' ? 0 : 1,
                $match->matchCategory?->order ?? PHP_INT_MAX,
                $match->event_match_category_id,
                $match->match_sequence,
            ])
            ->values();

        $usedSlotIndexes = [];
        $athleteAvailableAt = [];
        $athleteBusyUntil = [];
        $notBefore = null;

        foreach (['embu', 'randori'] as $matchType) {
            $typeMatches = $matches
                ->filter(fn (TournamentMatch $match): bool => $match->matchCategory?->type === $matchType)
                ->values();

            if ($typeMatches->isEmpty()) {
                continue;
            }

            $result = $this->scheduleMatchType(
                $typeMatches,
                $slots,
                $usedSlotIndexes,
                $athleteAvailableAt,
                $athleteBusyUntil,
                $rest,
                $notBefore,
            );

            if (! $result['complete']) {
                break;
            }

            if ($matchType === 'embu') {
                $this->resequenceEmbuMatches($typeMatches);
            }
        }
    }

    /**
     * Retrieve official break rundowns (e.g. ISHOMA / Istirahat) for this event.
     *
     * @return Collection<int, mixed>
     */
    public function getEventBreaks(Event $event): Collection
    {
        return $event->rundowns()
            ->where('is_match_session', false)
            ->where(function ($sub): void {
                $sub->whereRaw('LOWER(type) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(type) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%ishoma%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%istirahat%'])
                    ->orWhereRaw('LOWER(name) LIKE ?', ['%break%']);
            })
            ->orderBy('date')
            ->orderBy('order')
            ->get();
    }

    /**
     * @param  Collection<int, mixed>  $courts
     * @param  Collection<int, mixed>  $sessions
     * @param  Collection<int, mixed>|null  $breaks
     * @return Collection<int, array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function slots(Collection $courts, Collection $sessions, int $duration, ?Collection $breaks = null): Collection
    {
        $slots = collect();

        $breakIntervals = ($breaks ?? collect())->map(function ($b) {
            $bStart = CarbonImmutable::instance($b->date);
            $bEnd = $b->end_time ? CarbonImmutable::instance($b->end_time) : $bStart->addHour();

            return ['start' => $bStart, 'end' => $bEnd];
        });

        foreach ($sessions as $session) {
            $start = CarbonImmutable::instance($session->date);
            $end = $session->end_time
                ? CarbonImmutable::instance($session->end_time)
                : $start->addHours(4);

            for ($cursor = $start; $cursor->addMinutes($duration)->lessThanOrEqualTo($end); $cursor = $cursor->addMinutes($duration)) {
                $slotStart = $cursor;
                $slotEnd = $cursor->addMinutes($duration);

                $overlapsBreak = $breakIntervals->contains(function ($b) use ($slotStart, $slotEnd) {
                    return $slotEnd->greaterThan($b['start']) && $slotStart->lessThan($b['end']);
                });

                if ($overlapsBreak) {
                    continue;
                }

                foreach ($courts->values() as $courtPriority => $court) {
                    $slots->push([
                        'court_id' => $court->id,
                        'court_priority' => $courtPriority,
                        'rundown_id' => $session->id,
                        'start' => $slotStart,
                        'end' => $slotEnd,
                    ]);
                }
            }
        }

        return $slots;
    }

    /**
     * @param  Collection<int, TournamentMatch>  $matches
     * @param  Collection<int, array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>  $slots
     * @param  array<int, true>  $usedSlotIndexes
     * @param  array<string, CarbonImmutable>  $athleteAvailableAt
     * @param  array<string, CarbonImmutable>  $athleteBusyUntil
     * @return array{complete: bool, last_end: CarbonImmutable|null}
     */
    private function scheduleMatchType(
        Collection $matches,
        Collection $slots,
        array &$usedSlotIndexes,
        array &$athleteAvailableAt,
        array &$athleteBusyUntil,
        int $rest,
        ?CarbonImmutable $notBefore,
    ): array {
        $matchesByCategory = $matches
            ->groupBy('event_match_category_id')
            ->map(fn (Collection $categoryMatches) => $categoryMatches->sortBy('match_sequence')->values())
            ->values();
        $lastEnd = null;

        // Try passes prioritizing contiguous allocation without internal gaps ("Slot kosong") on active courts:
        // 1. Contiguous allocation with full rest (15 mins) and no fallback.
        // 2. Contiguous allocation with direct non-concurrent availability (no playing two courts at once).
        // 3. Contiguous allocation with fallback to candidate with longest rest.
        // 4. (Last resort only) Non-contiguous allocation if court session capacity is constrained.
        $passes = [
            ['preferContiguous' => true, 'useDirectBusy' => false, 'allowFallback' => false],
            ['preferContiguous' => true, 'useDirectBusy' => true, 'allowFallback' => false],
            ['preferContiguous' => true, 'useDirectBusy' => true, 'allowFallback' => true],
            ['preferContiguous' => false, 'useDirectBusy' => true, 'allowFallback' => true],
        ];

        while ($matchesByCategory->isNotEmpty()) {
            $selectedCategoryIndex = null;
            $selectedAssignments = null;

            foreach ($passes as $pass) {
                foreach ($matchesByCategory as $categoryIndex => $categoryMatches) {
                    $assignments = $this->findConsecutiveCategoryBlock(
                        $categoryMatches,
                        $slots,
                        $usedSlotIndexes,
                        $athleteAvailableAt,
                        $athleteBusyUntil,
                        $notBefore,
                        $pass['preferContiguous'],
                        $pass['useDirectBusy'],
                        $rest,
                        $pass['allowFallback'],
                    );

                    if ($assignments === null) {
                        continue;
                    }

                    $candidateStart = $assignments->first()['slot']['start'];

                    if ($selectedAssignments === null) {
                        $selectedCategoryIndex = $categoryIndex;
                        $selectedAssignments = $assignments;

                        continue;
                    }

                    $currentSelectedStart = $selectedAssignments->first()['slot']['start'];

                    if ($candidateStart->lessThan($currentSelectedStart)) {
                        $selectedCategoryIndex = $categoryIndex;
                        $selectedAssignments = $assignments;
                    } elseif ($candidateStart->equalTo($currentSelectedStart)) {
                        // Tie-breaker: pick category with fewer potential cross-court clashes
                        $candidateClashCount = $this->countCrossCourtClashes($categoryMatches, $assignments, $athleteAvailableAt);
                        $currentClashCount = $this->countCrossCourtClashes(
                            $matchesByCategory[$selectedCategoryIndex],
                            $selectedAssignments,
                            $athleteAvailableAt
                        );

                        if ($candidateClashCount < $currentClashCount) {
                            $selectedCategoryIndex = $categoryIndex;
                            $selectedAssignments = $assignments;
                        }
                    }
                }

                if ($selectedCategoryIndex !== null && $selectedAssignments !== null) {
                    break;
                }
            }

            if ($selectedCategoryIndex === null || $selectedAssignments === null) {
                return ['complete' => false, 'last_end' => $lastEnd];
            }

            foreach ($selectedAssignments as $assignment) {
                $match = $assignment['match'];
                $slot = $assignment['slot'];
                $usedSlotIndexes[$assignment['slot_index']] = true;
                $match->update([
                    'event_court_id' => $slot['court_id'],
                    'rundown_id' => $slot['rundown_id'],
                    'scheduled_start_at' => $slot['start'],
                    'scheduled_end_at' => $slot['end'],
                ]);

                foreach ($this->athleteIds($match) as $athleteId) {
                    $busyUntil = $slot['end'];
                    $availableAt = $slot['end']->addMinutes($rest);

                    if (! isset($athleteBusyUntil[$athleteId])
                        || $busyUntil->greaterThan($athleteBusyUntil[$athleteId])) {
                        $athleteBusyUntil[$athleteId] = $busyUntil;
                    }

                    if (! isset($athleteAvailableAt[$athleteId])
                        || $availableAt->greaterThan($athleteAvailableAt[$athleteId])) {
                        $athleteAvailableAt[$athleteId] = $availableAt;
                    }
                }

                if (! $lastEnd || $slot['end']->greaterThan($lastEnd)) {
                    $lastEnd = $slot['end'];
                }
            }

            $matchesByCategory->forget($selectedCategoryIndex);
            $matchesByCategory = $matchesByCategory->values();
        }

        return [
            'complete' => true,
            'last_end' => $lastEnd,
        ];
    }

    /**
     * @param  Collection<int, TournamentMatch>  $categoryMatches
     * @param  Collection<int, array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>  $slots
     * @param  array<int, true>  $usedSlotIndexes
     * @param  array<string, CarbonImmutable>  $athleteAvailableAt
     * @param  array<string, CarbonImmutable>  $athleteBusyUntil
     * @return Collection<int, array{match: TournamentMatch, slot: array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}, slot_index: int}>|null
     */
    private function findConsecutiveCategoryBlock(
        Collection $categoryMatches,
        Collection $slots,
        array $usedSlotIndexes,
        array $athleteAvailableAt,
        array $athleteBusyUntil,
        ?CarbonImmutable $notBefore,
        bool $preferContiguousOnly = false,
        bool $useDirectBusyOnly = false,
        int $rest = 0,
        bool $allowFallback = false,
    ): ?Collection {
        $earliestUnusedByCourt = [];
        $hasMatchesByCourt = [];
        foreach ($slots as $slotIndex => $slot) {
            $courtId = $slot['court_id'];
            if (isset($usedSlotIndexes[$slotIndex])) {
                $hasMatchesByCourt[$courtId] = true;
            } elseif (! isset($earliestUnusedByCourt[$courtId])) {
                $earliestUnusedByCourt[$courtId] = $slotIndex;
            }
        }

        foreach ($slots as $slotIndex => $slot) {
            if (isset($usedSlotIndexes[$slotIndex])
                || ($notBefore && $slot['start']->lessThan($notBefore))) {
                continue;
            }

            $courtId = $slot['court_id'];

            if ($preferContiguousOnly && ! empty($hasMatchesByCourt[$courtId])) {
                $earliest = $earliestUnusedByCourt[$courtId] ?? null;
                if ($earliest !== null && $slotIndex > $earliest) {
                    continue;
                }
            }

            $block = $slots
                ->filter(fn (array $candidate, int $candidateIndex): bool => $candidateIndex >= $slotIndex
                    && $candidate['court_id'] === $courtId)
                ->take($categoryMatches->count())
                ->map(fn (array $candidate, int $candidateIndex): array => [
                    'slot' => $candidate,
                    'slot_index' => $candidateIndex,
                ])
                ->values();

            if (! $this->isAvailableMatchSessionBlock($block, $categoryMatches->count(), $usedSlotIndexes)) {
                continue;
            }

            $assignments = $this->assignMatchesToBlock(
                $categoryMatches,
                $block,
                $useDirectBusyOnly ? $athleteBusyUntil : $athleteAvailableAt,
                $useDirectBusyOnly ? 0 : $rest,
                $allowFallback,
            );

            if ($assignments !== null) {
                return $assignments;
            }
        }

        return null;
    }

    /**
     * @param  Collection<int, TournamentMatch>  $categoryMatches
     * @param  Collection<int, array{slot: array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}, slot_index: int}>  $assignments
     * @param  array<string, CarbonImmutable>  $athleteAvailableAt
     */
    private function countCrossCourtClashes(
        Collection $categoryMatches,
        Collection $assignments,
        array $athleteAvailableAt,
    ): int {
        $count = 0;
        foreach ($assignments as $assignment) {
            $match = $assignment['match'];
            $slot = $assignment['slot'];
            foreach ($this->athleteIds($match) as $athleteId) {
                if (isset($athleteAvailableAt[$athleteId]) && $slot['start']->lessThan($athleteAvailableAt[$athleteId])) {
                    $count++;
                }
            }
        }

        return $count;
    }

    /**
     * @param  Collection<int, array{slot: array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}, slot_index: int}>  $block
     * @param  array<int, true>  $usedSlotIndexes
     */
    private function isAvailableMatchSessionBlock(
        Collection $block,
        int $requiredCount,
        array $usedSlotIndexes,
    ): bool {
        if ($block->count() !== $requiredCount
            || $block->contains(fn (array $item): bool => isset($usedSlotIndexes[$item['slot_index']]))) {
            return false;
        }

        return $block->sliding(2)->every(
            fn (Collection $pair): bool => $pair->last()['slot']['start']->greaterThanOrEqualTo($pair->first()['slot']['end']),
        );
    }

    /**
     * Rest constraints are evaluated against previously scheduled categories.
     * Matches inside this category use consecutive match-session slots; official
     * non-match intervals may pause the block. Later bracket placeholders do not
     * reserve every possible athlete as a separate idle slot.
     *
     * @param  Collection<int, TournamentMatch>  $categoryMatches
     * @param  Collection<int, array{slot: array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}, slot_index: int}>  $block
     * @param  array<string, CarbonImmutable>  $athleteAvailableAt
     * @return Collection<int, array{match: TournamentMatch, slot: array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}, slot_index: int}>|null
     */
    private function assignMatchesToBlock(
        Collection $categoryMatches,
        Collection $block,
        array $athleteAvailableAt,
        int $rest = 0,
        bool $allowFallback = false,
    ): ?Collection {
        $remainingMatches = $categoryMatches->values();
        $assignments = collect();
        $isEmbu = $remainingMatches->first()?->matchCategory?->type === 'embu';
        $localAthleteAvailableAt = $athleteAvailableAt;

        foreach ($block as $item) {
            /** @var TournamentMatch|null $firstMatch */
            $firstMatch = $remainingMatches->first();

            if (! $firstMatch) {
                return null;
            }

            $eligibleMatches = $isEmbu
                ? $remainingMatches
                    ->where('phase', $firstMatch->phase)
                    ->where('pool', $firstMatch->pool)
                : $remainingMatches
                    ->filter(fn (TournamentMatch $m): bool => ($m->round_label ?? $m->phase) === ($firstMatch->round_label ?? $firstMatch->phase));

            // Candidate selection:
            // Order eligible matches so that athletes who have rested the longest (or haven't played recently)
            // are scheduled first, deferring recently-active athletes to later slots in this round to maximize rest.
            $sortedEligibles = $eligibleMatches->sortBy(function (TournamentMatch $candidate) use ($localAthleteAvailableAt): array {
                $maxRestTimestamp = 0;
                foreach ($this->athleteIds($candidate) as $aId) {
                    if (isset($localAthleteAvailableAt[$aId])) {
                        $maxRestTimestamp = max($maxRestTimestamp, $localAthleteAvailableAt[$aId]->timestamp);
                    }
                }

                return [$maxRestTimestamp, $candidate->match_sequence];
            })->values();

            // 1. Prefer candidate whose athletes have ALL satisfied rest: slot start >= localAthleteAvailableAt
            $candidate = $sortedEligibles->first(fn (TournamentMatch $candidate): bool => $this->athleteIds($candidate)->every(
                fn (string $athleteId): bool => ! isset($localAthleteAvailableAt[$athleteId])
                    || $item['slot']['start']->greaterThanOrEqualTo($localAthleteAvailableAt[$athleteId]),
            ));

            // 2. Fallback if strict rest cannot be satisfied and fallback is allowed: pick candidate whose athletes have had the longest rest (earliest availableAt)
            if (! $candidate && $allowFallback) {
                $candidate = $sortedEligibles->first();
            }

            if (! $candidate) {
                return null;
            }

            $assignments->push([
                'match' => $candidate,
                'slot' => $item['slot'],
                'slot_index' => $item['slot_index'],
            ]);

            // Track athlete rest within this category block for subsequent matches (e.g. preliminary -> final)
            if ($rest > 0) {
                foreach ($this->athleteIds($candidate) as $athleteId) {
                    $localAthleteAvailableAt[$athleteId] = $item['slot']['end']->addMinutes($rest);
                }
            }

            $remainingMatches = $remainingMatches
                ->reject(fn (TournamentMatch $remainingMatch): bool => $remainingMatch->is($candidate))
                ->values();
        }

        return $remainingMatches->isEmpty() ? $assignments : null;
    }

    /** @param Collection<int, TournamentMatch> $matches */
    private function resequenceEmbuMatches(Collection $matches): void
    {
        $matches->groupBy('event_match_category_id')->each(function (Collection $categoryMatches): void {
            $orderedMatches = $categoryMatches->sortBy(fn (TournamentMatch $match): array => [
                $match->scheduled_start_at ? 0 : 1,
                $match->scheduled_start_at?->timestamp ?? PHP_INT_MAX,
                $match->pool ?? '',
                $match->match_sequence,
            ])->values();
            $temporaryOffset = ((int) $categoryMatches->max('match_sequence')) + $categoryMatches->count() + 1;

            $categoryMatches->toQuery()->increment('match_sequence', $temporaryOffset);
            $orderedMatches->each(function (TournamentMatch $match, int $index): void {
                TournamentMatch::query()
                    ->whereKey($match->id)
                    ->update(['match_sequence' => $index + 1]);
            });
        });
    }

    /** @return Collection<int, string> */
    private function athleteIds(TournamentMatch $match): Collection
    {
        if (! empty($match->metadata['placeholder'])) {
            return collect();
        }

        return collect($match->metadata['athlete_ids'] ?? [])
            ->filter(fn (mixed $athleteId): bool => is_string($athleteId) && $athleteId !== '')
            ->unique()
            ->values();
    }
}
