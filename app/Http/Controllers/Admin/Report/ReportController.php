<?php

namespace App\Http\Controllers\Admin\Report;

use App\Http\Controllers\Controller;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\RandoriScore;
use App\Models\TournamentResult;
use App\Services\Admin\DashboardMetricsService;
use App\Services\Reports\ReportDatasetBuilder;
use App\Services\Reports\ReportWorkbook;
use App\Services\Reports\ScoreReportFormatter;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        protected DashboardMetricsService $metricsService
    ) {}

    /**
     * Display the unified reports and results workspace.
     */
    public function index(Request $request, ReportDatasetBuilder $datasetBuilder): Response
    {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event, 404, 'Event belum tersedia.');

        $report = $request->string('report')->toString();
        $report = array_key_exists($report, ReportDatasetBuilder::Reports) ? $report : 'champions';

        return Inertia::render('Admin/Report/Index', [
            'activeEvent' => $activeEvent->only(['id', 'name', 'city', 'start_date', 'end_date', 'status']),
            'events' => $this->eventOptions($request),
            'reportOptions' => collect(ReportDatasetBuilder::Reports)
                ->map(fn (array $definition, string $key): array => ['value' => $key, ...$definition])
                ->values(),
            'dataset' => $datasetBuilder->build($activeEvent, $report),
        ]);
    }

    /**
     * Export the selected report as a native XLSX workbook.
     */
    public function export(
        Request $request,
        ReportDatasetBuilder $datasetBuilder,
        ReportWorkbook $workbook,
    ): HttpResponse {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event, 404, 'Event belum tersedia.');

        $report = $request->string('report')->toString();
        $report = array_key_exists($report, ReportDatasetBuilder::Reports) ? $report : 'champions';
        $dataset = $datasetBuilder->build($activeEvent, $report);
        $columns = collect($dataset['columns']);
        $rows = collect($dataset['rows'])
            ->map(fn (array $row): array => $columns
                ->map(fn (array $column): int|float|string|null => $this->exportValue($row[$column['key']] ?? null))
                ->all())
            ->all();
        $contents = $workbook->build(
            $dataset['title'],
            $activeEvent->name.' · Diekspor '.now()->translatedFormat('d M Y, H:i'),
            $columns->pluck('label')->all(),
            $rows,
        );

        return response($contents, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$workbook->filename($dataset['title'], $activeEvent->name).'"',
            'Content-Length' => (string) strlen($contents),
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    /**
     * Display one complete Embu result with every available judge signature.
     */
    public function printEmbu(
        Request $request,
        EmbuScore $embuScore,
        ScoreReportFormatter $scoreFormatter,
    ): View {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $embuScore->event_id === $activeEvent->id, 404);

        $embuScore->load([
            'submitter:id,name',
            'verifier:id,name',
            'tournamentMatch:id,event_id,event_match_category_id,event_court_id,participant_entry_id,round_label,pool,match_sequence,participant_label,scheduled_start_at,metadata',
            'tournamentMatch.matchCategory:id,name,type',
            'tournamentMatch.court:id,name',
            'tournamentMatch.embuJudgeScores' => fn ($query) => $query
                ->with([
                    'referee:id,name,license_number,certification_level',
                    'court:id,name',
                ])
                ->orderBy('judge_number'),
        ]);
        $match = $embuScore->tournamentMatch;
        abort_unless($match, 404);

        return view('reports.embu-result-detail', [
            'event' => $activeEvent,
            'score' => $scoreFormatter->embuResult($embuScore, $activeEvent),
        ]);
    }

    /**
     * Display one Randori result with all six approval signatures.
     */
    public function printRandori(
        Request $request,
        RandoriScore $randoriScore,
        ScoreReportFormatter $scoreFormatter,
    ): View {
        $activeEvent = $this->eventForRequest($request);
        abort_unless($activeEvent instanceof Event && $randoriScore->event_id === $activeEvent->id, 404);

        $randoriScore->load([
            'submitter:id,name',
            'verifier:id,name',
            'tournamentMatch:id,event_id,event_match_category_id,event_court_id,round_label,pool,match_sequence,red_label,blue_label,scheduled_start_at,metadata',
            'tournamentMatch.matchCategory:id,name,type',
            'tournamentMatch.court:id,name',
        ]);

        return view('reports.score-detail', [
            'event' => $activeEvent,
            'type' => 'randori',
            'score' => $scoreFormatter->randori($randoriScore, $activeEvent),
        ]);
    }

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
            'events' => $this->eventOptions($request),
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
            'events' => $this->eventOptions($request),
            'recaps' => $recaps,
            'filters' => [
                'type' => $matchType,
            ],
        ]);
    }

    private function eventForRequest(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            $requestedEventId = $request->string('event_id')->toString();
            abort_if($requestedEventId !== '' && $requestedEventId !== $tenantEvent->id, 404);

            return $tenantEvent;
        }

        $eventId = $request->string('event_id')->toString();

        return $eventId !== ''
            ? Event::query()->findOrFail($eventId)
            : Event::query()->where('is_active', true)->orderByDesc('start_date')->first();
    }

    /** @return list<array<string, mixed>> */
    private function eventOptions(Request $request): array
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        return Event::query()
            ->when($tenantEvent instanceof Event, fn ($query) => $query->whereKey($tenantEvent))
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'city', 'start_date', 'end_date', 'status', 'is_active'])
            ->map(fn (Event $event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'end_date' => $event->end_date?->format('Y-m-d'),
                'status' => $event->status,
                'is_active' => $event->is_active,
            ])
            ->values()
            ->all();
    }

    private function exportValue(mixed $value): int|float|string|null
    {
        if (is_int($value) || is_float($value) || is_string($value) || $value === null) {
            return $value;
        }

        if (is_bool($value)) {
            return $value ? 'Ya' : 'Tidak';
        }

        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
    }
}
