<?php

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentDrawingGenerator
{
    public function __construct(private TournamentScheduleGenerator $scheduleGenerator) {}

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

                $availableFormats = $this->availableFormatsFor($category, $participantCount);
                $isRoundRobinEligible = $category->type === 'randori' && $participantCount >= 3 && $participantCount <= 5;

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
                    'preferred_bracket_type' => $category->preferred_bracket_type,
                    'format' => $this->formatFor($category, $participantCount),
                    'available_formats' => $availableFormats,
                    'is_round_robin_eligible' => $isRoundRobinEligible,
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

            $this->scheduleGenerator->schedule($event);

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
            ->where(function ($query) {
                $query->whereNull('weigh_in_status')
                    ->orWhereNotIn('weigh_in_status', ['overweight', 'underweight', 'failed', 'disqualified']);
            })
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

    /**
     * Get conditionally available tournament formats based on current entries count.
     *
     * @return array<string, string>
     */
    public function availableFormatsFor(EventMatchCategory $category, int $participantCount): array
    {
        if ($category->type === 'embu') {
            return match (true) {
                $participantCount <= 9 => ['embu_direct_final' => 'Embu 1 Pool + Babak Final'],
                $participantCount <= 11 => ['embu_2_pools' => 'Embu 2 Pool (4 terbaik/pool ke final)'],
                $participantCount <= 17 => ['embu_3_pools' => 'Embu 3 Pool (3 terbaik/pool ke final)'],
                default => ['embu_4_pools' => 'Embu 4 Pool (2 terbaik/pool ke final)'],
            };
        }

        // Conditional Entry logic for Randori:
        // Round Robin (Setengah Kompetisi) becomes available conditionally when entries are 3 to 5.
        if ($participantCount >= 3 && $participantCount <= 5) {
            return [
                'round_robin' => 'Setengah Kompetisi (Round Robin) · Setiap atlet saling bertanding',
                'double_elimination' => 'Sistem Gugur Ganda (Double Elimination)',
                'single_elimination' => 'Sistem Gugur Tunggal',
            ];
        }

        if ($participantCount <= 4) {
            return [
                'double_elimination' => 'Sistem Gugur Ganda (Double Elimination)',
                'single_elimination' => 'Sistem Gugur Tunggal',
            ];
        }

        return [
            'single_elimination' => 'Sistem Gugur Tunggal',
        ];
    }

    private function formatFor(EventMatchCategory $category, int $participantCount): string
    {
        $available = array_keys($this->availableFormatsFor($category, $participantCount));

        if ($category->preferred_bracket_type && in_array($category->preferred_bracket_type, $available, true)) {
            return $category->preferred_bracket_type;
        }

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
        $poolAthleteIds = collect();
        $sequence = 1;

        foreach ($participants as $index => $participant) {
            $pool = $poolNames[$index % $poolCount];
            $poolAthleteIds->put(
                $pool,
                collect($poolAthleteIds->get($pool, []))
                    ->merge($participant['athlete_ids'] ?? [])
                    ->unique()
                    ->values()
                    ->all(),
            );
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
                    'metadata' => [
                        'placeholder' => true,
                        'source_pool' => $pool,
                        'source_rank' => $rank,
                        'athlete_ids' => $poolAthleteIds->get($pool, []),
                    ],
                ]);
            }
        }
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function createRandoriNodes(Event $event, EventMatchCategory $category, TournamentDrawing $drawing, Collection $participants): void
    {
        if ($drawing->bracket_type === 'round_robin') {
            $this->createRoundRobinNodes($event, $category, $drawing, $participants);

            return;
        }

        if ($drawing->bracket_type === 'double_elimination' || ($drawing->bracket_type === null && $participants->count() <= 4)) {
            $this->createDoubleEliminationNodes($event, $category, $drawing, $participants);

            return;
        }

        $bracketSize = 1;
        while ($bracketSize < $participants->count()) {
            $bracketSize *= 2;
        }

        $sequence = 1;
        $roundNumber = 1;
        $currentRound = collect();

        foreach ($this->singleEliminationFirstRoundPairs($participants, $bracketSize) as $position => $pair) {
            [$red, $blue] = $pair;
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
                $redSource = $this->randoriAdvancementSource($sourceA);
                $blueSource = $this->randoriAdvancementSource($sourceB);
                $athleteIds = collect([$redSource['athlete_ids'], $blueSource['athlete_ids']])
                    ->flatten()
                    ->unique()
                    ->values()
                    ->all();
                $node = $this->createNode($event, $category, $drawing, [
                    'phase' => $isFinal ? 'final' : 'preliminary',
                    'round_label' => $isFinal ? 'Final' : "Babak {$roundNumber}",
                    'match_sequence' => $sequence++,
                    'bracket_position' => $position + 1,
                    'red_entry_id' => $redSource['entry_id'],
                    'blue_entry_id' => $blueSource['entry_id'],
                    'red_label' => $redSource['label'],
                    'blue_label' => $blueSource['label'],
                    'is_bye' => false,
                    'metadata' => [
                        'placeholder' => $redSource['participant'] === null || $blueSource['participant'] === null,
                        'red' => $redSource['participant'],
                        'blue' => $blueSource['participant'],
                        'athlete_ids' => $athleteIds,
                    ],
                ]);

                $sourceMatches->each(fn (TournamentMatch $source) => $source->update(['next_match_id' => $node->id]));
                $nextRound->push($node);
            }

            $currentRound = $nextRound;
        }
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $participants
     * @return Collection<int, array{0: array<string, mixed>, 1: array<string, mixed>|null}>
     */
    private function singleEliminationFirstRoundPairs(Collection $participants, int $bracketSize): Collection
    {
        $participantQueue = $participants->values();
        $firstRoundMatchCount = intdiv($bracketSize, 2);
        $competitiveMatchCount = $participants->count() - $firstRoundMatchCount;
        $competitivePositions = collect(range(0, $competitiveMatchCount - 1))
            ->mapWithKeys(fn (int $index): array => [
                intdiv(((2 * $index) + 1) * $firstRoundMatchCount, 2 * $competitiveMatchCount) => true,
            ]);
        $pairs = collect();

        foreach (range(0, $firstRoundMatchCount - 1) as $position) {
            $red = $participantQueue->shift();
            $blue = $competitivePositions->has($position) ? $participantQueue->shift() : null;
            $pairs->push([$red, $blue]);
        }

        return $pairs;
    }

    /**
     * @return array{
     *     entry_id: string|null,
     *     label: string,
     *     participant: array<string, mixed>|null,
     *     athlete_ids: list<string>
     * }
     */
    private function randoriAdvancementSource(TournamentMatch $source): array
    {
        $participant = null;

        if ($source->is_bye) {
            $participant = $source->metadata['red'] ?? $source->metadata['blue'] ?? null;
        }

        return [
            'entry_id' => $participant['entry_id'] ?? null,
            'label' => $participant['label'] ?? 'Pemenang Partai #'.$source->match_sequence,
            'participant' => $participant,
            'athlete_ids' => $participant['athlete_ids'] ?? $source->metadata['athlete_ids'] ?? [],
        ];
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function createDoubleEliminationNodes(Event $event, EventMatchCategory $category, TournamentDrawing $drawing, Collection $participants): void
    {
        $seeded = $participants->values()->pad(4, null);
        $athleteIds = $participants
            ->flatMap(fn (array $participant) => $participant['athlete_ids'] ?? [])
            ->unique()
            ->values()
            ->all();
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
            'metadata' => ['placeholder' => true, 'athlete_ids' => $athleteIds],
        ]);

        $upperFinal = $this->createNode($event, $category, $drawing, [
            'phase' => 'preliminary',
            'round_label' => 'Final Upper Bracket',
            'match_sequence' => $sequence++,
            'bracket_position' => 1,
            'red_label' => 'Pemenang Partai #'.$upperMatches[0]->match_sequence,
            'blue_label' => 'Pemenang Partai #'.$upperMatches[1]->match_sequence,
            'metadata' => ['placeholder' => true, 'athlete_ids' => $athleteIds],
        ]);
        $upperMatches->each(fn (TournamentMatch $match) => $match->update(['next_match_id' => $upperFinal->id]));

        $lowerFinal = $this->createNode($event, $category, $drawing, [
            'phase' => 'preliminary',
            'round_label' => 'Final Lower Bracket',
            'match_sequence' => $sequence++,
            'bracket_position' => 1,
            'red_label' => 'Pemenang Partai #'.$lowerRound->match_sequence,
            'blue_label' => 'Kalah Partai #'.$upperFinal->match_sequence,
            'metadata' => ['placeholder' => true, 'athlete_ids' => $athleteIds],
        ]);
        $lowerRound->update(['next_match_id' => $lowerFinal->id]);

        $grandFinal = $this->createNode($event, $category, $drawing, [
            'phase' => 'final',
            'round_label' => 'Grand Final',
            'match_sequence' => $sequence++,
            'bracket_position' => 1,
            'red_label' => 'Pemenang Partai #'.$upperFinal->match_sequence,
            'blue_label' => 'Pemenang Partai #'.$lowerFinal->match_sequence,
            'metadata' => ['placeholder' => true, 'athlete_ids' => $athleteIds],
        ]);
        $upperFinal->update(['next_match_id' => $grandFinal->id]);
        $lowerFinal->update(['next_match_id' => $grandFinal->id]);

        $grandFinal2 = $this->createNode($event, $category, $drawing, [
            'phase' => 'final',
            'round_label' => 'Grand Final Ulang (GF2)',
            'match_sequence' => $sequence,
            'bracket_position' => 2,
            'red_label' => 'Pemenang Upper Bracket (Bila Perlu)',
            'blue_label' => 'Pemenang Lower Bracket (Bila Perlu)',
            'is_bye' => false,
            'status' => 'pending',
            'metadata' => [
                'placeholder' => true,
                'is_gf2' => true,
                'athlete_ids' => $athleteIds,
            ],
        ]);
        $grandFinal->update(['next_match_id' => $grandFinal2->id]);
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function createRoundRobinNodes(Event $event, EventMatchCategory $category, TournamentDrawing $drawing, Collection $participants): void
    {
        $list = $participants->values()->all();
        $rounds = $this->generateRoundRobinRounds($list);
        $sequence = 1;
        $totalRounds = count($rounds);

        foreach ($rounds as $roundIndex => $pairs) {
            $roundNumber = $roundIndex + 1;
            $roundLabel = "Putaran {$roundNumber}";

            foreach ($pairs as $pos => $pair) {
                [$red, $blue] = $pair;

                $this->createNode($event, $category, $drawing, [
                    'phase' => $roundNumber === $totalRounds ? 'final' : 'preliminary',
                    'round_label' => $roundLabel,
                    'match_sequence' => $sequence++,
                    'bracket_position' => $pos + 1,
                    'red_entry_id' => $red['entry_id'] ?? null,
                    'blue_entry_id' => $blue['entry_id'] ?? null,
                    'red_label' => $red['label'] ?? 'Sudut Merah',
                    'blue_label' => $blue['label'] ?? 'Sudut Putih',
                    'is_bye' => false,
                    'metadata' => $this->pairMetadata($red, $blue),
                ]);
            }
        }
    }

    /**
     * Generate balanced round-robin pairings using the standard circle/polygon rotation.
     *
     * @param  list<array<string, mixed>>  $participants
     * @return list<list<array{0: array<string, mixed>, 1: array<string, mixed>}>>
     */
    private function generateRoundRobinRounds(array $participants): array
    {
        $items = $participants;
        $count = count($items);

        if ($count % 2 !== 0) {
            $items[] = null; // Dummy for bye
            $count++;
        }

        $rounds = [];
        $totalRounds = $count - 1;
        $half = intdiv($count, 2);

        for ($r = 0; $r < $totalRounds; $r++) {
            $pairs = [];

            for ($i = 0; $i < $half; $i++) {
                $p1 = $items[$i];
                $p2 = $items[$count - 1 - $i];

                if ($p1 !== null && $p2 !== null) {
                    $pairs[] = [$p1, $p2];
                }
            }

            if (! empty($pairs)) {
                $rounds[] = $pairs;
            }

            // Rotate array keeping the very first element fixed
            $fixed = array_shift($items);
            $last = array_pop($items);
            array_unshift($items, $last);
            array_unshift($items, $fixed);
        }

        return $rounds;
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
}
