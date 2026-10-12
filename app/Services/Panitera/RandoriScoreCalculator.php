<?php

namespace App\Services\Panitera;

class RandoriScoreCalculator
{
    /** @param array<string, int|string> $breakdown */
    public function total(array $breakdown): int
    {
        return (15 * (int) ($breakdown['mujoken'] ?? 0))
            + (10 * (int) ($breakdown['ippon'] ?? 0))
            + (5 * (int) ($breakdown['waza_ari'] ?? 0))
            + (5 * (int) ($breakdown['yusei'] ?? 0))
            - (5 * (int) ($breakdown['batsu_5'] ?? 0))
            - (10 * (int) ($breakdown['batsu_10'] ?? 0));
    }
}
