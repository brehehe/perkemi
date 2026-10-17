<?php

namespace App\Actions\Admin\Master;

use App\Models\Role;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SyncLoginAccountAction
{
    public function execute(
        string $name,
        ?string $email,
        ?string $password,
        string $roleName,
        ?User $user = null,
        ?string $phone = null,
    ): ?User {
        $normalizedEmail = Str::lower(trim((string) $email));
        $normalizedPhone = PhoneNumber::normalize($phone);

        if ($normalizedEmail === '' && ! $user) {
            return $user;
        }

        $emailOwner = $normalizedEmail !== ''
            ? User::withTrashed()
                ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
                ->when($user, fn ($query) => $query->whereKeyNot($user->id))
                ->first()
            : null;
        $phoneOwner = $normalizedPhone
            ? User::withTrashed()
                ->where('phone', $normalizedPhone)
                ->when($user, fn ($query) => $query->whereKeyNot($user->id))
                ->first()
            : null;

        if ($user && $emailOwner) {
            throw ValidationException::withMessages([
                'email' => 'Email login sudah digunakan oleh pengguna lain.',
            ]);
        }

        if ($user && $phoneOwner) {
            throw ValidationException::withMessages([
                'phone' => 'Nomor HP login sudah digunakan oleh pengguna lain.',
            ]);
        }

        if ($emailOwner && $phoneOwner && ! $emailOwner->is($phoneOwner)) {
            throw ValidationException::withMessages([
                'email' => 'Email dan nomor HP terhubung ke dua akun yang berbeda.',
            ]);
        }

        $user ??= $emailOwner ?? $phoneOwner;

        if (! $user && blank($password)) {
            return null;
        }

        $user ??= new User;
        $user->name = $name;

        if ($normalizedEmail !== '') {
            $user->email = $normalizedEmail;
        }

        if ($normalizedPhone) {
            $user->phone = $normalizedPhone;
        }

        if (filled($password)) {
            $user->password = $password;
        }

        $user->email_verified_at ??= now();

        if ($user->trashed()) {
            $user->restore();
        }

        $user->save();

        $user->assignRole(Role::findOrCreate($roleName, 'web'));

        return $user;
    }
}
