<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Event;
use App\Services\AuthenticatedLandingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(Request $request): Response
    {
        $targetEvent = null;
        $eventId = $request->query('event_id');
        $eventSlug = $request->query('event');

        if (is_string($eventId) && $eventId !== '') {
            $targetEvent = Event::query()->find($eventId);
        } elseif (is_string($eventSlug) && $eventSlug !== '') {
            $targetEvent = Event::query()->where('slug', $eventSlug)->first();
        }

        return Inertia::render('Auth/Login', [
            'totalAthletes' => 520,
            'totalProvinces' => 38,
            'year' => (int) date('Y'),
            'status' => session('status'),
            'targetEvent' => $targetEvent ? [
                'id' => $targetEvent->id,
                'name' => $targetEvent->name,
                'city' => $targetEvent->city,
                'status_label' => $targetEvent->status?->label() ?? 'Aktif',
            ] : null,
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request, AuthenticatedLandingService $landingService): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->to($landingService->urlFor($request));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
