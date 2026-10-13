<?php

namespace App\Services\Panitera;

use App\Models\RandoriScore;
use App\Models\TournamentMatch;
use Illuminate\Support\Facades\Cache;

class RandoriScoreDraftStore
{
    private const CacheDays = 7;

    /** @return array<string, mixed> */
    public function get(TournamentMatch $match, ?RandoriScore $score = null): array
    {
        $cached = Cache::get($this->cacheKey($match));

        if (is_array($cached)) {
            return $this->normalizeState($cached);
        }

        return $this->stateFromScore($score ?? $match->randoriScore);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{state: array<string, mixed>, changes: array<string, mixed>}
     */
    public function put(TournamentMatch $match, array $data, string $userId): array
    {
        return Cache::lock($this->lockKey($match), 5)->block(2, function () use ($match, $data, $userId): array {
            $current = $this->get($match);
            $mergedData = $current;

            foreach (['aka', 'shiro', 'signatures', 'signature_names'] as $nestedKey) {
                if (array_key_exists($nestedKey, $data) && is_array($data[$nestedKey])) {
                    $mergedData[$nestedKey] = [
                        ...($current[$nestedKey] ?? []),
                        ...$data[$nestedKey],
                    ];
                }
            }

            if (array_key_exists('notes', $data)) {
                $mergedData['notes'] = $data['notes'];
            }

            $next = $this->normalizeState([
                ...$mergedData,
                'version' => $current['version'],
                'updated_at' => now()->toIso8601String(),
                'updated_by' => $userId,
            ]);
            $changes = $this->changedValues($current, $next);

            if ($changes !== []) {
                $next['version'] = $current['version'] + 1;
                Cache::put($this->cacheKey($match), $next, now()->addDays(self::CacheDays));
            }

            return [
                'state' => $next,
                'changes' => $changes,
            ];
        });
    }

    /**
     * @return array{state: array<string, mixed>, changes: array<string, mixed>}
     */
    public function replaceFromScore(TournamentMatch $match, RandoriScore $score, string $userId): array
    {
        return Cache::lock($this->lockKey($match), 5)->block(2, function () use ($match, $score, $userId): array {
            $current = $this->get($match, $score);
            $next = $this->stateFromScore($score);
            $next['version'] = $current['version'] + 1;
            $next['updated_at'] = now()->toIso8601String();
            $next['updated_by'] = $userId;
            $changes = $this->changedValues($current, $next);

            Cache::put($this->cacheKey($match), $next, now()->addDays(self::CacheDays));

            return [
                'state' => $next,
                'changes' => $changes,
            ];
        });
    }

    /** @return array<string, mixed> */
    private function stateFromScore(?RandoriScore $score): array
    {
        return $this->normalizeState([
            'version' => 0,
            'aka' => $score?->aka_breakdown ?? [],
            'shiro' => $score?->shiro_breakdown ?? [],
            'signatures' => $score?->signatures ?? [],
            'signature_names' => $score?->signature_names ?? [],
            'notes' => $score?->notes ?? '',
            'updated_at' => $score?->updated_at?->toIso8601String(),
            'updated_by' => $score?->submitted_by,
        ]);
    }

    /** @param array<string, mixed> $state @return array<string, mixed> */
    private function normalizeState(array $state): array
    {
        $emptyBreakdown = array_fill_keys(
            ['mujoken', 'ippon', 'waza_ari', 'yusei', 'batsu_5', 'batsu_10'],
            0,
        );

        return [
            'version' => max(0, (int) ($state['version'] ?? 0)),
            'aka' => collect([...$emptyBreakdown, ...($state['aka'] ?? [])])
                ->map(fn (mixed $value): int => max(0, min(20, (int) $value)))
                ->all(),
            'shiro' => collect([...$emptyBreakdown, ...($state['shiro'] ?? [])])
                ->map(fn (mixed $value): int => max(0, min(20, (int) $value)))
                ->all(),
            'signatures' => collect(RandoriScore::SignatureKeys)
                ->mapWithKeys(fn (string $key): array => [$key => is_string(data_get($state, "signatures.{$key}")) ? data_get($state, "signatures.{$key}") : ''])
                ->all(),
            'signature_names' => collect(RandoriScore::SignatureKeys)
                ->mapWithKeys(function (string $key) use ($state): array {
                    $name = data_get($state, "signature_names.{$key}");

                    return [$key => is_string($name) && trim($name) !== '' ? trim($name) : null];
                })
                ->all(),
            'notes' => is_string($state['notes'] ?? null) ? $state['notes'] : '',
            'updated_at' => is_string($state['updated_at'] ?? null) ? $state['updated_at'] : null,
            'updated_by' => is_string($state['updated_by'] ?? null) ? $state['updated_by'] : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $next
     * @return array<string, mixed>
     */
    private function changedValues(array $current, array $next): array
    {
        $changes = [];

        foreach (['aka', 'shiro', 'signatures', 'signature_names'] as $nestedKey) {
            $nestedChanges = collect($next[$nestedKey] ?? [])
                ->filter(fn (mixed $value, string $key): bool => ($current[$nestedKey][$key] ?? null) !== $value)
                ->all();

            if ($nestedChanges !== []) {
                $changes[$nestedKey] = $nestedChanges;
            }
        }

        if (($current['notes'] ?? '') !== ($next['notes'] ?? '')) {
            $changes['notes'] = $next['notes'];
        }

        return $changes;
    }

    private function cacheKey(TournamentMatch $match): string
    {
        return "panitera:randori-score-draft:{$match->event_id}:{$match->id}";
    }

    private function lockKey(TournamentMatch $match): string
    {
        return $this->cacheKey($match).':lock';
    }
}
