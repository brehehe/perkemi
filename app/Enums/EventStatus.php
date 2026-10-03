<?php

namespace App\Enums;

enum EventStatus: string
{
    case Draft = 'draft';
    case OpenRegistration = 'open_registration';
    case Ongoing = 'ongoing';
    case Completed = 'completed';
    case Closed = 'closed';

    /**
     * Get the human-readable Indonesian label.
     */
    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::OpenRegistration => 'Pendaftaran Buka',
            self::Ongoing => 'Sedang Berlangsung',
            self::Completed => 'Selesai',
            self::Closed => 'Pendaftaran Ditutup',
        };
    }
}
