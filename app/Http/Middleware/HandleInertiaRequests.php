<?php

namespace App\Http\Middleware;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Services\Admin\DashboardEventAccessService;
use App\Services\AuthenticatedLandingService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function __construct(
        protected AuthenticatedLandingService $landingService,
        protected DashboardEventAccessService $eventAccess,
    ) {}

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'roles' => $request->user()->roles ? $request->user()->roles->pluck('name')->toArray() : [],
                    'dashboard_url' => $this->landingService->dashboardUrl($request),
                ] : null,
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'tenant' => function () use ($request): array {
                $tenantEvent = $request->attributes->get('tenantEvent');
                $user = $request->user();

                $availableEvents = [];
                if ($user) {
                    $events = $this->eventAccess->switchableEventsFor($user);
                    $currentEventId = $tenantEvent?->id ?? $request->query('event_id');

                    $availableEvents = $events->map(function (Event $ev) use ($user, $currentEventId): array {
                        return [
                            'id' => $ev->id,
                            'name' => $ev->name,
                            'slug' => $ev->slug,
                            'city' => $ev->city,
                            'is_active' => (bool) $ev->is_active,
                            'status' => $ev->status instanceof EventStatus ? $ev->status->value : (string) $ev->status,
                            'status_label' => $ev->status instanceof EventStatus ? $ev->status->label() : ($ev->status_label ?? 'Aktif'),
                            'start_date' => $ev->start_date?->format('d M Y'),
                            'end_date' => $ev->end_date?->format('d M Y'),
                            'is_current' => $ev->id === $currentEventId,
                            'assignment_label' => $this->eventAccess->assignmentLabelFor($user, $ev),
                        ];
                    })->values()->toArray();
                }

                return [
                    'event' => $tenantEvent instanceof Event ? [
                        'id' => $tenantEvent->id,
                        'name' => $tenantEvent->name,
                        'slug' => $tenantEvent->slug,
                        'city' => $tenantEvent->city,
                        'subdomain' => $tenantEvent->tenant_subdomain,
                        'access_role' => $request->attributes->get('tenantAccessRole'),
                    ] : null,
                    'available_events' => $availableEvents,
                ];
            },
        ];
    }
}
