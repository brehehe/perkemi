<?php

namespace App\Enums;

enum TournamentRank: int
{
    case Gold = 1;
    case Silver = 2;
    case Bronze = 3;
    case RunnerUp = 4;

    /**
     * Get the human-readable Indonesian label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Gold => 'Emas (Juara 1)',
            self::Silver => 'Perak (Juara 2)',
            self::Bronze => 'Perunggu (Juara 3)',
            self::RunnerUp => 'Peringkat 4 (Harapan)',
        };
    }
}
