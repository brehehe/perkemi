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
        $rest = max(0, (int) $event->minimum_rest_minutes);
        $slots = $this->slots($courts, $sessions, $duration);

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
                $rest,
                $notBefore,
            );

            if (! $result['complete']) {
                break;
            }

            if ($matchType === 'embu') {
                $this->resequenceEmbuMatches($typeMatches);
            }

            $notBefore = $result['last_end'];
        }
    }

    /**
     * @param  Collection<int, mixed>  $courts
     * @param  Collection<int, mixed>  $sessions
     * @return Collection<int, array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function slots(Collection $courts, Collection $sessions, int $duration): Collection
    {
        $slots = collect();

        foreach ($sessions as $session) {
            $start = CarbonImmutable::instance($session->date);
            $end = $session->end_time
                ? CarbonImmutable::instance($session->end_time)
                : $start->addHours(4);

            for ($cursor = $start; $cursor->addMinutes($duration)->lessThanOrEqualTo($end); $cursor = $cursor->addMinutes($duration)) {
                foreach ($courts->values() as $courtPriority => $court) {
                    $slots->push([
                        'court_id' => $court->id,
                        'court_priority' => $courtPriority,
                        'rundown_id' => $session->id,
                        'start' => $cursor,
                        'end' => $cursor->addMinutes($duration),
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
     * @return array{complete: bool, last_end: CarbonImmutable|null}
     */
    private function scheduleMatchType(
        Collection $matches,
        Collection $slots,
        array &$usedSlotIndexes,
        array &$athleteAvailableAt,
        int $rest,
        ?CarbonImmutable $notBefore,
    ): array {
        $matchesByCategory = $matches
            ->groupBy('event_match_category_id')
            ->map(fn (Collection $categoryMatches) => $categoryMatches->sortBy('match_sequence')->values())
            ->values();
        $lastEnd = null;

        while ($matchesByCategory->isNotEmpty()) {
            $selectedCategoryIndex = null;
            $selectedAssignments = null;

            foreach ($matchesByCategory as $categoryIndex => $categoryMatches) {
                $assignments = $this->findConsecutiveCategoryBlock(
                    $categoryMatches,
                    $slots,
                    $usedSlotIndexes,
                    $athleteAvailableAt,
                    $notBefore,
                );

                if ($assignments === null) {
                    continue;
                }

                $startsEarlier = $selectedAssignments === null
                    || $assignments->first()['slot']['start']->lessThan(
                        $selectedAssignments->first()['slot']['start'],
                    );

                if ($startsEarlier) {
                    $selectedCategoryIndex = $categoryIndex;
                    $selectedAssignments = $assignments;
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
                    $availableAt = $slot['end']->addMinutes($rest);

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
     * @return Collection<int, array{match: TournamentMatch, slot: array{court_id: string, court_priority: int, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}, slot_index: int}>|null
     */
    private function findConsecutiveCategoryBlock(
        Collection $categoryMatches,
        Collection $slots,
        array $usedSlotIndexes,
        array $athleteAvailableAt,
        ?CarbonImmutable $notBefore,
    ): ?Collection {
        foreach ($slots as $slotIndex => $slot) {
            if (isset($usedSlotIndexes[$slotIndex])
                || ($notBefore && $slot['start']->lessThan($notBefore))) {
                continue;
            }

            $block = $slots
                ->filter(fn (array $candidate, int $candidateIndex): bool => $candidateIndex >= $slotIndex
                    && $candidate['court_id'] === $slot['court_id'])
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
                $athleteAvailableAt,
            );

            if ($assignments !== null) {
                return $assignments;
            }
        }

        return null;
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
    ): ?Collection {
        $remainingMatches = $categoryMatches->values();
        $assignments = collect();
        $isEmbu = $remainingMatches->first()?->matchCategory?->type === 'embu';

        foreach ($block as $item) {
            /** @var TournamentMatch|null $firstMatch */
            $firstMatch = $remainingMatches->first();

            if (! $firstMatch) {
                return null;
            }

            $eligibleMatches = $isEmbu
                ? $remainingMatches->where('phase', $firstMatch->phase)
                : $remainingMatches->take(1);
            /** @var TournamentMatch|null $match */
            $match = $eligibleMatches->first(fn (TournamentMatch $candidate): bool => $this->athleteIds($candidate)->every(
                fn (string $athleteId): bool => ! isset($athleteAvailableAt[$athleteId])
                    || $item['slot']['start']->greaterThanOrEqualTo($athleteAvailableAt[$athleteId]),
            ));

            if (! $match) {
                return null;
            }

            $assignments->push([
                'match' => $match,
                'slot' => $item['slot'],
                'slot_index' => $item['slot_index'],
            ]);
            $remainingMatches = $remainingMatches
                ->reject(fn (TournamentMatch $remainingMatch): bool => $remainingMatch->is($match))
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
        return collect($match->metadata['athlete_ids'] ?? [])
            ->filter(fn (mixed $athleteId): bool => is_string($athleteId) && $athleteId !== '')
            ->unique()
            ->values();
    }
}
