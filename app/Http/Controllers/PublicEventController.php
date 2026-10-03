<?php

namespace App\Http\Controllers;

use App\Actions\Auth\RegisterContingentAction;
use App\Enums\EventStatus;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Event;
use App\Services\AuthenticatedLandingService;
use App\Services\PublicEventPageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicEventController extends Controller
{
    /**
     * Display the public landing page for an event.
     */
    public function show(
        Request $request,
        string $slug,
        PublicEventPageService $pageService,
        AuthenticatedLandingService $landingService,
    ): Response {
        $event = Event::query()->where('slug', $slug)->firstOrFail();

        $user = $request->user();
        $isFullAdmin = $user?->hasAnyRole(['Super Admin', 'Admin']) ?? false;
        $isEventUser = $user && $event->users()->whereKey($user->id)->exists();
        $canAccessDashboard = $user && $landingService->canAccessEvent($event, $user);

        // Only allow viewing if event is active or not draft, unless user is admin/event user
        if ($event->status === EventStatus::Draft && ! $event->is_active && ! $isFullAdmin && ! $isEventUser) {
            abort(404);
        }

        return Inertia::render(
            'Public/Event/Show',
            $pageService->data(
                $event,
                $isFullAdmin || $isEventUser,
                canAccessDashboard: (bool) $canAccessDashboard,
            ),
        );
    }

    /**
     * Display the registration page for an event.
     */
    public function register(string $slug): Response
    {
        $event = Event::query()
            ->where('slug', $slug)
            ->firstOrFail();

        return Inertia::render('Auth/Register', [
            'year' => (int) date('Y'),
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'city' => $event->city,
                'edition' => $event->edition,
                'venue' => $event->venue,
                'dates_formatted' => $event->start_date?->translatedFormat('d M').' - '.$event->end_date?->translatedFormat('d M Y'),
            ],
        ]);
    }

    /**
     * Store contingent registration for an event.
     */
    public function storeRegistration(RegisterRequest $request, string $slug, RegisterContingentAction $action): RedirectResponse
    {
        $event = Event::query()->where('slug', $slug)->firstOrFail();

        $user = $action->execute($request->validated(), $event->id);

        return redirect()->route('login')->with([
            'status' => "Pendaftaran kontingen untuk event {$event->name} berhasil! Password telah dibuat dan sedang dikirimkan ke email {$user->email} melalui antrean. Silakan periksa kotak masuk (inbox/spam) Anda untuk login.",
            'registered_email' => $user->email,
        ]);
    }
}
