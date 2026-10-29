<?php

namespace App\Services\Security;

use Illuminate\Support\Str;

class DataMasker
{
    /**
     * Mask NIK (e.g., 320101******0001).
     */
    public static function maskNik(?string $nik): ?string
    {
        if (blank($nik)) {
            return null;
        }

        $length = strlen($nik);
        if ($length <= 8) {
            return Str::mask($nik, '*', 2);
        }

        return Str::mask($nik, '*', 6, $length - 10);
    }

    /**
     * Mask Phone number (e.g., 0812****789).
     */
    public static function maskPhone(?string $phone): ?string
    {
        if (blank($phone)) {
            return null;
        }

        $length = strlen($phone);
        if ($length <= 6) {
            return Str::mask($phone, '*', 2);
        }

        return Str::mask($phone, '*', 4, $length - 7);
    }

    /**
     * Mask BPJS number (e.g., 0001****345).
     */
    public static function maskBpjs(?string $bpjs): ?string
    {
        if (blank($bpjs)) {
            return null;
        }

        $length = strlen($bpjs);
        if ($length <= 6) {
            return Str::mask($bpjs, '*', 2);
        }

        return Str::mask($bpjs, '*', 4, $length - 7);
    }

    /**
     * Mask Email address (e.g., k***i@example.com).
     */
    public static function maskEmail(?string $email): ?string
    {
        if (blank($email) || ! str_contains($email, '@')) {
            return $email;
        }

        [$user, $domain] = explode('@', $email, 2);
        $userLength = strlen($user);

        if ($userLength <= 2) {
            $maskedUser = $user[0].'*';
        } else {
            $maskedUser = Str::mask($user, '*', 1, $userLength - 2);
        }

        return $maskedUser.'@'.$domain;
    }
}
