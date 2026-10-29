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

    /**
     * Memeriksa apakah sudut telah mencapai kondisi kemenangan mutlak (Ippon / Mujoken / Waza-ari Awasete Ippon).
     *
     * @param  array<string, int|string>  $breakdown
     */
    public function hasIpponWin(array $breakdown): bool
    {
        return (int) ($breakdown['mujoken'] ?? 0) >= 1
            || (int) ($breakdown['ippon'] ?? 0) >= 1
            || (int) ($breakdown['waza_ari'] ?? 0) >= 2;
    }

    /**
     * Mengembalikan metode kemenangan mutlak kenshi jika memenuhi syarat.
     *
     * @param  array<string, int|string>  $breakdown
     */
    public function winMethod(array $breakdown): ?string
    {
        if ((int) ($breakdown['mujoken'] ?? 0) >= 1) {
            return 'mujoken';
        }

        if ((int) ($breakdown['ippon'] ?? 0) >= 1) {
            return 'ippon';
        }

        if ((int) ($breakdown['waza_ari'] ?? 0) >= 2) {
            return 'waza_ari_awasete_ippon';
        }

        return null;
    }
}
