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
                    'final_judge_one' => $row['judge_one'],
                ];
            });

        return $rows->sort(function (array $left, array $right): int {
            return $this->compareNullableDesc($left['total_score'], $right['total_score'])
                ?: $this->compareNullableDesc($left['final_judge_one'], $right['final_judge_one'])
                ?: $this->compareNullableDesc($left['preliminary_judge_one'], $right['preliminary_judge_one'])
                ?: strcmp($left['participant_label'], $right['participant_label']);
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

    /** @return Collection<int, array{pool: string, rank: int, next_rank: int, score: float, judge_one: float}> */
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
                $sameJudgeOne = (float) $qualified['judge_one'] === (float) $next['judge_one'];

                if (! $sameScore || ! $sameJudgeOne) {
                    return null;
                }

                return [
                    'pool' => $pool,
                    'rank' => $quota,
                    'next_rank' => $quota + 1,
                    'score' => (float) $qualified['score']['final_score'],
                    'judge_one' => (float) $qualified['judge_one'],
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
                    'is_exhibition' => (int) $category->tournamentDrawing?->participant_count <= 3,
                ]);
            });
        });
    }

    /** @param Collection<int, array<string, mixed>> $rankings */
    public function hasTopFourTie(Collection $rankings): bool
    {
        return $rankings->take(4)->values()->contains(function (array $row, int $index) use ($rankings): bool {
            $next = $rankings->get($index + 1);

            return $next !== null
                && $row['total_score'] !== null
                && (float) $row['total_score'] === (float) $next['total_score']
                && (float) $row['final_judge_one'] === (float) $next['final_judge_one']
                && (float) $row['preliminary_judge_one'] === (float) $next['preliminary_judge_one'];
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
                    'judge_one' => $score && $judgeOneIndex !== false
                        ? (float) $judgeScores[$judgeOneIndex]
                        : null,
                    'score' => $score ? [
                        'id' => $score->id,
                        'tiebreak_round' => $score->tiebreak_round,
                        'judge_scores' => $judgeScores,
                        'judge_numbers' => $judgeNumbers,
                        'duration_seconds' => $score->duration_seconds,
                        'time_penalty' => (float) $score->time_penalty,
                        'middle_score' => (float) $score->middle_score,
                        'final_score' => (float) $score->final_score,
                        'status' => $score->status,
                    ] : null,
                ];
            });
    }

    /** @param Collection<int, array<string, mixed>> $rows @return Collection<int, array<string, mixed>> */
    private function sortRows(Collection $rows): Collection
    {
        return $rows->sort(function (array $left, array $right): int {
            return $this->compareNullableDesc($left['score']['final_score'] ?? null, $right['score']['final_score'] ?? null)
                ?: $this->compareNullableDesc($left['judge_one'], $right['judge_one'])
                ?: strcmp($left['participant_label'], $right['participant_label']);
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
