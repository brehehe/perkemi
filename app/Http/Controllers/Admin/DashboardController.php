<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\Admin\DashboardEventAccessService;
use App\Services\Admin\DashboardMetricsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard.
     */
    public function index(
        Request $request,
        DashboardMetricsService $metrics,
        DashboardEventAccessService $eventAccess,
    ): Response|RedirectResponse {
        $user = $request->user();

        if ($user?->hasAnyRole(['kontingen', 'Contingent']) && ! $user->hasAnyRole(['Super Admin', 'Admin'])) {
            return redirect()->route('kontingen.registrasi');
        }

        if ($user?->hasRole('Wasit') && ! $user->hasAnyRole(['Super Admin', 'Admin'])) {
            return redirect()->route('wasit.portal');
        }

        if ($user?->hasRole('Panitera') && ! $user->hasAnyRole(['Super Admin', 'Admin'])) {
            return redirect()->route('admin.panitera.scoring.index');
        }

        $search = (string) $request->input('search', '');
        $events = $user ? $eventAccess->eventsFor($user) : collect();
        $event = $user ? $eventAccess->resolve($request, $user, $events) : null;

        if ($user && $eventAccess->requiresEventScope($user)) {
            abort_unless($event instanceof Event, 403, 'Akun ini belum ditugaskan pada event mana pun.');
        }

        if ($event && $event instanceof Event) {
            $request->session()->put('tenant_event_id', $event->id);
            $request->session()->put('tenant_event_slug', $event->slug);
            $request->attributes->set('tenantEvent', $event);
            $request->attributes->set('tenantAccessRole', $event->accessRoleFor($user));
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => $metrics->getStats($event),
            'monthlyAthletes' => $metrics->getMonthlyAthletes($event),
            'statusBreakdown' => $metrics->getRegistrationStatusBreakdown($event),
            'latestContingents' => $metrics->getLatestContingents($event),
            'latestRegistrations' => $metrics->getLatestRegistrations($search, $event),
            'medalStats' => $metrics->getMedalStats($event),
            'medalDistribution' => $metrics->getMedalDistribution($event),
            'todaySchedules' => $metrics->getTodaySchedules($event),
            'latestActivities' => $metrics->getLatestActivities($event),
            'filters' => [
                'search' => $search,
            ],
            'activeEvent' => $event ? [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'city' => $event->city,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'end_date' => $event->end_date?->format('Y-m-d'),
            ] : null,
            'eventOptions' => $events->map(fn (Event $event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'end_date' => $event->end_date?->format('Y-m-d'),
                'is_active' => (bool) $event->is_active,
            ])->values(),
            'canViewAllEvents' => $user?->hasAnyRole(['Super Admin', 'Admin']) ?? false,
            'realtime' => $event ? [
                'channel' => "event.{$event->id}.dashboard",
                'event' => '.dashboard.summary.updated',
            ] : null,
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'roles' => $request->user()->roles->pluck('name')->toArray(),
                ] : [
                    'name' => 'Administrator Perkemi',
                    'email' => 'admin@smart-perkemi.id',
                    'roles' => ['Super Admin'],
                ],
            ],
        ]);
    }
}
