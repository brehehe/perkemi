<?php

namespace App\Http\Controllers;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\SiteSetting;
use App\Services\AuthenticatedLandingService;
use App\Services\PublicEventPageService;
use App\Services\WelcomeService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct(
        protected WelcomeService $welcomeService,
        protected PublicEventPageService $publicEventPageService,
        protected AuthenticatedLandingService $authenticatedLandingService,
    ) {}

    /**
     * Display the landing page.
     */
    public function index(Request $request): Response
    {
        $setting = SiteSetting::current();
        $event = match ($setting->home_landing_mode) {
            SiteSetting::HomeFeaturedEvent => Event::query()
                ->where('status', '!=', EventStatus::Draft)
                ->find($setting->featured_event_id),
            SiteSetting::HomeUpcomingEvent => Event::query()
                ->where('status', '!=', EventStatus::Draft)
                ->whereDate('end_date', '>=', now()->toDateString())
                ->orderBy('start_date')
                ->first(),
            default => null,
        };

        if ($event) {
            $user = $request->user();
            $canManage = $user?->hasAnyRole(['Super Admin', 'Admin'])
                || ($user && $event->users()->whereKey($user->id)->exists());
            $canAccessDashboard = $user
                && $this->authenticatedLandingService->canAccessEvent($event, $user);

            return Inertia::render(
                'Public/Event/Show',
                $this->publicEventPageService->data(
                    $event,
                    (bool) $canManage,
                    true,
                    (bool) $canAccessDashboard,
                ),
            );
        }

        $search = $request->query('search');
        $status = $request->query('status');

        return Inertia::render('Welcome', $this->welcomeService->getLandingData(
            search: is_string($search) ? mb_substr(trim($search), 0, 120) : '',
            status: in_array($status, ['upcoming', 'ongoing', 'completed'], true) ? $status : 'all',
        ));
    }
}
