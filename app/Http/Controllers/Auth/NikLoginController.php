<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\User;
use App\Services\AuthenticatedLandingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class NikLoginController extends Controller
{
    /**
     * Authenticate Arbitrase, Koordinator, or Wasit using only their NIK PERKEMI.
     */
    public function __invoke(Request $request, AuthenticatedLandingService $landingService): RedirectResponse
    {
        $rawNik = (string) $request->input('nik', '');
        $throttleKey = 'nik-login:'.Str::transliterate(Str::lower($rawNik).'|'.$request->ip());

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
                'nik' => $message,
            ]);
        }

        $validated = $request->validate([
            'nik' => ['required', 'string', 'min:3', 'max:50'],
        ], [
            'nik.required' => 'Masukkan NIK PERKEMI Anda.',
            'nik.min' => 'Format NIK PERKEMI terlalu pendek.',
        ]);

        $nik = trim($validated['nik']);

        // 1. Cari user berdasarkan nik_perkemi langsung
        $user = User::query()
            ->where('nik_perkemi', $nik)
            ->first();

        // 2. Jika belum ketemu, cari via relasi Referee (license_number)
        if (! $user) {
            $referee = Referee::query()
                ->where('license_number', $nik)
                ->where('is_active', true)
                ->with('user')
                ->first();

            if ($referee && $referee->user) {
                $user = $referee->user;
                if (! $user->nik_perkemi) {
                    $user->nik_perkemi = $nik;
                    $user->save();
                }
            }
        }

        // 3. Jika belum ketemu, cari via FieldCoordinator (coordinator_number)
        if (! $user) {
            $coordinator = FieldCoordinator::query()
                ->where('coordinator_number', $nik)
                ->where('is_active', true)
                ->first();

            if ($coordinator && $coordinator->email) {
                $user = User::query()->whereRaw('LOWER(email) = ?', [mb_strtolower($coordinator->email)])->first();
                if ($user && ! $user->nik_perkemi) {
                    $user->nik_perkemi = $nik;
                    $user->save();
                }
            }
        }

        if (! $user) {
            RateLimiter::hit($throttleKey, 60);

            throw ValidationException::withMessages([
                'nik' => "NIK PERKEMI '{$nik}' tidak terdaftar sebagai akun Wasit, Koordinator, atau Arbitrase aktif.",
            ]);
        }

        // Validasi otorisasi peran: hanya role teknis yang diizinkan login NIK
        $allowedRoles = ['Arbitrase', 'Pertandingan', 'Koordinator Lapangan', 'Court', 'Wasit', 'Super Admin', 'Admin'];
        $hasAllowedRole = $user->hasAnyRole($allowedRoles);

        if (! $hasAllowedRole) {
            RateLimiter::hit($throttleKey, 60);

            throw ValidationException::withMessages([
                'nik' => 'Akses login hanya menggunakan NIK dikhususkan untuk Arbitrase, Koordinator, dan Wasit pertandingan.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        Auth::login($user);
        $request->session()->regenerate();

        // Tetapkan event aktif untuk sesi
        $event = $user->accessibleEvents()->where('is_active', true)->first()
            ?? Event::query()->where('is_active', true)->latest('start_date')->first()
            ?? Event::query()->first();

        if ($event) {
            $request->session()->put('tenant_event_id', $event->id);
            $request->session()->put('tenant_event_slug', $event->slug);
        }

        // Arahkan ke landing yang relevan
        if ($user->hasRole('Wasit') && ! $user->hasAnyRole(['Super Admin', 'Admin', 'Arbitrase', 'Koordinator Lapangan'])) {
            return redirect()->route('wasit.portal', ['event_id' => $event?->id])
                ->with('success', "Selamat datang, {$user->name}. Anda berhasil masuk sebagai Wasit.");
        }

        if ($user->hasAnyRole(['Arbitrase', 'Koordinator Lapangan', 'Pertandingan', 'Court'])) {
            return redirect()->route('admin.arbitrase.wasit', ['event_id' => $event?->id])
                ->with('success', "Selamat datang, {$user->name}. Anda berhasil masuk sebagai Perangkat Pertandingan.");
        }

        return redirect()->to($landingService->urlFor($request))
            ->with('success', "Selamat datang, {$user->name}.");
    }
}
