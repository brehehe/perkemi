<?php

namespace App\Services\Panitera;

use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChampionResultService
{
    public function __construct(private EmbuResultService $embuResults) {}

    /** @return array<string, mixed> */
    public function categoryData(Event $event, EventMatchCategory $category): array
    {
        $category->loadMissing([
            'tournamentDrawing:id,event_id,event_match_category_id,status,bracket_type,participant_count,contingent_count',
            'tournamentDrawing.matches.randoriScore',
        ]);

        $drawing = $category->tournamentDrawing;
        $participantCount = (int) ($drawing?->participant_count ?? 0);
        $requiredChampionCount = min(4, $participantCount);
        $participants = $this->participants($category);
        $generation = $this->generationData($category);
        $currentChampions = $this->currentChampions($event, $category);

        return [
            'id' => $category->id,
            'name' => $category->name,
            'type' => $category->type,
            'format' => $drawing?->bracket_type,
            'has_drawing' => $drawing !== null,
            'drawing_status' => $drawing?->status,
            'participant_count' => $participantCount,
            'required_champion_count' => $requiredChampionCount,
            'is_exhibition' => $drawing ? ((bool) $category->is_exhibition || $participantCount <= 3) : null,
            'classification_label' => $drawing
                ? (((bool) $category->is_exhibition || $participantCount <= 3) ? 'Ekshibisi' : 'Non-ekshibisi')
                : 'Drawing belum dibuat',
            'participants' => $participants->values(),
            'generation' => $generation,
            'current_champions' => $currentChampions,
            'draft_champions' => $currentChampions->isNotEmpty()
                ? $currentChampions
                : collect($generation['champions']),
        ];
    }

    /** @return array{ready: bool, message: string, champions: Collection<int, array<string, mixed>>} */
    public function generationData(EventMatchCategory $category): array
    {
        $category->loadMissing([
            'tournamentDrawing:id,event_id,event_match_category_id,status,bracket_type,participant_count,contingent_count',
            'tournamentDrawing.matches.randoriScore',
        ]);

        if (! $category->tournamentDrawing) {
            return $this->unavailableGeneration('Drawing pertandingan belum dibuat untuk nomor ini.');
        }

        $requiredChampionCount = min(4, (int) $category->tournamentDrawing->participant_count);

        return $category->type === 'embu'
            ? $this->embuGeneration($category, $requiredChampionCount)
            : $this->randoriGeneration($category, $requiredChampionCount);
    }

    /** @return Collection<int, TournamentResult> */
    public function generate(Event $event, EventMatchCategory $category): Collection
    {
        $categoryData = $this->categoryData($event, $category);

        if (! $categoryData['generation']['ready']) {
            throw ValidationException::withMessages([
                'category' => $categoryData['generation']['message'],
            ]);
        }

        return $this->save($event, $category, $categoryData['generation']['champions']);
    }

    /**
     * @param  array<int, array{rank: int|string, participant_key: string}>|Collection<int, array<string, mixed>>  $champions
     * @return Collection<int, TournamentResult>
     */
    public function save(Event $event, EventMatchCategory $category, array|Collection $champions): Collection
    {
        $category->loadMissing('tournamentDrawing.matches.randoriScore');
        $participants = $this->participants($category)->keyBy('key');
        $participantCount = (int) ($category->tournamentDrawing?->participant_count ?? 0);
        $requiredChampionCount = min(4, $participantCount);
        $submitted = collect($champions)
            ->map(fn (array $champion): array => [
                'rank' => (int) $champion['rank'],
                'participant_key' => (string) $champion['participant_key'],
            ])
            ->sortBy('rank')
            ->values();

        if ($requiredChampionCount < 1 || $submitted->count() !== $requiredChampionCount) {
            throw ValidationException::withMessages([
                'champions' => "Nomor pertandingan ini membutuhkan {$requiredChampionCount} susunan juara.",
            ]);
        }

        if ($submitted->pluck('rank')->all() !== range(1, $requiredChampionCount)) {
            throw ValidationException::withMessages([
                'champions' => 'Peringkat juara harus berurutan dari 1 sampai '.$requiredChampionCount.'.',
            ]);
        }

        if ($submitted->pluck('participant_key')->unique()->count() !== $submitted->count()) {
            throw ValidationException::withMessages([
                'champions' => 'Peserta yang sama tidak boleh menempati lebih dari satu peringkat.',
            ]);
        }

        foreach ($submitted as $champion) {
            if (! $participants->has($champion['participant_key'])) {
                throw ValidationException::withMessages([
                    'champions' => 'Salah satu peserta juara tidak terdaftar pada nomor pertandingan ini.',
                ]);
            }
        }

        return DB::transaction(function () use ($event, $category, $submitted, $participants, $participantCount): Collection {
            $this->resultQuery($event, $category)->lockForUpdate()->get();
            $this->resultQuery($event, $category)->delete();

            return $submitted->map(function (array $champion) use ($event, $category, $participants, $participantCount): TournamentResult {
                $participant = $participants->get($champion['participant_key']);

                return TournamentResult::create([
                    'event_id' => $event->id,
                    'event_match_category_id' => $category->id,
                    'participant_key' => $participant['key'],
                    'contingent_id' => $participant['contingent_id'],
                    'athlete_id' => $participant['athlete_id'],
                    'contingent_name' => $participant['contingent_name'] ?: $participant['label'],
                    'rank' => $champion['rank'],
                    'match_category' => $category->name,
                    'is_exhibition' => (bool) $category->is_exhibition || $participantCount <= 3,
                ]);
            });
        });
    }

    /** @return Collection<int, array<string, mixed>> */
    private function participants(EventMatchCategory $category): Collection
    {
        $matches = $category->tournamentDrawing?->matches ?? collect();
        $participants = collect();

        foreach ($matches as $match) {
            $metadata = $match->metadata ?? [];

            if ($category->type === 'embu') {
                if (! ($metadata['placeholder'] ?? false)) {
                    $participant = $this->participantData($metadata, $match->participant_label);
                    if ($participant) {
                        $participants->put($participant['key'], $participant);
                    }
                }

                continue;
            }

            foreach (['red', 'blue'] as $corner) {
                if (! is_array($metadata[$corner] ?? null)) {
                    continue;
                }

                $participant = $this->participantData($metadata[$corner], $match->{$corner.'_label'});
                if ($participant) {
                    $participants->put($participant['key'], $participant);
                }
            }
        }

        return $participants
            ->sortBy(fn (array $participant): string => mb_strtolower($participant['label']))
            ->values();
    }

    /** @param array<string, mixed> $metadata @return array<string, mixed>|null */
    private function participantData(array $metadata, ?string $fallbackLabel = null): ?array
    {
        $athleteIds = collect($metadata['athlete_ids'] ?? [])->filter()->values();
        $key = $metadata['key'] ?? $metadata['entry_id'] ?? $athleteIds->first();

        if (! is_string($key) || $key === '') {
            return null;
        }

        $label = (string) ($metadata['label'] ?? $fallbackLabel ?? 'Peserta');
        $contingentName = (string) ($metadata['contingent_name'] ?? '');
        $members = collect($metadata['members'] ?? [])->filter()->values()->all();

        return [
            'key' => $key,
            'label' => $label,
            'contingent_id' => is_string($metadata['contingent_id'] ?? null) ? $metadata['contingent_id'] : null,
            'contingent_name' => $contingentName,
            'athlete_id' => is_string($athleteIds->first()) ? $athleteIds->first() : null,
            'members' => $members,
            'sublabel' => collect([$contingentName, $members === [] ? null : implode(', ', $members)])->filter()->join(' · '),
        ];
    }

    /** @return array{ready: bool, message: string, champions: Collection<int, array<string, mixed>>} */
    private function embuGeneration(EventMatchCategory $category, int $requiredChampionCount): array
    {
        $rankings = $this->embuResults->finalRankings($category);
        $topRankings = $rankings->take($requiredChampionCount)->values();

        if ($requiredChampionCount < 1 || $topRankings->count() < $requiredChampionCount) {
            return $this->unavailableGeneration('Peserta babak final belum lengkap untuk membentuk juara.');
        }

        if ($topRankings->contains(fn (array $row): bool => $row['total_score'] === null)) {
            return $this->unavailableGeneration('Seluruh nilai penyisihan dan final harus selesai sebelum juara dibuat.');
        }

        if ($this->embuResults->hasTopFourTie($topRankings)) {
            return $this->unavailableGeneration('Masih ada nilai seri yang belum terpecahkan pada posisi juara. Lakukan tie-break terlebih dahulu.');
        }

        $champions = $topRankings->map(function (array $row, int $index): ?array {
            $participant = $this->participantData($row['metadata'] ?? [], $row['participant_label'] ?? null);

            return $participant ? [
                'rank' => $index + 1,
                'participant_key' => $participant['key'],
                'label' => $participant['label'],
                'basis' => 'Akumulasi '.number_format((float) $row['total_score'], 2, ',', '.'),
            ] : null;
        })->filter()->values();

        if ($champions->count() !== $requiredChampionCount || $champions->pluck('participant_key')->unique()->count() !== $requiredChampionCount) {
            return $this->unavailableGeneration('Identitas peserta final belum lengkap atau masih terduplikasi.');
        }

        return [
            'ready' => true,
            'message' => 'Urutan otomatis dihitung dari akumulasi nilai dan aturan tie-break Juri 1.',
            'champions' => $champions,
        ];
    }

    /** @return array{ready: bool, message: string, champions: Collection<int, array<string, mixed>>} */
    private function randoriGeneration(EventMatchCategory $category, int $requiredChampionCount): array
    {
        $matches = $category->tournamentDrawing?->matches ?? collect();
        $format = $category->tournamentDrawing?->bracket_type;
        $ranked = collect();

        if ($format === 'round_robin') {
            $participants = $this->participants($category);
            $scores = $participants->mapWithKeys(fn (array $p): array => [
                (string) $p['entry_id'] => [
                    'participant' => $p,
                    'wins' => 0,
                    'matches' => 0,
                ],
            ])->all();

            $completedCount = 0;
            foreach ($matches as $match) {
                $outcome = $this->randoriOutcome($match);
                if ($outcome) {
                    $completedCount++;
                    $wEntryId = (string) ($outcome['winner']['entry_id'] ?? '');
                    if ($wEntryId !== '' && isset($scores[$wEntryId])) {
                        $scores[$wEntryId]['wins']++;
                        $scores[$wEntryId]['matches']++;
                    }
                    $lEntryId = (string) ($outcome['loser']['entry_id'] ?? '');
                    if ($lEntryId !== '' && isset($scores[$lEntryId])) {
                        $scores[$lEntryId]['matches']++;
                    }
                }
            }

            if ($matches->count() === 0 || $completedCount < $matches->count()) {
                return $this->unavailableGeneration("Pertandingan Setengah Kompetisi belum selesai ({$completedCount}/{$matches->count()} partai selesai). Selesaikan seluruh partai terlebih dahulu.");
            }

            uasort($scores, fn (array $a, array $b): int => $b['wins'] <=> $a['wins']);

            $rank = 1;
            foreach ($scores as $item) {
                $ranked->push($this->rankedParticipant(
                    $rank,
                    $item['participant'],
                    "Peringkat {$rank} Setengah Kompetisi ({$item['wins']} menang)",
                ));
                $rank++;
            }
        } elseif ($format === 'double_elimination') {
            $gf2 = $matches->firstWhere('round_label', 'Grand Final Ulang (GF2)');
            $grandFinal = $matches->firstWhere('round_label', 'Grand Final');
            $lowerFinal = $matches->firstWhere('round_label', 'Final Lower Bracket');
            $lowerRound = $matches->firstWhere('round_label', 'Lower Bracket · Babak 1');

            $gf2Outcome = ($gf2 && $gf2->status === 'completed' && ! $gf2->is_bye && $gf2->winner_corner)
                ? $this->randoriOutcome($gf2)
                : null;
            $grandFinalOutcome = $this->randoriOutcome($grandFinal);
            $lowerFinalOutcome = $this->randoriOutcome($lowerFinal);
            $lowerRoundOutcome = $this->randoriOutcome($lowerRound);

            if ($gf2Outcome) {
                $ranked->push($this->rankedParticipant(1, $gf2Outcome['winner'], 'Pemenang Grand Final Ulang (GF2)'));
                $ranked->push($this->rankedParticipant(2, $gf2Outcome['loser'], 'Runner-up Grand Final Ulang (GF2)'));
            } elseif ($grandFinalOutcome) {
                $ranked->push($this->rankedParticipant(1, $grandFinalOutcome['winner'], 'Pemenang Grand Final'));
                $ranked->push($this->rankedParticipant(2, $grandFinalOutcome['loser'], 'Runner-up Grand Final'));
            }
            if ($requiredChampionCount >= 3 && $lowerFinalOutcome) {
                $ranked->push($this->rankedParticipant(3, $lowerFinalOutcome['loser'], 'Gugur di Final Lower Bracket'));
            }
            if ($requiredChampionCount >= 4 && $lowerRoundOutcome) {
                $ranked->push($this->rankedParticipant(4, $lowerRoundOutcome['loser'], 'Gugur di Lower Bracket'));
            }
        } else {
            /** @var TournamentMatch|null $final */
            $final = $matches->where('phase', 'final')->sortByDesc('match_sequence')->first();
            $finalOutcome = $this->randoriOutcome($final);

            if ($finalOutcome) {
                $ranked->push($this->rankedParticipant(1, $finalOutcome['winner'], 'Pemenang Final'));
                $ranked->push($this->rankedParticipant(2, $finalOutcome['loser'], 'Runner-up Final'));
            }

            if ($requiredChampionCount >= 3 && $final) {
                $semifinalLosers = $matches
                    ->where('next_match_id', $final->id)
                    ->sortBy('match_sequence')
                    ->map(function (TournamentMatch $match): ?array {
                        $outcome = $this->randoriOutcome($match);

                        return $outcome['loser'] ?? null;
                    })
                    ->filter()
                    ->values();

                foreach ($semifinalLosers->take(2) as $index => $participant) {
                    $ranked->push($this->rankedParticipant($index + 3, $participant, 'Semifinalis'));
                }
            }
        }

        $champions = $ranked->filter()->take($requiredChampionCount)->values();

        if ($requiredChampionCount < 1 || $champions->count() !== $requiredChampionCount) {
            return $this->unavailableGeneration('Bagan akhir Randori belum selesai. Lengkapi Grand Final dan jalur perebutan peringkat terlebih dahulu.');
        }

        if ($champions->pluck('participant_key')->unique()->count() !== $requiredChampionCount) {
            return $this->unavailableGeneration('Hasil bagan menghasilkan peserta ganda. Periksa kembali routing Upper/Lower Bracket.');
        }

        return [
            'ready' => true,
            'message' => 'Urutan otomatis dibaca dari pemenang Final dan peserta yang gugur pada jalur akhir bagan.',
            'champions' => $champions,
        ];
    }

    /** @return array{winner: array<string, mixed>, loser: array<string, mixed>}|null */
    private function randoriOutcome(?TournamentMatch $match): ?array
    {
        $winnerCorner = $match?->randoriScore?->winner_corner;
        if (! $match || ! in_array($winnerCorner, ['aka', 'shiro'], true)) {
            return null;
        }

        $metadata = $match->metadata ?? [];
        $winnerKey = $winnerCorner === 'aka' ? 'red' : 'blue';
        $loserKey = $winnerCorner === 'aka' ? 'blue' : 'red';

        if (! is_array($metadata[$winnerKey] ?? null) || ! is_array($metadata[$loserKey] ?? null)) {
            return null;
        }

        return [
            'winner' => $metadata[$winnerKey],
            'loser' => $metadata[$loserKey],
        ];
    }

    /** @param array<string, mixed> $metadata @return array<string, mixed>|null */
    private function rankedParticipant(int $rank, array $metadata, string $basis): ?array
    {
        $participant = $this->participantData($metadata);

        return $participant ? [
            'rank' => $rank,
            'participant_key' => $participant['key'],
            'label' => $participant['label'],
            'basis' => $basis,
        ] : null;
    }

    /** @return Collection<int, array<string, mixed>> */
    private function currentChampions(Event $event, EventMatchCategory $category): Collection
    {
        $participants = $this->participants($category);

        return $this->resultQuery($event, $category)
            ->with('athlete:id,name')
            ->orderBy('rank')
            ->get()
            ->map(fn (TournamentResult $result): array => [
                'id' => $result->id,
                'rank' => $result->rank->value,
                'rank_label' => $result->rank->label(),
                'participant_key' => $this->resultParticipantKey($result, $participants),
                'label' => $participants->firstWhere('key', $result->participant_key)['label']
                    ?? $result->athlete?->name
                    ?? $result->contingent_name,
                'contingent_name' => $result->contingent_name,
                'is_exhibition' => (bool) $result->is_exhibition,
            ])
            ->filter(fn (array $champion): bool => $champion['participant_key'] !== null)
            ->values();
    }

    /** @param Collection<int, array<string, mixed>> $participants */
    private function resultParticipantKey(TournamentResult $result, Collection $participants): ?string
    {
        if ($result->participant_key && $participants->contains('key', $result->participant_key)) {
            return $result->participant_key;
        }

        return $participants->first(function (array $participant) use ($result): bool {
            if ($result->athlete_id && $participant['athlete_id'] === $result->athlete_id) {
                return true;
            }

            if ($result->contingent_id && $participant['contingent_id'] === $result->contingent_id) {
                return true;
            }

            return $participant['contingent_name'] === $result->contingent_name
                || $participant['label'] === $result->contingent_name;
        })['key'] ?? null;
    }

    /** @return Builder<TournamentResult> */
    private function resultQuery(Event $event, EventMatchCategory $category): Builder
    {
        return TournamentResult::query()
            ->whereBelongsTo($event)
            ->where(function ($query) use ($category): void {
                $query->where('event_match_category_id', $category->id)
                    ->orWhere(function ($legacy) use ($category): void {
                        $legacy->whereNull('event_match_category_id')
                            ->where('match_category', $category->name);
                    });
            });
    }

    /** @return array{ready: false, message: string, champions: Collection<int, array<string, mixed>>} */
    private function unavailableGeneration(string $message): array
    {
        return [
            'ready' => false,
            'message' => $message,
            'champions' => collect(),
        ];
    }
}
