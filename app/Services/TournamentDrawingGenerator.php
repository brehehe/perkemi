<?php

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentDrawingGenerator
{
    /** @return Collection<int, array<string, mixed>> */
    public function precheck(Event $event): Collection
    {
        $eligibleContingentIds = $this->eligibleContingentIds($event);

        return $event->matchCategories()
            ->where('is_active', true)
            ->with('mergedSources:id,merged_into_id')
            ->get()
            ->map(function (EventMatchCategory $category) use ($event, $eligibleContingentIds): array {
                $participants = $this->participantsFor($event, $category, $eligibleContingentIds);
                $participantCount = $participants->count();
                $contingentCount = $participants->pluck('contingent_id')->filter()->unique()->count();
                $minimumEntries = max(1, (int) $event->minimum_entries_per_category);
                $minimumContingents = max(1, (int) $event->minimum_contingents_per_category);
                $reasons = collect();

                if ($participantCount < $minimumEntries) {
                    $reasons->push("Minimal {$minimumEntries} ".($category->type === 'embu' ? 'tim' : 'atlet')."; tersedia {$participantCount}.");
                }

                if ($contingentCount < $minimumContingents) {
                    $reasons->push("Minimal {$minimumContingents} kontingen; tersedia {$contingentCount}.");
                }

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'type' => $category->type,
                    'capacity' => (int) $category->capacity,
                    'participant_label' => $category->type === 'embu' ? 'Tim' : 'Atlet',
                    'participant_count' => $participantCount,
                    'contingent_count' => $contingentCount,
                    'minimum_entries' => $minimumEntries,
                    'minimum_contingents' => $minimumContingents,
                    'is_eligible' => $reasons->isEmpty(),
                    'reason' => $reasons->join(' '),
                    'format' => $this->formatFor($category, $participantCount),
                    'participants' => $participants->values(),
                ];
            })
            ->values();
    }

    /**
     * Generate drawing nodes for all eligible categories, or replace one category only.
     *
     * @return array{generated: int, skipped: int, matches: int}
     */
    public function generate(Event $event, ?EventMatchCategory $onlyCategory = null): array
    {
        $prechecks = $this->precheck($event)
            ->when($onlyCategory, fn (Collection $items) => $items->where('id', $onlyCategory->id));

        return DB::transaction(function () use ($event, $prechecks): array {
            $generated = 0;
            $skipped = 0;

            foreach ($prechecks as $check) {
                $drawing = TournamentDrawing::query()->updateOrCreate(
                    [
                        'event_id' => $event->id,
                        'event_match_category_id' => $check['id'],
                    ],
                    [
                        'status' => $check['is_eligible'] ? 'generated' : 'skipped',
                        'bracket_type' => $check['format'],
                        'participant_count' => $check['participant_count'],
                        'contingent_count' => $check['contingent_count'],
                        'skip_reason' => $check['is_eligible'] ? null : $check['reason'],
                        'generated_at' => now(),
                        'published_at' => null,
                    ],
                );

                $drawing->matches()->delete();

                if (! $check['is_eligible']) {
                    $skipped++;

                    continue;
                }

                $category = $event->matchCategories()->findOrFail($check['id']);
                $participants = collect($check['participants']);

                if ($category->type === 'embu') {
                    $this->createEmbuNodes($event, $category, $drawing, $participants);
                } else {
                    $this->createRandoriNodes($event, $category, $drawing, $participants);
                }

                $generated++;
            }

            $this->schedule($event);

            return [
                'generated' => $generated,
                'skipped' => $skipped,
                'matches' => $event->tournamentMatches()->count(),
            ];
        });
    }

    /** @return Collection<int, array<string, mixed>> */
    public function participantsFor(Event $event, EventMatchCategory $category, ?Collection $eligibleContingentIds = null): Collection
    {
        $eligibleContingentIds ??= $this->eligibleContingentIds($event);
        $categoryIds = collect([$category->id])->merge(
            EventMatchCategory::query()->where('merged_into_id', $category->id)->pluck('id'),
        );

        $entries = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereIn('event_match_category_id', $categoryIds)
            ->whereHas('athlete.contingent', fn ($query) => $query->whereIn('id', $eligibleContingentIds))
            ->with('athlete.contingent:id,name,city')
            ->get();

        if ($category->type !== 'embu') {
            return $this->interleaveByContingent($entries->map(function (AthleteMatchCategoryEntry $entry): array {
                return [
                    'key' => $entry->athlete_id,
                    'entry_id' => $entry->id,
                    'entry_ids' => [$entry->id],
                    'athlete_ids' => [$entry->athlete_id],
                    'contingent_id' => $entry->athlete?->contingent_id,
                    'contingent_name' => $entry->athlete?->contingent?->name ?? 'Kontingen',
                    'city' => $entry->athlete?->contingent?->city ?? '',
                    'label' => $entry->athlete?->name ?? 'Atlet',
                    'team_number' => null,
                ];
            }));
        }

        $teams = $entries->groupBy(fn (AthleteMatchCategoryEntry $entry) => implode(':', [
            $entry->event_match_category_id,
            $entry->athlete?->contingent_id,
            $entry->team_number,
        ]))->map(function (Collection $team): array {
            /** @var AthleteMatchCategoryEntry $first */
            $first = $team->first();
            $contingent = $first->athlete?->contingent;

            return [
                'key' => $first->event_match_category_id.':'.$contingent?->id.':'.$first->team_number,
                'entry_id' => $first->id,
                'entry_ids' => $team->pluck('id')->values()->all(),
                'athlete_ids' => $team->pluck('athlete_id')->values()->all(),
                'contingent_id' => $contingent?->id,
                'contingent_name' => $contingent?->name ?? 'Kontingen',
                'city' => $contingent?->city ?? '',
                'label' => ($contingent?->name ?? 'Kontingen').' · Tim '.$first->team_number,
                'members' => $team->pluck('athlete.name')->filter()->values()->all(),
                'team_number' => $first->team_number,
            ];
        })->values();

        return $this->interleaveByContingent($teams);
    }

    /** @return Collection<int, string> */
    private function eligibleContingentIds(Event $event): Collection
    {
        return $event->registrations()
            ->where('status', RegistrationStatus::Verified)
            ->where('payment_status', PaymentStatus::Verified)
            ->pluck('contingent_id');
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function interleaveByContingent(Collection $participants): Collection
    {
        $groups = $participants->groupBy('contingent_id')
            ->map(fn (Collection $group) => $group->shuffle()->values())
            ->shuffle()
            ->values();
        $ordered = collect();
        $position = 0;

        while ($groups->contains(fn (Collection $group) => $group->has($position))) {
            foreach ($groups as $group) {
                if ($group->has($position)) {
                    $ordered->push($group->get($position));
                }
            }

            $position++;
        }

        return $ordered;
    }

    private function formatFor(EventMatchCategory $category, int $participantCount): string
    {
        if ($category->type === 'randori') {
            return $participantCount <= 4 ? 'double_elimination' : 'single_elimination';
        }

        return match (true) {
            $participantCount <= 9 => 'embu_direct_final',
            $participantCount <= 11 => 'embu_2_pools',
            $participantCount <= 17 => 'embu_3_pools',
            default => 'embu_4_pools',
        };
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function createEmbuNodes(Event $event, EventMatchCategory $category, TournamentDrawing $drawing, Collection $participants): void
    {
        [$poolCount, $finalistsPerPool] = match (true) {
            $participants->count() <= 9 => [1, $participants->count()],
            $participants->count() <= 11 => [2, 4],
            $participants->count() <= 17 => [3, 3],
            default => [4, 2],
        };
        $poolNames = collect(range(0, $poolCount - 1))->map(fn (int $index) => chr(65 + $index));
        $sequence = 1;

        foreach ($participants as $index => $participant) {
            $pool = $poolNames[$index % $poolCount];
            $this->createNode($event, $category, $drawing, [
                'phase' => 'preliminary',
                'round_label' => $poolCount === 1 ? 'Babak Penyisihan' : "Penyisihan Pool {$pool}",
                'pool' => $pool,
                'match_sequence' => $sequence++,
                'bracket_position' => intdiv($index, $poolCount) + 1,
                'participant_entry_id' => $participant['entry_id'],
                'participant_label' => $participant['label'],
                'metadata' => $participant,
            ]);
        }

        if ($poolCount === 1) {
            foreach ($participants as $index => $participant) {
                $this->createNode($event, $category, $drawing, [
                    'phase' => 'final',
                    'round_label' => 'Babak Final',
                    'pool' => 'F',
                    'match_sequence' => $sequence++,
                    'bracket_position' => $index + 1,
                    'participant_entry_id' => $participant['entry_id'],
                    'participant_label' => $participant['label'],
                    'metadata' => $participant,
                ]);
            }

            return;
        }

        foreach ($poolNames as $pool) {
            foreach (range(1, $finalistsPerPool) as $rank) {
                $this->createNode($event, $category, $drawing, [
                    'phase' => 'final',
                    'round_label' => 'Babak Final',
                    'pool' => 'F',
                    'match_sequence' => $sequence++,
                    'bracket_position' => $sequence,
                    'participant_label' => "Peringkat {$rank} Pool {$pool}",
                    'metadata' => ['placeholder' => true, 'source_pool' => $pool, 'source_rank' => $rank],
                ]);
            }
        }
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function createRandoriNodes(Event $event, EventMatchCategory $category, TournamentDrawing $drawing, Collection $participants): void
    {
        if ($participants->count() <= 4) {
            $this->createDoubleEliminationNodes($event, $category, $drawing, $participants);

            return;
        }

        $bracketSize = 1;
        while ($bracketSize < $participants->count()) {
            $bracketSize *= 2;
        }

        $seeded = $participants->values()->pad($bracketSize, null);
        $sequence = 1;
        $roundNumber = 1;
        $currentRound = collect();

        foreach ($seeded->chunk(2) as $position => $pair) {
            $pair = $pair->values();
            $red = $pair->get(0);
            $blue = $pair->get(1);
            $currentRound->push($this->createNode($event, $category, $drawing, [
                'phase' => 'preliminary',
                'round_label' => 'Babak 1',
                'match_sequence' => $sequence++,
                'bracket_position' => $position + 1,
                'red_entry_id' => $red['entry_id'] ?? null,
                'blue_entry_id' => $blue['entry_id'] ?? null,
                'red_label' => $red['label'] ?? 'BYE',
                'blue_label' => $blue['label'] ?? 'BYE',
                'is_bye' => $red === null || $blue === null,
                'metadata' => $this->pairMetadata($red, $blue),
            ]));
        }

        while ($currentRound->count() > 1) {
            $roundNumber++;
            $nextRound = collect();
            $isFinal = $currentRound->count() === 2;

            foreach ($currentRound->chunk(2) as $position => $sourceMatches) {
                $sourceMatches = $sourceMatches->values();
                $sourceA = $sourceMatches->get(0);
                $sourceB = $sourceMatches->get(1);
                $node = $this->createNode($event, $category, $drawing, [
                    'phase' => $isFinal ? 'final' : 'preliminary',
                    'round_label' => $isFinal ? 'Final' : "Babak {$roundNumber}",
                    'match_sequence' => $sequence++,
                    'bracket_position' => $position + 1,
                    'red_label' => 'Pemenang Partai #'.$sourceA->match_sequence,
                    'blue_label' => $sourceB ? 'Pemenang Partai #'.$sourceB->match_sequence : 'BYE',
                    'is_bye' => $sourceB === null,
                    'metadata' => ['placeholder' => true],
                ]);

                $sourceMatches->each(fn (TournamentMatch $source) => $source->update(['next_match_id' => $node->id]));
                $nextRound->push($node);
            }

            $currentRound = $nextRound;
        }
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function createDoubleEliminationNodes(Event $event, EventMatchCategory $category, TournamentDrawing $drawing, Collection $participants): void
    {
        $seeded = $participants->values()->pad(4, null);
        $sequence = 1;
        $upperMatches = collect();

        foreach ($seeded->chunk(2) as $position => $pair) {
            $pair = $pair->values();
            $red = $pair->get(0);
            $blue = $pair->get(1);
            $upperMatches->push($this->createNode($event, $category, $drawing, [
                'phase' => 'preliminary',
                'round_label' => 'Upper Bracket',
                'match_sequence' => $sequence++,
                'bracket_position' => $position + 1,
                'red_entry_id' => $red['entry_id'] ?? null,
                'blue_entry_id' => $blue['entry_id'] ?? null,
                'red_label' => $red['label'] ?? 'BYE',
                'blue_label' => $blue['label'] ?? 'BYE',
                'is_bye' => $red === null || $blue === null,
                'metadata' => $this->pairMetadata($red, $blue),
            ]));
        }

        $lowerRound = $this->createNode($event, $category, $drawing, [
            'phase' => 'preliminary',
            'round_label' => 'Lower Bracket · Babak 1',
            'match_sequence' => $sequence++,
            'bracket_position' => 1,
            'red_label' => 'Kalah Partai #'.$upperMatches[0]->match_sequence,
            'blue_label' => 'Kalah Partai #'.$upperMatches[1]->match_sequence,
            'metadata' => ['placeholder' => true],
        ]);

        $upperFinal = $this->createNode($event, $category, $drawing, [
            'phase' => 'preliminary',
            'round_label' => 'Final Upper Bracket',
            'match_sequence' => $sequence++,
            'bracket_position' => 1,
            'red_label' => 'Pemenang Partai #'.$upperMatches[0]->match_sequence,
            'blue_label' => 'Pemenang Partai #'.$upperMatches[1]->match_sequence,
            'metadata' => ['placeholder' => true],
        ]);
        $upperMatches->each(fn (TournamentMatch $match) => $match->update(['next_match_id' => $upperFinal->id]));

        $lowerFinal = $this->createNode($event, $category, $drawing, [
            'phase' => 'preliminary',
            'round_label' => 'Final Lower Bracket',
            'match_sequence' => $sequence++,
            'bracket_position' => 1,
            'red_label' => 'Pemenang Partai #'.$lowerRound->match_sequence,
            'blue_label' => 'Kalah Partai #'.$upperFinal->match_sequence,
            'metadata' => ['placeholder' => true],
        ]);
        $lowerRound->update(['next_match_id' => $lowerFinal->id]);

        $grandFinal = $this->createNode($event, $category, $drawing, [
            'phase' => 'final',
            'round_label' => 'Grand Final',
            'match_sequence' => $sequence,
            'bracket_position' => 1,
            'red_label' => 'Pemenang Partai #'.$upperFinal->match_sequence,
            'blue_label' => 'Pemenang Partai #'.$lowerFinal->match_sequence,
            'metadata' => ['placeholder' => true],
        ]);
        $upperFinal->update(['next_match_id' => $grandFinal->id]);
        $lowerFinal->update(['next_match_id' => $grandFinal->id]);
    }

    /** @param array<string, mixed> $attributes */
    private function createNode(Event $event, EventMatchCategory $category, TournamentDrawing $drawing, array $attributes): TournamentMatch
    {
        return TournamentMatch::create([
            'tournament_drawing_id' => $drawing->id,
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'status' => 'pending',
            ...$attributes,
        ]);
    }

    /** @param array<string, mixed>|null $red @param array<string, mixed>|null $blue */
    private function pairMetadata(?array $red, ?array $blue): array
    {
        return [
            'red' => $red,
            'blue' => $blue,
            'athlete_ids' => collect([$red['athlete_ids'] ?? [], $blue['athlete_ids'] ?? []])->flatten()->values()->all(),
        ];
    }

    private function schedule(Event $event): void
    {
        $courts = $event->courts()->where('is_active', true)->get();
        $sessions = $event->rundowns()->where('is_match_session', true)->orderBy('date')->get();

        if ($courts->isEmpty() || $sessions->isEmpty()) {
            return;
        }

        $duration = max(1, (int) $event->match_duration_minutes);
        $rest = max(0, (int) $event->minimum_rest_minutes);
        $slots = collect();

        foreach ($sessions as $session) {
            $start = CarbonImmutable::instance($session->date);
            $end = $session->end_time
                ? CarbonImmutable::instance($session->end_time)
                : $start->addHours(4);

            for ($cursor = $start; $cursor->addMinutes($duration)->lessThanOrEqualTo($end); $cursor = $cursor->addMinutes($duration)) {
                foreach ($courts as $court) {
                    $slots->push([
                        'court_id' => $court->id,
                        'rundown_id' => $session->id,
                        'start' => $cursor,
                        'end' => $cursor->addMinutes($duration),
                    ]);
                }
            }
        }

        $matches = $event->tournamentMatches()
            ->whereHas('drawing', fn ($query) => $query->where('status', 'generated'))
            ->with('matchCategory:id,order')
            ->orderBy('event_match_category_id')
            ->orderBy('match_sequence')
            ->get();
        $categoryIds = $matches
            ->sortBy(fn (TournamentMatch $match) => [
                $match->matchCategory?->order ?? PHP_INT_MAX,
                $match->event_match_category_id,
            ])
            ->pluck('event_match_category_id')
            ->unique()
            ->values();
        $categoryCourtMap = $categoryIds->mapWithKeys(
            fn (string $categoryId, int $index) => [$categoryId => $courts[$index % $courts->count()]->id],
        );

        $event->tournamentMatches()
            ->whereHas('drawing', fn ($query) => $query->where('status', 'generated'))
            ->update([
                'event_court_id' => null,
                'rundown_id' => null,
                'scheduled_start_at' => null,
                'scheduled_end_at' => null,
            ]);
        $usedSlots = collect();
        $athleteAvailableAt = [];
        $lastPreliminaryEnd = null;

        foreach (['preliminary', 'final'] as $phase) {
            $phaseMatches = $matches->where('phase', $phase);
            $notBefore = $phase === 'final' && $lastPreliminaryEnd
                ? $lastPreliminaryEnd->addMinutes($rest)
                : null;

            foreach ($phaseMatches as $match) {
                $athleteIds = collect($match->metadata['athlete_ids'] ?? [])->filter();
                $preferredCourtId = $categoryCourtMap->get($match->event_match_category_id);
                $slotIndex = $slots->search(function (array $slot, int $index) use ($usedSlots, $athleteIds, $athleteAvailableAt, $notBefore, $preferredCourtId): bool {
                    if ($slot['court_id'] !== $preferredCourtId
                        || $usedSlots->contains($index)
                        || ($notBefore && $slot['start']->lessThan($notBefore))) {
                        return false;
                    }

                    return $athleteIds->every(function (string $athleteId) use ($athleteAvailableAt, $slot): bool {
                        return ! isset($athleteAvailableAt[$athleteId]) || $slot['start']->greaterThanOrEqualTo($athleteAvailableAt[$athleteId]);
                    });
                });

                if ($slotIndex === false) {
                    continue;
                }

                $slot = $slots[$slotIndex];
                $usedSlots->push($slotIndex);
                $match->update([
                    'event_court_id' => $slot['court_id'],
                    'rundown_id' => $slot['rundown_id'],
                    'scheduled_start_at' => $slot['start'],
                    'scheduled_end_at' => $slot['end'],
                ]);

                foreach ($athleteIds as $athleteId) {
                    $athleteAvailableAt[$athleteId] = $slot['end']->addMinutes($rest);
                }

                if ($phase === 'preliminary' && (! $lastPreliminaryEnd || $slot['end']->greaterThan($lastPreliminaryEnd))) {
                    $lastPreliminaryEnd = $slot['end'];
                }
            }
        }
    }
}
