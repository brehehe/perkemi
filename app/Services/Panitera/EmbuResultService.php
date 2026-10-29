<?php

namespace App\Services\Panitera;

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

                return [
                    ...$row,
                    'preliminary_score' => $preliminaryScore,
                    'final_round_score' => $finalScore,
                    'total_score' => $preliminaryScore !== null && $finalScore !== null
                        ? round((float) $preliminaryScore + (float) $finalScore, 2)
                        : null,
                    'preliminary_judge_one' => $preliminaryRow['judge_one'] ?? null,
                    'preliminary_judge_two' => $preliminaryRow['judge_two'] ?? null,
                    'preliminary_raw_score' => $preliminaryRow['raw_score'] ?? null,
                    'final_judge_one' => $row['judge_one'],
                    'final_judge_two' => $row['judge_two'],
                    'final_raw_score' => $row['raw_score'],
                    'manual_tiebreak_winner' => (bool) ($row['metadata']['manual_tiebreak_winner'] ?? false),
                ];
            });

        return $rows->sort(function (array $left, array $right): int {
            // Skenario A: Total Nilai Akumulasi (Penyisihan + Final)
            $cmpA = $this->compareNullableDesc($left['total_score'], $right['total_score']);
            if ($cmpA !== 0) {
                return $cmpA;
            }

            // Skenario B: Nilai Wasit 1 Babak Final, lalu Wasit 1 Babak Penyisihan
            $cmpB = $this->compareNullableDesc($left['final_judge_one'], $right['final_judge_one'])
                ?: $this->compareNullableDesc($left['preliminary_judge_one'], $right['preliminary_judge_one']);
            if ($cmpB !== 0) {
                return $cmpB;
            }

            // Skenario C: Total Nilai Murni Seluruh Wasit Babak Final, lalu Penyisihan
            $cmpC = $this->compareNullableDesc($left['final_raw_score'], $right['final_raw_score'])
                ?: $this->compareNullableDesc($left['preliminary_raw_score'], $right['preliminary_raw_score']);
            if ($cmpC !== 0) {
                return $cmpC;
            }

            // Skenario D: Nilai Wasit 2 Babak Final, lalu Nilai Babak Penyisihan
            $cmpD = $this->compareNullableDesc($left['final_judge_two'], $right['final_judge_two'])
                ?: $this->compareNullableDesc($left['preliminary_score'], $right['preliminary_score']);
            if ($cmpD !== 0) {
                return $cmpD;
            }

            // Skenario E: Keputusan Manual Panitera/Dewan Juri
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

    /** @return Collection<int, array{pool: string, rank: int, next_rank: int, score: float, judge_one: float, raw_score: float, judge_two: float, match_id_a: string, match_id_b: string, label_a: string, label_b: string, scenario: string}> */
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

                $sameScore = (float) $qualified['score']['final_score'] === (float) $next['score']['final_score'];
                $sameJudgeOne = (float) ($qualified['judge_one'] ?? 0) === (float) ($next['judge_one'] ?? 0);
                $sameRawScore = (float) ($qualified['raw_score'] ?? 0) === (float) ($next['raw_score'] ?? 0);
                $sameJudgeTwo = (float) ($qualified['judge_two'] ?? 0) === (float) ($next['judge_two'] ?? 0);
                $hasManualDecision = (bool) ($qualified['metadata']['manual_tiebreak_winner'] ?? false)
                    || (bool) ($next['metadata']['manual_tiebreak_winner'] ?? false);

                if (! $sameScore || ! $sameJudgeOne || ! $sameRawScore || ! $sameJudgeTwo || $hasManualDecision) {
                    return null;
                }

                return [
                    'pool' => $pool,
                    'rank' => $quota,
                    'next_rank' => $quota + 1,
                    'score' => (float) $qualified['score']['final_score'],
                    'judge_one' => (float) ($qualified['judge_one'] ?? 0),
                    'raw_score' => (float) ($qualified['raw_score'] ?? 0),
                    'judge_two' => (float) ($qualified['judge_two'] ?? 0),
                    'match_id_a' => (string) $qualified['match_id'],
                    'match_id_b' => (string) $next['match_id'],
                    'label_a' => (string) $qualified['participant_label'],
                    'label_b' => (string) $next['participant_label'],
                    'scenario' => 'E',
                ];
            })
            ->filter()
            ->values();
    }

    public function advanceFinalists(EventMatchCategory $category): int
    {
        $ties = $this->boundaryTies($category);
        if ($ties->isNotEmpty()) {
            throw ValidationException::withMessages([
                'category' => 'Ada nilai seri di batas kuota. Buat nilai tanding ulang terlebih dahulu.',
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
                'category' => 'Masih ada nilai seri pada empat besar. Selesaikan tanding ulang sebelum konfirmasi juara.',
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

            $sameTotal = (float) $row['total_score'] === (float) $next['total_score'];
            $sameJudgeOne = (float) ($row['final_judge_one'] ?? 0) === (float) ($next['final_judge_one'] ?? 0)
                && (float) ($row['preliminary_judge_one'] ?? 0) === (float) ($next['preliminary_judge_one'] ?? 0);
            $sameRawScore = (float) ($row['final_raw_score'] ?? 0) === (float) ($next['final_raw_score'] ?? 0)
                && (float) ($row['preliminary_raw_score'] ?? 0) === (float) ($next['preliminary_raw_score'] ?? 0);
            $sameJudgeTwo = (float) ($row['final_judge_two'] ?? 0) === (float) ($next['final_judge_two'] ?? 0)
                && (float) ($row['preliminary_score'] ?? 0) === (float) ($next['preliminary_score'] ?? 0);

            $hasManual = (bool) ($row['manual_tiebreak_winner'] ?? false) || (bool) ($next['manual_tiebreak_winner'] ?? false);

            return $sameTotal && $sameJudgeOne && $sameRawScore && $sameJudgeTwo && ! $hasManual;
        });
    }

    public function setManualTiebreakWinner(TournamentMatch $winnerMatch, ?TournamentMatch $tiedMatch = null): void
    {
        DB::transaction(function () use ($winnerMatch, $tiedMatch): void {
            if ($tiedMatch) {
                $tiedMetadata = $tiedMatch->metadata ?? [];
                $tiedMetadata['manual_tiebreak_winner'] = false;
                $tiedMatch->update(['metadata' => $tiedMetadata]);
            }

            $winnerMetadata = $winnerMatch->metadata ?? [];
            $winnerMetadata['manual_tiebreak_winner'] = true;
            $winnerMatch->update(['metadata' => $winnerMetadata]);
        });
    }

    /** @return Collection<int, array<string, mixed>> */
    private function matchesFor(EventMatchCategory $category, string $phase): Collection
    {
        return TournamentMatch::query()
            ->where('event_match_category_id', $category->id)
            ->where('phase', $phase)
            ->with(['embuScores', 'court:id,name'])
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

                $judgeOneIndex = array_search(1, $judgeNumbers, true);
                $judgeTwoIndex = array_search(2, $judgeNumbers, true);

                $judgeOne = $score && $judgeOneIndex !== false
                    ? (float) $judgeScores[$judgeOneIndex]
                    : null;
                $judgeTwo = $score && $judgeTwoIndex !== false
                    ? (float) $judgeScores[$judgeTwoIndex]
                    : null;
                $rawScore = $score && $judgeScores !== []
                    ? (float) array_sum($judgeScores)
                    : null;

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
                    'judge_one' => $judgeOne,
                    'judge_two' => $judgeTwo,
                    'raw_score' => $rawScore,
                    'manual_tiebreak_winner' => (bool) ($match->metadata['manual_tiebreak_winner'] ?? false),
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
            // Skenario A: Nilai Akhir (Trimmed Mean - Denda)
            $cmpA = $this->compareNullableDesc($left['score']['final_score'] ?? null, $right['score']['final_score'] ?? null);
            if ($cmpA !== 0) {
                return $cmpA;
            }

            // Skenario B: Nilai Wasit 1 (Chief Judge)
            $cmpB = $this->compareNullableDesc($left['judge_one'] ?? null, $right['judge_one'] ?? null);
            if ($cmpB !== 0) {
                return $cmpB;
            }

            // Skenario C: Total Nilai Murni Seluruh Wasit (sebelum trimming)
            $cmpC = $this->compareNullableDesc($left['raw_score'] ?? null, $right['raw_score'] ?? null);
            if ($cmpC !== 0) {
                return $cmpC;
            }

            // Skenario D: Nilai Wasit 2
            $cmpD = $this->compareNullableDesc($left['judge_two'] ?? null, $right['judge_two'] ?? null);
            if ($cmpD !== 0) {
                return $cmpD;
            }

            // Skenario E: Keputusan Manual Panitera/Dewan Juri
            $leftManual = (bool) ($left['metadata']['manual_tiebreak_winner'] ?? false);
            $rightManual = (bool) ($right['metadata']['manual_tiebreak_winner'] ?? false);
            if ($leftManual !== $rightManual) {
                return $leftManual ? -1 : 1;
            }

            return strcmp($left['participant_label'], $right['participant_label']);
        })->values();
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
