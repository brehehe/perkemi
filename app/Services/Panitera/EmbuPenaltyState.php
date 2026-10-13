<?php

namespace App\Services\Panitera;

use App\Models\EmbuJudgeScore;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Support\Arr;

class EmbuPenaltyState
{
    public const SourceChiefReferee = 'chief_referee';

    public const SourcePanitera = 'panitera';

    public function __construct(private readonly EmbuPenaltyCatalog $catalog) {}

    /**
     * @return array{values: array<string, int>, points: float, source: string|null, updated_by: string|null, updated_at: string|null}
     */
    public function resolve(TournamentMatch $match, ?EmbuJudgeScore $chiefJudgeScore = null): array
    {
        $metadata = $match->metadata ?? [];
        $hasSharedState = Arr::has($metadata, 'panitera.violation_penalties');
        $values = $hasSharedState
            ? data_get($metadata, 'panitera.violation_penalties', [])
            : ($chiefJudgeScore?->violation_penalties ?? []);
        $categoryName = (string) $match->matchCategory?->name;
        $normalized = $this->catalog->normalize(is_array($values) ? $values : [], $categoryName);

        return [
            'values' => $normalized,
            'points' => $this->catalog->points($normalized, $categoryName),
            'source' => $hasSharedState
                ? data_get($metadata, 'panitera.violation_penalty_source')
                : ($chiefJudgeScore ? self::SourceChiefReferee : null),
            'updated_by' => $hasSharedState
                ? data_get($metadata, 'panitera.violation_penalty_updated_by')
                : $chiefJudgeScore?->user_id,
            'updated_at' => $hasSharedState
                ? data_get($metadata, 'panitera.violation_penalty_updated_at')
                : $chiefJudgeScore?->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $penalties
     * @return array{values: array<string, int>, points: float, source: string, updated_by: string, updated_at: string}
     */
    public function store(TournamentMatch $match, array $penalties, User $actor, string $source): array
    {
        $categoryName = (string) $match->matchCategory?->name;
        $normalized = $this->catalog->normalize($penalties, $categoryName);
        $updatedAt = now()->toIso8601String();
        $metadata = $match->metadata ?? [];
        $metadata['panitera'] = [
            ...($metadata['panitera'] ?? []),
            'violation_penalties' => $normalized,
            'violation_penalty' => $this->catalog->points($normalized, $categoryName),
            'violation_penalty_source' => $source,
            'violation_penalty_updated_by' => $actor->id,
            'violation_penalty_updated_at' => $updatedAt,
        ];
        $match->update(['metadata' => $metadata]);

        return [
            'values' => $normalized,
            'points' => $this->catalog->points($normalized, $categoryName),
            'source' => $source,
            'updated_by' => $actor->id,
            'updated_at' => $updatedAt,
        ];
    }
}
