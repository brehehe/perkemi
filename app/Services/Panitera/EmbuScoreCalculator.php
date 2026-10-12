<?php

namespace App\Services\Panitera;

use Illuminate\Support\Str;

class EmbuScoreCalculator
{
    /**
     * @param  list<float|int|string>  $judgeScores
     * @return array{middle_score: float, time_penalty: float, final_score: float}
     */
    public function calculate(array $judgeScores, ?int $durationSeconds, string $categoryName, ?float $penaltyOverride = null): array
    {
        $scores = collect($judgeScores)->map(fn ($score): float => round((float) $score, 2))->values();
        $middleScore = $scores->sum();

        if ($scores->count() === 5) {
            $middleScore -= (float) $scores->min() + (float) $scores->max();
        }

        $timePenalty = $penaltyOverride ?? $this->timePenalty($durationSeconds, $categoryName);

        return [
            'middle_score' => round($middleScore, 2),
            'time_penalty' => round($timePenalty, 2),
            'final_score' => round(max(0, $middleScore - $timePenalty), 2),
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
}
