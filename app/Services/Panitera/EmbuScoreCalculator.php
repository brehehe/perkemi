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

    /**
     * Calculate 5 PERKEMI tie-break parameters and identify trimmed (min/max) and middle judges.
     *
     * @param  array<int, array<string, mixed>>  $judgesList
     * @return array<string, mixed>
     */
    public function calculateTrimmingAndParameters(array $judgesList, ?float $finalScore = null): array
    {
        $validJudges = collect($judgesList)->filter(fn ($j) => isset($j['total_score']) && (float) $j['total_score'] > 0)->values();

        $trimmedMinJudge = null;
        $trimmedMaxJudge = null;
        $middleJudgeNumbers = [];
        $middleTechniqueSum = null;

        if ($validJudges->count() === 5) {
            $sorted = $validJudges->sortBy(fn ($j) => [(float) $j['total_score'], (int) $j['judge_number']])->values();
            $minJudge = $sorted->first();
            $maxJudge = $sorted->last();
            $middleJudges = $sorted->slice(1, 3)->values();

            $trimmedMinJudge = (int) $minJudge['judge_number'];
            $trimmedMaxJudge = (int) $maxJudge['judge_number'];
            $middleJudgeNumbers = $middleJudges->pluck('judge_number')->map(fn ($n) => (int) $n)->all();

            $hasAllTech = $middleJudges->every(fn ($j) => isset($j['technique_subtotal']) && $j['technique_subtotal'] !== null);
            if ($hasAllTech) {
                $middleTechniqueSum = round((float) $middleJudges->sum('technique_subtotal'), 2);
            }
        } elseif ($validJudges->isNotEmpty()) {
            $middleJudgeNumbers = $validJudges->pluck('judge_number')->map(fn ($n) => (int) $n)->all();
            $hasAllTech = $validJudges->every(fn ($j) => isset($j['technique_subtotal']) && $j['technique_subtotal'] !== null);
            if ($hasAllTech) {
                $middleTechniqueSum = round((float) $validJudges->sum('technique_subtotal'), 2);
            }
        }

        $chiefJudge = collect($judgesList)->firstWhere('judge_number', 1);
        $chiefTotal = $chiefJudge && isset($chiefJudge['total_score']) && (float) $chiefJudge['total_score'] > 0
            ? (float) $chiefJudge['total_score']
            : null;
        $chiefTech = $chiefJudge && isset($chiefJudge['technique_subtotal']) && (float) $chiefJudge['technique_subtotal'] > 0
            ? (float) $chiefJudge['technique_subtotal']
            : null;

        $enrichedJudges = collect($judgesList)->map(function ($j) use ($trimmedMinJudge, $trimmedMaxJudge, $middleJudgeNumbers): array {
            $jNum = (int) $j['judge_number'];
            $isMin = $trimmedMinJudge !== null && $jNum === $trimmedMinJudge;
            $isMax = $trimmedMaxJudge !== null && $jNum === $trimmedMaxJudge;
            $isTrimmed = $isMin || $isMax;
            $isMiddle = in_array($jNum, $middleJudgeNumbers, true);

            $trimType = $isMax ? 'max' : ($isMin ? 'min' : null);
            $trimLabel = $isMax ? 'Dicoret (Tertinggi)' : ($isMin ? 'Dicoret (Terendah)' : ($isMiddle ? 'Dihitung (Wasit Tengah)' : null));

            return [
                ...$j,
                'is_trimmed' => $isTrimmed,
                'is_trimmed_min' => $isMin,
                'is_trimmed_max' => $isMax,
                'is_middle' => $isMiddle,
                'trim_type' => $trimType,
                'trim_label' => $trimLabel,
            ];
        })->values()->all();

        return [
            'judges' => $enrichedJudges,
            'trimmed_min_judge' => $trimmedMinJudge,
            'trimmed_max_judge' => $trimmedMaxJudge,
            'middle_judge_numbers' => $middleJudgeNumbers,
            'middle_judges_label' => ! empty($middleJudgeNumbers) ? 'Wasit '.implode(', Wasit ', $middleJudgeNumbers) : null,
            'param1_score' => $finalScore,
            'param2_technique' => $middleTechniqueSum,
            'param3_chief_total' => $chiefTotal,
            'param4_chief_technique' => $chiefTech,
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
