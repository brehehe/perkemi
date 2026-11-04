<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class SafeEncrypted implements CastsAttributes
{
    /**
     * Cast the given value from database.
     *
     * Decrypts encrypted value, or returns raw value if it is legacy unencrypted data.
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (Throwable) {
            // Value is legacy plaintext; return safely without breaking
            return (string) $value;
        }
    }

    /**
     * Prepare the given value for storage in database.
     *
     * Encrypts the string with authenticated AES-256-CBC using APP_KEY.
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        return Crypt::encryptString((string) $value);
    }
}
