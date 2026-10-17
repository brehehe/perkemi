<?php

namespace App\Http\Requests\Auth;

use App\Models\Clerk;
use App\Models\Contingent;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $identifier = $this->string('email')->trim()->value();
        $password = $this->string('password')->value();
        $authenticated = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? Auth::attempt([
                'email' => Str::lower($identifier),
                'password' => $password,
            ], $this->boolean('remember'))
            : $this->attemptPhoneLogin($identifier, $password);

        if (! $authenticated) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => (int) ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        $identifier = $this->string('email')->trim()->value();
        $normalizedIdentifier = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? Str::lower($identifier)
            : (PhoneNumber::normalize($identifier) ?? Str::lower($identifier));

        return Str::transliterate($normalizedIdentifier.'|'.$this->ip());
    }

    private function attemptPhoneLogin(string $identifier, string $password): bool
    {
        $phone = PhoneNumber::normalize($identifier);

        if (! $phone) {
            return false;
        }

        $user = User::query()->where('phone', $phone)->first();
        $user ??= $this->legacyUserForPhone($phone);

        if (! $user || ! Auth::attempt([
            'id' => $user->id,
            'password' => $password,
        ], $this->boolean('remember'))) {
            return false;
        }

        if (blank($user->phone) && ! User::query()->where('phone', $phone)->whereKeyNot($user->id)->exists()) {
            $user->update(['phone' => $phone]);
        }

        return true;
    }

    private function legacyUserForPhone(string $phone): ?User
    {
        $referee = Referee::query()
            ->with('user')
            ->whereNotNull('user_id')
            ->whereNotNull('phone')
            ->get()
            ->first(fn (Referee $referee): bool => PhoneNumber::normalize($referee->phone) === $phone);

        if ($referee?->user) {
            return $referee->user;
        }

        $contingent = Contingent::query()
            ->with('user')
            ->whereNotNull('user_id')
            ->whereNotNull('phone')
            ->get()
            ->first(fn (Contingent $contingent): bool => PhoneNumber::normalize($contingent->phone) === $phone);

        if ($contingent?->user) {
            return $contingent->user;
        }

        $email = Clerk::query()
            ->whereNotNull('email')
            ->whereNotNull('phone')
            ->get(['email', 'phone'])
            ->first(fn (Clerk $clerk): bool => PhoneNumber::normalize($clerk->phone) === $phone)?->email
            ?? FieldCoordinator::query()
                ->whereNotNull('email')
                ->whereNotNull('phone')
                ->get(['email', 'phone'])
                ->first(fn (FieldCoordinator $coordinator): bool => PhoneNumber::normalize($coordinator->phone) === $phone)?->email;

        return $email
            ? User::query()->whereRaw('LOWER(email) = ?', [Str::lower($email)])->first()
            : null;
    }
}
