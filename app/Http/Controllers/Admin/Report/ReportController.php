<?php

namespace App\Http\Controllers\Admin\Report;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\TournamentResult;
use App\Services\Admin\DashboardMetricsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        protected DashboardMetricsService $metricsService
    ) {}

    /**
     * Display medal tally and tournament standings.
     */
    public function medals(Request $request): Response
    {
        $activeEvent = $this->eventForRequest($request);
        $medalStats = $this->metricsService->getMedalStats($activeEvent);
        $distribution = $this->metricsService->getMedalDistribution($activeEvent);

        return Inertia::render('Admin/Report/Medals', [
            'activeEvent' => $activeEvent,
            'medalStats' => $medalStats,
            'standings' => $distribution['contingents'],
        ]);
    }

    /**
     * Display Embu & Randori tournament recapitulation.
     */
    public function recap(Request $request): Response
    {
        $activeEvent = $this->eventForRequest($request);
        $matchType = $request->input('type', 'all');

        $recapsQuery = TournamentResult::with(['contingent:id,name,city', 'athlete:id,name,kyu_dan'])
            ->latest()
            ->when($activeEvent instanceof Event, fn ($query) => $query->whereBelongsTo($activeEvent))
            ->when($matchType !== 'all', fn ($query) => $query->where('match_category', $matchType));

        $recaps = $recapsQuery
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Report/Recap', [
            'activeEvent' => $activeEvent,
            'recaps' => $recaps,
            'filters' => [
                'type' => $matchType,
            ],
        ]);
    }

    private function eventForRequest(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        return $tenantEvent instanceof Event
            ? $tenantEvent
            : Event::where('is_active', true)->first();
    }
}
