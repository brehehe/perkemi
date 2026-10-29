<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaniteraTokenLoginController extends Controller
{
    /**
     * Authenticate Panitera using a 6-digit court access code.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $throttleKey = 'panitera-token:'.Str::transliterate(Str::lower((string) $request->input('token', '')).'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            $message = trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => (int) ceil($seconds / 60),
            ]);
            if ($message === 'auth.throttle') {
                $message = "Terlalu banyak percobaan login. Silakan coba lagi dalam {$seconds} detik.";
            }

            throw ValidationException::withMessages([
                'token' => $message,
            ]);
        }

        $validated = $request->validate([
            'token' => ['required', 'string', 'size:6'],
        ], [
            'token.required' => 'Masukkan token 6 digit Panitera.',
            'token.size' => 'Token Panitera harus terdiri dari 6 digit.',
        ]);

        $court = EventCourt::query()
            ->where('access_code', $validated['token'])
            ->where('is_active', true)
            ->with('event')
            ->first();

        if (! $court || ! $court->event) {
            RateLimiter::hit($throttleKey, 60);

            throw ValidationException::withMessages([
                'token' => 'Token 6 digit tidak valid atau tidak ditemukan.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        $event = $court->event;

        // Find or create clerk user for court atomically
        $clerkUser = DB::transaction(function () use ($court, $event): User {
            $clerkUser = User::whereHas('roles', fn ($q) => $q->where('name', 'Panitera'))
                ->whereHas('accessibleEvents', fn ($q) => $q->where('events.id', $event->id))
                ->first();

            if (! $clerkUser) {
                $clerkUser = User::firstOrCreate(
                    ['email' => "panitera.court.{$court->id}@perkemi.local"],
                    [
                        'name' => "Panitera {$court->name}",
                        'phone' => '08'.random_int(1000000000, 9999999999),
                        'password' => Hash::make(Str::random(16)),
                    ]
                );
                $role = Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
                $clerkUser->syncRoles([$role]);
                $event->users()->syncWithoutDetaching([$clerkUser->id => ['access_role' => Event::AccessRoleStaff]]);
            }

            return $clerkUser;
        });

        Auth::login($clerkUser);
        $request->session()->regenerate();
        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);
        $request->session()->put('panitera_court_id', $court->id);

        return redirect()->route('admin.panitera.scoring.index', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ])->with('success', "Login Panitera berhasil untuk {$court->name} ({$event->name}).");
    }
}
