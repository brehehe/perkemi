<?php

namespace App\Services\Panitera;

use Illuminate\Support\Str;

class EmbuScoreCalculator
{
    /**
     * @param  list<float|int|string>  $judgeScores
     * @return array{middle_score: float, time_penalty: float, violation_penalty: float, total_penalty: float, final_score: float, is_disqualified: bool, disqualification_reason: string|null}
     */
    public function calculate(
        array $judgeScores,
        ?int $durationSeconds,
        string $categoryName,
        ?float $penaltyOverride = null,
        float $violationPenalty = 0,
    ): array {
        $scores = collect($judgeScores)->map(fn ($score): float => round((float) $score, 2))->values();
        $middleScore = $scores->sum();

        if ($scores->count() === 5) {
            $middleScore -= (float) $scores->min() + (float) $scores->max();
        }

        $timePenalty = $penaltyOverride ?? $this->timePenalty($durationSeconds, $categoryName);
        $violationPenalty = max(0, $violationPenalty);
        $totalPenalty = $timePenalty + $violationPenalty;
        $isDisqualified = $this->isDisqualified($durationSeconds);

        return [
            'middle_score' => round($middleScore, 2),
            'time_penalty' => round($timePenalty, 2),
            'violation_penalty' => round($violationPenalty, 2),
            'total_penalty' => round($totalPenalty, 2),
            'final_score' => $isDisqualified ? 0.0 : round(max(0, $middleScore - $totalPenalty), 2),
            'is_disqualified' => $isDisqualified,
            'disqualification_reason' => $isDisqualified
                ? 'Durasi Embu melebihi batas maksimum 3 menit.'
                : null,
        ];
    }

    public function timePenalty(?int $durationSeconds, string $categoryName): float
    {
        if ($durationSeconds === null) {
            return 0;
        }

        $isTandoku = Str::contains(Str::lower($categoryName), ['tandoku', 'tunggal']);

        if ($isTandoku) {
            return match (true) {
                $durationSeconds <= 49 => 10,
                $durationSeconds <= 59 => 5,
                $durationSeconds <= 90 => 0,
                $durationSeconds <= 100 => 5,
                default => 10,
            };
        }

        return match (true) {
            $durationSeconds <= 79 => 10,
            $durationSeconds <= 89 => 5,
            $durationSeconds <= 120 => 0,
            $durationSeconds <= 130 => 5,
            default => 10,
        };
    }

    public function isDisqualified(?int $durationSeconds): bool
    {
        return $durationSeconds !== null && $durationSeconds > 180;
    }
}
