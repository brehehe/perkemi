<?php

namespace App\Services\Panitera;

use App\Events\EmbuTiebreakUpdated;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmbuResultService
{
    /**
     * @return Collection<string, Collection<int, array<string, mixed>>>
     */
    public function preliminaryRankings(EventMatchCategory $category): Collection
    {
        return $this->matchesFor($category, 'preliminary')
            ->groupBy(fn (array $row): string => $row['pool'] ?: 'A')
            ->map(fn (Collection $rows): Collection => $this->sortRows($rows));
    }

    /** @return Collection<int, array<string, mixed>> */
    public function finalRankings(EventMatchCategory $category): Collection
    {
        $preliminary = $this->matchesFor($category, 'preliminary')
            ->keyBy(fn (array $row): string => $this->participantIdentity($row));

        $rows = $this->matchesFor($category, 'final')
            ->reject(fn (array $row): bool => (bool) ($row['metadata']['placeholder'] ?? false))
            ->map(function (array $row) use ($preliminary): array {
                $preliminaryRow = $preliminary->get($this->participantIdentity($row));
                $preliminaryScore = $preliminaryRow['score']['final_score'] ?? null;
                $finalScore = $row['score']['final_score'] ?? null;

                $totalScore = $preliminaryScore !== null && $finalScore !== null
                    ? round((float) $preliminaryScore + (float) $finalScore, 2)
                    : ($finalScore !== null ? (float) $finalScore : null);

                return [
                    ...$row,
                    'preliminary_score' => $preliminaryScore,
                    'final_round_score' => $finalScore,
                    'total_score' => $totalScore,

                    // Parameter 1: Total Nilai Akumulasi (Penyisihan + Final)
                    'param1_total_score' => $totalScore,

                    // Parameter 2: Nilai Teknik 3 Wasit Tidak Dicoret
                    'final_middle_technique_sum' => $row['middle_technique_sum'] ?? null,
                    'preliminary_middle_technique_sum' => $preliminaryRow['middle_technique_sum'] ?? null,

                    // Parameter 3: Nilai Keseluruhan Wasit Utama
                    'final_chief_judge_total' => $row['chief_judge_total'] ?? null,
                    'preliminary_chief_judge_total' => $preliminaryRow['chief_judge_total'] ?? null,

                    // Parameter 4: Nilai Teknik Wasit Utama
                    'final_chief_judge_technique' => $row['chief_judge_technique'] ?? null,
                    'preliminary_chief_judge_technique' => $preliminaryRow['chief_judge_technique'] ?? null,

                    // Parameter 5: Keputusan Manual Wasit Utama / Arbitrase / Panitera khusus Babak Final
                    'manual_rank' => $row['manual_rank'] ?? null,
                    'manual_tiebreak_winner' => (bool) ($row['metadata']['manual_tiebreak_winner'] ?? false),

                    // Legacy compatibility fields
                    'preliminary_judge_one' => $preliminaryRow['judge_one'] ?? null,
                    'preliminary_judge_two' => $preliminaryRow['judge_two'] ?? null,
                    'preliminary_raw_score' => $preliminaryRow['raw_score'] ?? null,
                    'final_judge_one' => $row['judge_one'],
                    'final_judge_two' => $row['judge_two'],
                    'final_raw_score' => $row['raw_score'],
                ];
            });

        return $rows->sort(function (array $left, array $right): int {
            // Parameter 1: Total Nilai Akumulasi (Penyisihan + Final)
            $cmp1 = $this->compareNullableDesc($left['total_score'], $right['total_score']);
            if ($cmp1 !== 0) {
                return $cmp1;
            }

            // Parameter 2: Nilai Penguasaan Teknik 3 Wasit Tidak Dicoret Babak Final, lalu Penyisihan
            $cmp2 = $this->compareNullableDesc($left['final_middle_technique_sum'], $right['final_middle_technique_sum'])
                ?: $this->compareNullableDesc($left['preliminary_middle_technique_sum'], $right['preliminary_middle_technique_sum']);
            if ($cmp2 !== 0) {
                return $cmp2;
            }

            // Parameter 3: Nilai Keseluruhan Wasit Utama Babak Final, lalu Penyisihan
            $cmp3 = $this->compareNullableDesc($left['final_chief_judge_total'], $right['final_chief_judge_total'])
                ?: $this->compareNullableDesc($left['preliminary_chief_judge_total'], $right['preliminary_chief_judge_total']);
            if ($cmp3 !== 0) {
                return $cmp3;
            }

            // Parameter 4: Nilai Penguasaan Teknik Wasit Utama Babak Final, lalu Penyisihan
            $cmp4 = $this->compareNullableDesc($left['final_chief_judge_technique'], $right['final_chief_judge_technique'])
                ?: $this->compareNullableDesc($left['preliminary_chief_judge_technique'], $right['preliminary_chief_judge_technique']);
            if ($cmp4 !== 0) {
                return $cmp4;
            }

            // Legacy fallback if technique data was not captured
            $cmpLegacy = ($this->compareNullableDesc($left['final_judge_one'], $right['final_judge_one'])
                ?: $this->compareNullableDesc($left['preliminary_judge_one'], $right['preliminary_judge_one']))
                ?: (($this->compareNullableDesc($left['final_raw_score'], $right['final_raw_score'])
                ?: $this->compareNullableDesc($left['preliminary_raw_score'], $right['preliminary_raw_score']))
                ?: ($this->compareNullableDesc($left['final_judge_two'], $right['final_judge_two'])
                ?: $this->compareNullableDesc($left['preliminary_score'], $right['preliminary_score'])));

            if ($cmpLegacy !== 0 && ($left['final_middle_technique_sum'] === null || $right['final_middle_technique_sum'] === null)) {
                return $cmpLegacy;
            }

            // Parameter 5: Keputusan Manual Wasit Utama / Arbitrase / Panitera
            $leftRank = $left['manual_rank'] ?? null;
            $rightRank = $right['manual_rank'] ?? null;
            if ($leftRank !== null && $rightRank !== null && $leftRank !== $rightRank) {
                return (int) $leftRank <=> (int) $rightRank;
            }
            if ($leftRank !== null && $rightRank === null) {
                return -1;
            }
            if ($leftRank === null && $rightRank !== null) {
                return 1;
            }

            $leftManual = (bool) ($left['manual_tiebreak_winner'] ?? false);
            $rightManual = (bool) ($right['manual_tiebreak_winner'] ?? false);
            if ($leftManual !== $rightManual) {
                return $leftManual ? -1 : 1;
            }

            return strcmp($left['participant_label'], $right['participant_label']);
        })->values();
    }

    public function quotaPerPool(EventMatchCategory $category): int
    {
        $poolCount = $this->preliminaryRankings($category)->count();

        return match (true) {
            $poolCount <= 1 => 999,
            $poolCount === 2 => 4,
            $poolCount === 3 => 3,
            default => 2,
        };
    }

    /** @return Collection<int, array{pool: string, rank: int, next_rank: int, score: float, judge_one: float, raw_score: float, judge_two: float, match_id_a: string, match_id_b: string, label_a: string, label_b: string, scenario: string, param2_technique: float|null, param3_chief_total: float|null, param4_chief_technique: float|null}> */
    public function boundaryTies(EventMatchCategory $category): Collection
    {
        $quota = $this->quotaPerPool($category);

        if ($quota === 999) {
            return collect();
        }

        return $this->preliminaryRankings($category)
            ->map(function (Collection $rows, string $pool) use ($quota): ?array {
                $qualified = $rows->get($quota - 1);
                $next = $rows->get($quota);

                if (! $qualified || ! $next || $qualified['score'] === null || $next['score'] === null) {
                    return null;
                }

                if (! $this->isPreliminaryTied($qualified, $next)) {
                    return null;
                }

                return [
                    'pool' => $pool,
                    'rank' => $quota,
                    'next_rank' => $quota + 1,
                    'score' => (float) $qualified['score']['final_score'],
                    'judge_one' => (float) ($qualified['chief_judge_total'] ?? $qualified['judge_one'] ?? 0),
                    'raw_score' => (float) ($qualified['raw_score'] ?? 0),
                    'judge_two' => (float) ($qualified['judge_two'] ?? 0),
                    'param2_technique' => $qualified['middle_technique_sum'],
                    'param3_chief_total' => $qualified['chief_judge_total'],
                    'param4_chief_technique' => $qualified['chief_judge_technique'],
                    'match_id_a' => (string) $qualified['match_id'],
                    'match_id_b' => (string) $next['match_id'],
                    'label_a' => (string) $qualified['participant_label'],
                    'label_b' => (string) $next['participant_label'],
                    'scenario' => '5 (Keputusan Manual Wasit Utama/Arbitrase)',
                ];
            })
            ->filter()
            ->values();
    }

    /**
     * Get all ties across preliminary pools and final round requiring Parameter 5 manual resolution.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function activeTies(EventMatchCategory $category): Collection
    {
        $ties = collect();

        // Check preliminary pools
        $preliminary = $this->preliminaryRankings($category);
        foreach ($preliminary as $pool => $rows) {
            $poolRows = $rows->filter(fn (array $r): bool => $r['score'] !== null && (float) ($r['score']['final_score'] ?? 0) > 0)->values();
            $count = $poolRows->count();
            for ($i = 0; $i < $count - 1; $i++) {
                $current = $poolRows->get($i);
                $next = $poolRows->get($i + 1);
                if ($current && $next && $this->isPreliminaryTied($current, $next)) {
                    // Check if there is already a tie group containing current
                    $existingGroupIndex = $ties->search(fn ($item) => $item['phase'] === 'preliminary' && $item['pool'] === $pool && collect($item['matches'])->contains('id', $current['match_id']));

                    if ($existingGroupIndex !== false) {
                        $group = $ties->get($existingGroupIndex);
                        $summary = $this->tieMatchSummary($next, $i + 2);
                        $group['matches'][] = $summary;
                        if (! empty($summary['tiebreak_requested'])) {
                            $group['is_requested'] = true;
                            $group['requested_at'] = $summary['tiebreak_requested_at'];
                        }
                        if (empty($group['court_id']) && ! empty($summary['court_id'])) {
                            $group['court_id'] = $summary['court_id'];
                            $group['court_name'] = $summary['court_name'];
                        }
                        $ranks = collect($group['matches'])->pluck('rank')->sort()->values()->map(fn ($r) => "#{$r}");
                        $ranksText = $ranks->count() > 2
                            ? $ranks->slice(0, -1)->implode(', ').' & '.$ranks->last()
                            : $ranks->implode(' & ');
                        $group['title'] = "Penyisihan Pool {$pool} · Seri Peringkat {$ranksText}";
                        $ties->put($existingGroupIndex, $group);
                    } else {
                        $summaryCurrent = $this->tieMatchSummary($current, $i + 1);
                        $summaryNext = $this->tieMatchSummary($next, $i + 2);
                        $isRequested = ! empty($summaryCurrent['tiebreak_requested']) || ! empty($summaryNext['tiebreak_requested']);
                        $requestedAt = $summaryCurrent['tiebreak_requested_at'] ?? $summaryNext['tiebreak_requested_at'] ?? null;

                        $ranks = collect([$i + 1, $i + 2])->map(fn ($r) => "#{$r}");
                        $ranksText = $ranks->implode(' & ');

                        $courtId = $summaryCurrent['court_id'] ?? $summaryNext['court_id'] ?? null;
                        $courtName = $summaryCurrent['court_name'] ?? $summaryNext['court_name'] ?? null;

                        $ties->push([
                            'id' => "preliminary-{$pool}-".($i + 1),
                            'category_id' => $category->id,
                            'event_id' => $category->event_id,
                            'category_name' => $category->name,
                            'phase' => 'preliminary',
                            'pool' => $pool,
                            'court_id' => $courtId,
                            'court_name' => $courtName,
                            'title' => "Penyisihan Pool {$pool} · Seri Peringkat {$ranksText}",
                            'is_requested' => $isRequested,
                            'requested_at' => $requestedAt,
                            'matches' => [
                                $summaryCurrent,
                                $summaryNext,
                            ],
                        ]);
                    }
                }
            }
        }

        // Check final round
        $finalRows = $this->finalRankings($category)->filter(fn (array $r): bool => $r['total_score'] !== null && (float) $r['total_score'] > 0)->values();
        $finalCount = $finalRows->count();
        for ($i = 0; $i < $finalCount - 1; $i++) {
            $current = $finalRows->get($i);
            $next = $finalRows->get($i + 1);
            if ($current && $next && $this->isFinalTied($current, $next)) {
                $existingGroupIndex = $ties->search(fn ($item) => $item['phase'] === 'final' && collect($item['matches'])->contains('id', $current['match_id']));

                if ($existingGroupIndex !== false) {
                    $group = $ties->get($existingGroupIndex);
                    $summary = $this->tieMatchSummary($next, $i + 2);
                    $group['matches'][] = $summary;
                    if (! empty($summary['tiebreak_requested'])) {
                        $group['is_requested'] = true;
                        $group['requested_at'] = $summary['tiebreak_requested_at'];
                    }
                    if (empty($group['court_id']) && ! empty($summary['court_id'])) {
                        $group['court_id'] = $summary['court_id'];
                        $group['court_name'] = $summary['court_name'];
                    }
                    $ranks = collect($group['matches'])->pluck('rank')->sort()->values()->map(fn ($r) => "#{$r}");
                    $ranksText = $ranks->count() > 2
                        ? $ranks->slice(0, -1)->implode(', ').' & '.$ranks->last()
                        : $ranks->implode(' & ');
                    $group['title'] = "Babak Final · Seri Peringkat {$ranksText}";
                    $ties->put($existingGroupIndex, $group);
                } else {
                    $summaryCurrent = $this->tieMatchSummary($current, $i + 1);
                    $summaryNext = $this->tieMatchSummary($next, $i + 2);
                    $isRequested = ! empty($summaryCurrent['tiebreak_requested']) || ! empty($summaryNext['tiebreak_requested']);
                    $requestedAt = $summaryCurrent['tiebreak_requested_at'] ?? $summaryNext['tiebreak_requested_at'] ?? null;

                    $ranks = collect([$i + 1, $i + 2])->map(fn ($r) => "#{$r}");
                    $ranksText = $ranks->implode(' & ');

                    $courtId = $summaryCurrent['court_id'] ?? $summaryNext['court_id'] ?? null;
                    $courtName = $summaryCurrent['court_name'] ?? $summaryNext['court_name'] ?? null;

                    $ties->push([
                        'id' => 'final-'.($i + 1),
                        'category_id' => $category->id,
                        'event_id' => $category->event_id,
                        'category_name' => $category->name,
                        'phase' => 'final',
                        'pool' => 'F',
                        'court_id' => $courtId,
                        'court_name' => $courtName,
                        'title' => "Babak Final · Seri Peringkat {$ranksText}",
                        'is_requested' => $isRequested,
                        'requested_at' => $requestedAt,
                        'matches' => [
                            $summaryCurrent,
                            $summaryNext,
                        ],
                    ]);
                }
            }
        }

        return $ties->values();
    }

    public function advanceFinalists(EventMatchCategory $category): int
    {
        $ties = $this->boundaryTies($category);
        if ($ties->isNotEmpty()) {
            throw ValidationException::withMessages([
                'category' => 'Ada nilai seri di batas kuota (Parameter 1-4 identik). Tetapkan keputusan manual Wasit Utama/Arbitrase terlebih dahulu.',
            ]);
        }

        $rankings = $this->preliminaryRankings($category);
        $updated = 0;

        DB::transaction(function () use ($category, $rankings, &$updated): void {
            $finalMatches = TournamentMatch::query()
                ->where('event_match_category_id', $category->id)
                ->where('phase', 'final')
                ->lockForUpdate()
                ->get();

            foreach ($finalMatches as $finalMatch) {
                $sourcePool = $finalMatch->metadata['source_pool'] ?? null;
                $sourceRank = (int) ($finalMatch->metadata['source_rank'] ?? 0);

                if (! $sourcePool || $sourceRank < 1) {
                    continue;
                }

                $source = $rankings->get($sourcePool)?->get($sourceRank - 1);
                if (! $source || $source['score'] === null) {
                    throw ValidationException::withMessages([
                        'category' => "Nilai Pool {$sourcePool} belum lengkap untuk menentukan finalis.",
                    ]);
                }

                $metadata = $source['metadata'];
                $metadata['placeholder'] = false;
                $metadata['source_pool'] = $sourcePool;
                $metadata['source_rank'] = $sourceRank;

                if ($this->participantIdentity([
                    'metadata' => $finalMatch->metadata ?? [],
                    'participant_entry_id' => $finalMatch->participant_entry_id,
                ]) !== $this->participantIdentity($source)) {
                    EmbuScore::query()->where('tournament_match_id', $finalMatch->id)->delete();
                }

                $finalMatch->update([
                    'participant_entry_id' => $source['participant_entry_id'],
                    'participant_label' => $source['participant_label'],
                    'metadata' => $metadata,
                ]);
                $updated++;
            }
        });

        return $updated;
    }

    /** @return Collection<int, TournamentResult> */
    public function confirmChampions(Event $event, EventMatchCategory $category): Collection
    {
        $requiredChampionCount = min(4, (int) $category->tournamentDrawing?->participant_count);
        $rankings = $this->finalRankings($category)->take($requiredChampionCount)->values();

        if ($requiredChampionCount < 1 || $rankings->count() < $requiredChampionCount || $rankings->contains(fn (array $row): bool => $row['total_score'] === null)) {
            throw ValidationException::withMessages([
                'category' => 'Nilai final peserta juara belum lengkap.',
            ]);
        }

        if ($this->hasTopFourTie($rankings)) {
            throw ValidationException::withMessages([
                'category' => 'Masih ada nilai seri pada posisi juara (Parameter 1-4 identik). Tetapkan keputusan manual Wasit Utama/Arbitrase terlebih dahulu.',
            ]);
        }

        return DB::transaction(function () use ($event, $category, $rankings): Collection {
            TournamentResult::query()
                ->whereBelongsTo($event)
                ->where(function ($query) use ($category): void {
                    $query->where('event_match_category_id', $category->id)
                        ->orWhere(function ($legacy) use ($category): void {
                            $legacy->whereNull('event_match_category_id')
                                ->where('match_category', $category->name);
                        });
                })
                ->delete();

            return $rankings->map(function (array $row, int $index) use ($event, $category): TournamentResult {
                return TournamentResult::create([
                    'event_id' => $event->id,
                    'event_match_category_id' => $category->id,
                    'participant_key' => $row['metadata']['key']
                        ?? $row['metadata']['entry_id']
                        ?? collect($row['metadata']['athlete_ids'] ?? [])->first(),
                    'contingent_id' => $row['metadata']['contingent_id'] ?? null,
                    'athlete_id' => collect($row['metadata']['athlete_ids'] ?? [])->first(),
                    'contingent_name' => $row['metadata']['contingent_name'] ?? $row['participant_label'],
                    'rank' => $index + 1,
                    'match_category' => $category->name,
                    'is_exhibition' => (bool) $category->is_exhibition || (int) $category->tournamentDrawing?->participant_count <= 3,
                ]);
            });
        });
    }

    /** @param Collection<int, array<string, mixed>> $rankings */
    public function hasTopFourTie(Collection $rankings): bool
    {
        return $rankings->take(4)->values()->contains(function (array $row, int $index) use ($rankings): bool {
            $next = $rankings->get($index + 1);

            if ($next === null || $row['total_score'] === null || $next['total_score'] === null) {
                return false;
            }

            return $this->isFinalTied($row, $next);
        });
    }

    public function setManualTiebreakWinner(TournamentMatch $winnerMatch, ?TournamentMatch $tiedMatch = null): void
    {
        DB::transaction(function () use ($winnerMatch, $tiedMatch): void {
            if ($tiedMatch) {
                $tiedMetadata = $tiedMatch->metadata ?? [];
                $tiedMetadata['manual_tiebreak_winner'] = false;
                $tiedMetadata['manual_rank'] = 2;
                $tiedMatch->update(['metadata' => $tiedMetadata]);
            }

            $winnerMetadata = $winnerMatch->metadata ?? [];
            $winnerMetadata['manual_tiebreak_winner'] = true;
            $winnerMetadata['manual_rank'] = 1;
            $winnerMatch->update(['metadata' => $winnerMetadata]);
        });
    }

    /**
     * Assign explicit ranking order (Parameter 5) for multiple tied participants.
     *
     * @param  array<string, int>|list<string>  $ranks  Map of match_id => rank or list of match_ids in order of rank 1, 2, 3...
     */
    public function resolveTiebreakRanks(EventMatchCategory $category, array $ranks): void
    {
        DB::transaction(function () use ($category, $ranks): void {
            $isAssociative = array_keys($ranks) !== range(0, count($ranks) - 1);
            $normalized = [];

            if ($isAssociative) {
                foreach ($ranks as $matchId => $rank) {
                    $normalized[(string) $matchId] = (int) $rank;
                }
            } else {
                foreach ($ranks as $index => $matchId) {
                    $normalized[(string) $matchId] = $index + 1;
                }
            }

            $minTieRank = ! empty($normalized) ? min($normalized) : 1;

            foreach ($normalized as $matchId => $rank) {
                $match = TournamentMatch::query()
                    ->where('event_match_category_id', $category->id)
                    ->whereKey($matchId)
                    ->first();

                if ($match) {
                    $metadata = $match->metadata ?? [];
                    $metadata['manual_rank'] = $rank;
                    $metadata['manual_tiebreak_rank'] = $rank;
                    $metadata['manual_tiebreak_winner'] = ($rank === $minTieRank);
                    $metadata['manual_tiebreak_decided_at'] = now()->toIso8601String();
                    $metadata['tiebreak_requested'] = false;
                    $match->update(['metadata' => $metadata]);
                }
            }

            // Broadcast real-time Reverb event to Wasit Utama and Panitera
            $matchIds = array_keys($normalized);
            $courtIds = TournamentMatch::query()
                ->whereIn('id', $matchIds)
                ->pluck('event_court_id')
                ->filter()
                ->unique()
                ->values()
                ->all();

            EmbuTiebreakUpdated::dispatch(
                (string) $category->event_id,
                (string) $category->id,
                'resolved',
                $matchIds,
                $courtIds,
                $normalized,
            );
        });
    }

    /**
     * Mark a set of tied matches as requested (or cancelled) for Chief Judge decision.
     *
     * @param  list<string>  $matchIds
     */
    public function setTiebreakRequested(EventMatchCategory $category, array $matchIds, bool $requested = true): void
    {
        DB::transaction(function () use ($category, $matchIds, $requested): void {
            TournamentMatch::query()
                ->where('event_match_category_id', $category->id)
                ->whereIn('id', $matchIds)
                ->each(function (TournamentMatch $match) use ($requested): void {
                    $metadata = $match->metadata ?? [];
                    $metadata['tiebreak_requested'] = $requested;
                    if ($requested) {
                        $metadata['tiebreak_requested_at'] = now()->toIso8601String();
                    } else {
                        unset($metadata['tiebreak_requested_at']);
                    }
                    $match->update(['metadata' => $metadata]);
                });

            // Broadcast real-time Reverb event to Wasit Utama and Panitera
            $courtIds = TournamentMatch::query()
                ->whereIn('id', $matchIds)
                ->pluck('event_court_id')
                ->filter()
                ->unique()
                ->values()
                ->all();

            EmbuTiebreakUpdated::dispatch(
                (string) $category->event_id,
                (string) $category->id,
                $requested ? 'requested' : 'cancelled',
                $matchIds,
                $courtIds,
            );
        });
    }

    /** @return Collection<int, array<string, mixed>> */
    private function matchesFor(EventMatchCategory $category, string $phase): Collection
    {
        return TournamentMatch::query()
            ->where('event_match_category_id', $category->id)
            ->where('phase', $phase)
            ->with(['embuScores', 'embuJudgeScores', 'court:id,name'])
            ->orderBy('match_sequence')
            ->get()
            ->map(function (TournamentMatch $match): array {
                /** @var EmbuScore|null $score */
                $score = $match->embuScores->first();
                $judgeScores = $score
                    ? collect($score->judge_scores)->map(fn ($value): float => (float) $value)->values()->all()
                    : [];

                $judgeNumbers = data_get($match->metadata, 'panitera.result_judge_numbers');
                if (! is_array($judgeNumbers) || count($judgeNumbers) !== count($judgeScores)) {
                    $judgeNumbers = $judgeScores === [] ? [] : range(1, count($judgeScores));
                }

                $tiebreakRound = $score?->tiebreak_round ?? 0;
                $judgeScoreRecords = $match->embuJudgeScores
                    ->where('tiebreak_round', $tiebreakRound)
                    ->sortBy('judge_number')
                    ->values();

                $storedTechScores = data_get($match->metadata, 'panitera.judge_technique_scores', []);

                $judgesList = collect();
                if ($judgeScoreRecords->isNotEmpty()) {
                    $judgesList = $judgeScoreRecords->map(fn (EmbuJudgeScore $r): array => [
                        'judge_number' => (int) $r->judge_number,
                        'role' => (string) $r->role,
                        'total_score' => (float) $r->total_score,
                        'technique_subtotal' => (float) $r->technique_subtotal,
                        'expression_subtotal' => (float) $r->expression_subtotal,
                    ])->values();
                } elseif ($judgeScores !== []) {
                    $judgesList = collect($judgeScores)->map(function (float $val, int $idx) use ($judgeNumbers, $storedTechScores): array {
                        $jNum = $judgeNumbers[$idx] ?? ($idx + 1);
                        $tech = isset($storedTechScores[$idx]) ? (float) $storedTechScores[$idx] : null;

                        return [
                            'judge_number' => (int) $jNum,
                            'role' => $jNum === 1 ? 'chief_judge' : 'judge',
                            'total_score' => (float) $val,
                            'technique_subtotal' => $tech,
                            'expression_subtotal' => $tech !== null ? max(0, (float) $val - $tech) : null,
                        ];
                    })->values();
                }

                // Wasit Utama (Chief Judge / Wasit 1)
                $chiefJudge = $judgesList->firstWhere('role', 'chief_judge') ?? $judgesList->firstWhere('judge_number', 1);
                $chiefJudgeTotal = $chiefJudge && $chiefJudge['total_score'] !== null ? (float) $chiefJudge['total_score'] : null;
                $chiefJudgeTechnique = $chiefJudge && $chiefJudge['technique_subtotal'] !== null ? (float) $chiefJudge['technique_subtotal'] : null;

                // Wasit 2 (legacy support)
                $judgeTwoRecord = $judgesList->firstWhere('judge_number', 2);
                $judgeTwo = $judgeTwoRecord ? (float) $judgeTwoRecord['total_score'] : null;

                // Trimming & Middle Judges (Parameter 1 & Parameter 2)
                $middleJudgeNumbers = [];
                $trimmedJudgeNumbers = [];
                $middleTechniqueSum = null;

                if ($judgesList->count() === 5) {
                    // Stable sort by total_score ascending, tie-breaker judge_number
                    $sortedJudges = $judgesList->sortBy(fn (array $j): array => [$j['total_score'], $j['judge_number']])->values();
                    $minJudge = $sortedJudges->first();
                    $maxJudge = $sortedJudges->last();
                    $middleJudges = $sortedJudges->slice(1, 3)->values();

                    $trimmedJudgeNumbers = [$minJudge['judge_number'], $maxJudge['judge_number']];
                    $middleJudgeNumbers = $middleJudges->pluck('judge_number')->all();

                    $hasAllMiddleTech = $middleJudges->every(fn (array $j): bool => $j['technique_subtotal'] !== null);
                    if ($hasAllMiddleTech) {
                        $middleTechniqueSum = round((float) $middleJudges->sum('technique_subtotal'), 2);
                    }
                } elseif ($judgesList->isNotEmpty()) {
                    $middleJudgeNumbers = $judgesList->pluck('judge_number')->all();
                    $hasAllTech = $judgesList->every(fn (array $j): bool => $j['technique_subtotal'] !== null);
                    if ($hasAllTech) {
                        $middleTechniqueSum = round((float) $judgesList->sum('technique_subtotal'), 2);
                    }
                }

                $rawScore = $judgesList->isNotEmpty()
                    ? (float) $judgesList->sum('total_score')
                    : ($judgeScores !== [] ? (float) array_sum($judgeScores) : null);

                $manualRank = isset($match->metadata['manual_rank']) && is_numeric($match->metadata['manual_rank'])
                    ? (int) $match->metadata['manual_rank']
                    : null;
                $manualWinner = (bool) ($match->metadata['manual_tiebreak_winner'] ?? false);

                return [
                    'match_id' => $match->id,
                    'phase' => $match->phase,
                    'pool' => $match->pool,
                    'sequence' => $match->match_sequence,
                    'court_id' => $match->event_court_id,
                    'court' => $match->court?->name,
                    'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                    'participant_entry_id' => $match->participant_entry_id,
                    'participant_label' => $match->participant_label ?? 'Peserta belum ditentukan',
                    'metadata' => $match->metadata ?? [],

                    // 5 PB PERKEMI Parameters
                    'param1_score' => $score ? (float) $score->final_score : null,
                    'param2_technique' => $middleTechniqueSum,
                    'param3_chief_total' => $chiefJudgeTotal,
                    'param4_chief_technique' => $chiefJudgeTechnique,
                    'param5_manual_rank' => $manualRank,

                    'middle_technique_sum' => $middleTechniqueSum,
                    'chief_judge_total' => $chiefJudgeTotal,
                    'chief_judge_technique' => $chiefJudgeTechnique,
                    'middle_judge_numbers' => $middleJudgeNumbers,
                    'trimmed_judge_numbers' => $trimmedJudgeNumbers,
                    'judges_breakdown' => $judgesList->all(),

                    'judge_one' => $chiefJudgeTotal,
                    'judge_two' => $judgeTwo,
                    'raw_score' => $rawScore,
                    'manual_rank' => $manualRank,
                    'manual_tiebreak_winner' => $manualWinner,

                    'score' => $score ? [
                        'id' => $score->id,
                        'tiebreak_round' => $score->tiebreak_round,
                        'judge_scores' => $judgeScores,
                        'judge_numbers' => $judgeNumbers,
                        'duration_seconds' => $score->duration_seconds,
                        'time_penalty' => (float) $score->time_penalty,
                        'violation_penalty' => (float) $score->violation_penalty,
                        'total_penalty' => $score->effectiveTotalPenalty(),
                        'middle_score' => (float) $score->middle_score,
                        'final_score' => (float) $score->final_score,
                        'is_disqualified' => (bool) $score->is_disqualified,
                        'disqualification_reason' => $score->disqualification_reason,
                        'status' => $score->status,
                    ] : null,
                ];
            });
    }

    /** @param Collection<int, array<string, mixed>> $rows @return Collection<int, array<string, mixed>> */
    private function sortRows(Collection $rows): Collection
    {
        return $rows->sort(function (array $left, array $right): int {
            // Parameter 1: Nilai Akhir (Trimmed Mean - Denda)
            $cmp1 = $this->compareNullableDesc($left['score']['final_score'] ?? null, $right['score']['final_score'] ?? null);
            if ($cmp1 !== 0) {
                return $cmp1;
            }

            // Parameter 2: Jumlah Nilai Penguasaan Teknik dari 3 Wasit yang TIDAK dicoret
            $cmp2 = $this->compareNullableDesc($left['middle_technique_sum'] ?? null, $right['middle_technique_sum'] ?? null);
            if ($cmp2 !== 0) {
                return $cmp2;
            }

            // Parameter 3: Nilai Keseluruhan Wasit Utama (meskipun Wasit Utama dicoret di Param 1)
            $cmp3 = $this->compareNullableDesc($left['chief_judge_total'] ?? null, $right['chief_judge_total'] ?? null);
            if ($cmp3 !== 0) {
                return $cmp3;
            }

            // Parameter 4: Nilai Penguasaan Teknik Khusus Wasit Utama
            $cmp4 = $this->compareNullableDesc($left['chief_judge_technique'] ?? null, $right['chief_judge_technique'] ?? null);
            if ($cmp4 !== 0) {
                return $cmp4;
            }

            // Legacy fallback if technique scores are null
            $cmpLegacyRaw = $this->compareNullableDesc($left['raw_score'] ?? null, $right['raw_score'] ?? null);
            if ($cmpLegacyRaw !== 0 && ($left['middle_technique_sum'] === null || $right['middle_technique_sum'] === null)) {
                return $cmpLegacyRaw;
            }
            $cmpLegacyJudgeTwo = $this->compareNullableDesc($left['judge_two'] ?? null, $right['judge_two'] ?? null);
            if ($cmpLegacyJudgeTwo !== 0 && ($left['middle_technique_sum'] === null || $right['middle_technique_sum'] === null)) {
                return $cmpLegacyJudgeTwo;
            }

            // Parameter 5: Keputusan Manual Wasit Utama / Dewan Arbitrase / Panitera
            $leftRank = $left['manual_rank'] ?? null;
            $rightRank = $right['manual_rank'] ?? null;
            if ($leftRank !== null && $rightRank !== null && $leftRank !== $rightRank) {
                return (int) $leftRank <=> (int) $rightRank;
            }
            if ($leftRank !== null && $rightRank === null) {
                return -1;
            }
            if ($leftRank === null && $rightRank !== null) {
                return 1;
            }

            $leftManual = (bool) ($left['metadata']['manual_tiebreak_winner'] ?? false);
            $rightManual = (bool) ($right['metadata']['manual_tiebreak_winner'] ?? false);
            if ($leftManual !== $rightManual) {
                return $leftManual ? -1 : 1;
            }

            return strcmp($left['participant_label'], $right['participant_label']);
        })->values();
    }

    /**
     * Check if two preliminary rows are tied on Parameters 1-4 without a manual decision.
     *
     * @param  array<string, mixed>  $left
     * @param  array<string, mixed>  $right
     */
    private function isPreliminaryTied(array $left, array $right): bool
    {
        $hasManualDecision = ($left['manual_rank'] !== null && $right['manual_rank'] !== null && $left['manual_rank'] !== $right['manual_rank'])
            || (bool) ($left['metadata']['manual_tiebreak_winner'] ?? false)
            || (bool) ($right['metadata']['manual_tiebreak_winner'] ?? false);

        if ($hasManualDecision) {
            return false;
        }

        $leftScore = (float) ($left['score']['final_score'] ?? 0);
        $rightScore = (float) ($right['score']['final_score'] ?? 0);
        if ($leftScore <= 0 || $rightScore <= 0 || $leftScore !== $rightScore) {
            return false;
        }

        // If technique data is present
        if ($left['middle_technique_sum'] !== null && $right['middle_technique_sum'] !== null) {
            $sameParam2 = (float) $left['middle_technique_sum'] === (float) $right['middle_technique_sum'];
            $sameParam3 = (float) ($left['chief_judge_total'] ?? 0) === (float) ($right['chief_judge_total'] ?? 0);
            $sameParam4 = (float) ($left['chief_judge_technique'] ?? 0) === (float) ($right['chief_judge_technique'] ?? 0);

            return $sameParam2 && $sameParam3 && $sameParam4;
        }

        // Legacy fallback
        $sameJudgeOne = (float) ($left['judge_one'] ?? 0) === (float) ($right['judge_one'] ?? 0);
        $sameRawScore = (float) ($left['raw_score'] ?? 0) === (float) ($right['raw_score'] ?? 0);
        $sameJudgeTwo = (float) ($left['judge_two'] ?? 0) === (float) ($right['judge_two'] ?? 0);

        return $sameJudgeOne && $sameRawScore && $sameJudgeTwo;
    }

    /**
     * Check if two final rows are tied on Parameters 1-4 without a manual decision.
     *
     * @param  array<string, mixed>  $left
     * @param  array<string, mixed>  $right
     */
    private function isFinalTied(array $left, array $right): bool
    {
        $hasManual = ($left['manual_rank'] !== null && $right['manual_rank'] !== null && $left['manual_rank'] !== $right['manual_rank'])
            || (bool) ($left['manual_tiebreak_winner'] ?? false)
            || (bool) ($right['manual_tiebreak_winner'] ?? false);

        if ($hasManual) {
            return false;
        }

        $leftTotal = (float) ($left['total_score'] ?? 0);
        $rightTotal = (float) ($right['total_score'] ?? 0);
        if ($leftTotal <= 0 || $rightTotal <= 0 || $leftTotal !== $rightTotal) {
            return false;
        }

        if ($left['final_middle_technique_sum'] !== null && $right['final_middle_technique_sum'] !== null) {
            $sameParam2 = (float) $left['final_middle_technique_sum'] === (float) $right['final_middle_technique_sum']
                && (float) ($left['preliminary_middle_technique_sum'] ?? 0) === (float) ($right['preliminary_middle_technique_sum'] ?? 0);
            $sameParam3 = (float) ($left['final_chief_judge_total'] ?? 0) === (float) ($right['final_chief_judge_total'] ?? 0)
                && (float) ($left['preliminary_chief_judge_total'] ?? 0) === (float) ($right['preliminary_chief_judge_total'] ?? 0);
            $sameParam4 = (float) ($left['final_chief_judge_technique'] ?? 0) === (float) ($right['final_chief_judge_technique'] ?? 0)
                && (float) ($left['preliminary_chief_judge_technique'] ?? 0) === (float) ($right['preliminary_chief_judge_technique'] ?? 0);

            return $sameParam2 && $sameParam3 && $sameParam4;
        }

        $sameJudgeOne = (float) ($left['final_judge_one'] ?? 0) === (float) ($right['final_judge_one'] ?? 0)
            && (float) ($left['preliminary_judge_one'] ?? 0) === (float) ($right['preliminary_judge_one'] ?? 0);
        $sameRawScore = (float) ($left['final_raw_score'] ?? 0) === (float) ($right['final_raw_score'] ?? 0)
            && (float) ($left['preliminary_raw_score'] ?? 0) === (float) ($right['preliminary_raw_score'] ?? 0);
        $sameJudgeTwo = (float) ($left['final_judge_two'] ?? 0) === (float) ($right['final_judge_two'] ?? 0)
            && (float) ($left['preliminary_score'] ?? 0) === (float) ($right['preliminary_score'] ?? 0);

        return $sameJudgeOne && $sameRawScore && $sameJudgeTwo;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function tieMatchSummary(array $row, int $rank): array
    {
        $score = (float) ($row['total_score'] ?? $row['param1_score'] ?? $row['score']['final_score'] ?? 0);
        $p2 = (float) ($row['final_middle_technique_sum'] ?? $row['param2_technique'] ?? $row['middle_technique_sum'] ?? 0);
        $p3 = (float) ($row['final_chief_judge_total'] ?? $row['param3_chief_total'] ?? $row['chief_judge_total'] ?? 0);
        $p4 = (float) ($row['final_chief_judge_technique'] ?? $row['param4_chief_technique'] ?? $row['chief_judge_technique'] ?? 0);
        $expression = max(0, round($score - $p2, 2));
        $members = data_get($row, 'metadata.members', []);

        return [
            'id' => $row['match_id'],
            'court_id' => $row['court_id'] ?? null,
            'court_name' => $row['court'] ?? null,
            'rank' => $rank,
            'label' => $row['participant_label'],
            'participant_label' => $row['participant_label'],
            'contingent_name' => $row['metadata']['contingent_name'] ?? null,
            'members' => is_array($members) ? $members : [],
            'athlete_name' => is_array($members) && ! empty($members) ? implode(' & ', $members) : null,
            'score' => $score,
            'total_score' => $score,
            'technique_score' => $p2,
            'expression_score' => $expression,
            'param1_score' => $score,
            'middle_technique_sum' => $p2,
            'param2_technique' => $p2,
            'chief_judge_total' => $p3,
            'param3_chief_total' => $p3,
            'chief_judge_technique' => $p4,
            'param4_chief_technique' => $p4,
            'manual_rank' => $row['manual_rank'] ?? null,
            'manual_tiebreak_winner' => (bool) ($row['manual_tiebreak_winner'] ?? false),
            'tiebreak_requested' => (bool) ($row['metadata']['tiebreak_requested'] ?? false),
            'tiebreak_requested_at' => $row['metadata']['tiebreak_requested_at'] ?? null,
        ];
    }

    /** @param array<string, mixed> $row */
    private function participantIdentity(array $row): string
    {
        $key = $row['metadata']['key'] ?? null;
        if (is_string($key) && $key !== '') {
            return $key;
        }

        $athleteIds = collect($row['metadata']['athlete_ids'] ?? [])->sort()->values()->implode(':');

        return $athleteIds ?: (string) $row['participant_entry_id'];
    }

    private function compareNullableDesc(float|int|string|null $left, float|int|string|null $right): int
    {
        if ($left === null && $right === null) {
            return 0;
        }

        if ($left === null) {
            return 1;
        }

        if ($right === null) {
            return -1;
        }

        return (float) $right <=> (float) $left;
    }
}
