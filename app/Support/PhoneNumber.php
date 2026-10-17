<?php

namespace App\Support;

class PhoneNumber
{
    public static function normalize(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', trim((string) $phone));

        if (blank($digits)) {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        if (str_starts_with($digits, '8')) {
            return '62'.$digits;
        }

        return $digits;
    }
}
