<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\Admin\DashboardMetricsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard.
     */
    public function index(Request $request, DashboardMetricsService $metrics): Response
    {
        $search = (string) $request->input('search', '');
        $tenantEvent = $request->attributes->get('tenantEvent');
        $event = $tenantEvent instanceof Event ? $tenantEvent : null;

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
