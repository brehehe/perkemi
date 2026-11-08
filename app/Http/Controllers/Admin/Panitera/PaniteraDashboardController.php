<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\EmbuScore;
use App\Models\EventCourtAssignment;
use App\Models\RandoriScore;
use App\Models\TournamentMatch;
use App\Services\Panitera\ChampionResultService;
use App\Services\Panitera\EmbuResultService;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use App\Services\TournamentDrawingGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PaniteraDashboardController extends Controller
{
    public function __invoke(
        Request $request,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
    ): Response {
        $event = $eventContext->eventFor($request);
        $assignedCourtIds = $courtAccess->assignedCourtIds($request, $event);
        $event->load('clerks:id,name');
        $clerkNames = $event->clerks->pluck('name', 'id');

        $courts = $event->courts()
            ->when($assignedCourtIds !== null, fn (Builder $query) => $query->whereIn('id', $assignedCourtIds))
            ->with([
                'assignments',
                'tournamentMatches' => fn ($query) => $query
                    ->where('is_bye', false)
                    ->whereIn('status', ['ready', 'in_progress'])
                    ->with('matchCategory:id,name')
                    ->orderByRaw('scheduled_start_at IS NULL')
                    ->orderBy('scheduled_start_at')
                    ->orderBy('match_sequence'),
            ])
            ->withCount([
                'tournamentMatches as total_matches_count' => fn ($query) => $query->where('is_bye', false),
                'tournamentMatches as completed_matches_count' => fn ($query) => $query
                    ->where('is_bye', false)
                    ->where('status', 'completed'),
            ])
            ->get()
            ->map(function ($court) use ($clerkNames): array {
                $clerks = $court->assignments
                    ->where('staff_type', 'clerk')
                    ->map(fn (EventCourtAssignment $assignment): array => [
                        'id' => $assignment->id,
                        'name' => $clerkNames->get($assignment->staff_id, 'Panitera tidak tersedia'),
                        'role' => Str::title(str_replace('_', ' ', $assignment->role)),
                    ])->values();
                $activeMatch = $court->tournamentMatches
                    ->first(fn (TournamentMatch $match): bool => in_array($match->status, ['ready', 'in_progress'], true));

                return [
                    'id' => $court->id,
                    'name' => $court->name,
                    'location' => $court->location,
                    'is_active' => (bool) $court->is_active,
                    'access_code' => $court->access_code,
                    'order' => (int) ($court->order ?: 1),
                    'var_url' => $court->var_url,
                    'raw_var_url' => $court->raw_var_url,
                    'is_var_enabled' => (bool) $court->is_var_enabled,
                    'clerks' => $clerks,
                    'total_matches' => (int) $court->total_matches_count,
                    'completed_matches' => (int) $court->completed_matches_count,
                    'active_match' => $activeMatch ? [
                        'id' => $activeMatch->id,
                        'label' => "Partai #{$activeMatch->match_sequence} · {$activeMatch->matchCategory?->name}",
                    ] : null,
                ];
            })
            ->values();

        $availableCourtIds = $courts->pluck('id');
        $requestedCourtId = $request->string('court_id')->toString();
        $selectedCourtId = $availableCourtIds->contains($requestedCourtId)
            ? $requestedCourtId
            : ($assignedCourtIds !== null && $availableCourtIds->count() === 1 ? (string) $availableCourtIds->first() : '');
        $requestedStatus = $request->string('status')->toString();
        $status = in_array($requestedStatus, ['completed', 'unfinished'], true) ? $requestedStatus : 'all';
        $requestedCategoryType = $request->string('category_type')->toString();
        $categoryType = in_array($requestedCategoryType, ['embu', 'randori'], true) ? $requestedCategoryType : 'all';
        $search = Str::limit(trim($request->string('search')->toString()), 100, '');

        $categoryOptions = $event->matchCategories()
            ->where('is_active', true)
            ->with('tournamentDrawing:id,event_match_category_id,bracket_type,status,participant_count')
            ->orderBy('order')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'gender', 'order', 'scoring_locked_at']);

        $requestedCategoryId = $request->string('category_id')->toString();
        $selectedCategoryId = $categoryOptions->contains('id', $requestedCategoryId) ? $requestedCategoryId : '';

        $requestedSortBy = $request->string('sort_by')->toString();
        $sortBy = in_array($requestedSortBy, ['schedule', 'category'], true) ? $requestedSortBy : 'schedule';

        $requestedViewMode = $request->string('view_mode')->toString();
        $viewMode = in_array($requestedViewMode, ['timeline', 'categories'], true) ? $requestedViewMode : 'timeline';

        $allCategoryMatches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where('is_bye', false)
            ->when($assignedCourtIds !== null, fn (Builder $q) => $q->whereIn('event_court_id', $assignedCourtIds))
            ->when($selectedCourtId !== '', fn (Builder $q) => $q->where('event_court_id', $selectedCourtId))
            ->with('court:id,name,order')
            ->get(['id', 'event_match_category_id', 'event_court_id', 'phase', 'round_label', 'status', 'metadata', 'scheduled_start_at', 'match_sequence'])
            ->groupBy('event_match_category_id');

        $categoriesData = $categoryOptions->map(function ($cat) use ($allCategoryMatches): array {
            $catMatches = $allCategoryMatches->get($cat->id, collect());
            $total = $catMatches->count();
            $completed = $catMatches->where('status', 'completed')->count();

            $prelimMatches = $catMatches->filter(fn ($m) => $m->phase !== 'final');
            $finalMatches = $catMatches->filter(fn ($m) => $m->phase === 'final');

            $hasPlaceholders = $finalMatches->contains(fn ($m) => (bool) ($m->metadata['placeholder'] ?? false));
            $prelimAllDone = $prelimMatches->isNotEmpty() && $prelimMatches->every(fn ($m) => $m->status === 'completed');

            $scheduledMatches = $catMatches->filter(fn ($m) => $m->scheduled_start_at !== null)
                ->sortBy(fn ($m): array => [
                    $m->scheduled_start_at?->timestamp ?? PHP_INT_MAX,
                    $m->match_sequence,
                ]);

            $earliestScheduledMatch = $scheduledMatches->first();
            $firstMatch = $earliestScheduledMatch ?? $catMatches->sortBy('match_sequence')->first();

            $hasSchedule = $earliestScheduledMatch !== null && $earliestScheduledMatch->scheduled_start_at !== null;

            return [
                'id' => $cat->id,
                'name' => $cat->name,
                'type' => $cat->type,
                'gender' => $cat->gender,
                'order' => $cat->order,
                'is_locked' => (bool) $cat->scoring_locked_at,
                'locked_at' => $cat->scoring_locked_at?->translatedFormat('d M Y, H:i'),
                'total_matches' => $total,
                'completed_matches' => $completed,
                'is_completed' => $total > 0 && $completed >= $total,
                'prelim_total' => $prelimMatches->count(),
                'prelim_completed' => $prelimMatches->where('status', 'completed')->count(),
                'prelim_all_done' => $prelimAllDone,
                'final_total' => $finalMatches->count(),
                'final_completed' => $finalMatches->where('status', 'completed')->count(),
                'has_placeholders' => $hasPlaceholders,
                'format' => $cat->tournamentDrawing?->bracket_type,
                'can_advance_finalists' => $cat->type === 'embu' && $cat->tournamentDrawing?->bracket_type !== 'embu_direct_final' && $prelimMatches->isNotEmpty() && $finalMatches->isNotEmpty(),
                'has_schedule' => $hasSchedule,
                'earliest_scheduled_timestamp' => $hasSchedule ? $earliestScheduledMatch->scheduled_start_at->timestamp : null,
                'earliest_scheduled_at' => $hasSchedule ? $earliestScheduledMatch->scheduled_start_at->translatedFormat('d M, H:i') : null,
                'earliest_scheduled_time' => $hasSchedule ? $earliestScheduledMatch->scheduled_start_at->format('H:i') : null,
                'earliest_court_name' => $firstMatch?->court?->name,
                'earliest_match_sequence' => $firstMatch?->match_sequence,
            ];
        })
            ->filter(fn ($cat) => $cat['total_matches'] > 0 || $selectedCourtId === '')
            ->values();

        if ($sortBy === 'schedule') {
            $categoriesData = $categoriesData->sort(function (array $a, array $b): int {
                $aHas = $a['has_schedule'] ? 0 : 1;
                $bHas = $b['has_schedule'] ? 0 : 1;
                if ($aHas !== $bHas) {
                    return $aHas <=> $bHas;
                }

                if ($a['has_schedule'] && $b['has_schedule']) {
                    if ($a['earliest_scheduled_timestamp'] !== $b['earliest_scheduled_timestamp']) {
                        return $a['earliest_scheduled_timestamp'] <=> $b['earliest_scheduled_timestamp'];
                    }
                    if (($a['earliest_match_sequence'] ?? 0) !== ($b['earliest_match_sequence'] ?? 0)) {
                        return ($a['earliest_match_sequence'] ?? 0) <=> ($b['earliest_match_sequence'] ?? 0);
                    }
                }

                if ($a['order'] !== $b['order']) {
                    return ($a['order'] ?? PHP_INT_MAX) <=> ($b['order'] ?? PHP_INT_MAX);
                }

                return strcmp($a['name'], $b['name']);
            })->values();
        } else {
            $categoriesData = $categoriesData->sortBy(fn (array $c): array => [
                $c['order'] ?? PHP_INT_MAX,
                $c['name'],
            ])->values();
        }

        $scopedMatches = fn (): Builder => TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where('is_bye', false)
            ->when($assignedCourtIds !== null, fn (Builder $query) => $query->whereIn('event_court_id', $assignedCourtIds));

        $matchesQuery = $scopedMatches()
            ->with([
                'matchCategory:id,name,type,gender,order,scoring_locked_at,scoring_locked_by',
                'court:id,name',
                'embuScores',
                'randoriScore',
                'redEntry.athlete.contingent:id,name',
                'blueEntry.athlete.contingent:id,name',
            ])
            ->when($selectedCourtId !== '', fn (Builder $query) => $query->where('event_court_id', $selectedCourtId))
            ->when($selectedCategoryId !== '', fn (Builder $query) => $query->where('event_match_category_id', $selectedCategoryId))
            ->when($categoryType !== 'all', fn (Builder $query) => $query->whereHas(
                'matchCategory',
                fn (Builder $categoryQuery) => $categoryQuery->where('type', $categoryType),
            ))
            ->when($status === 'completed', fn (Builder $query) => $query->where('status', 'completed'))
            ->when($status === 'unfinished', fn (Builder $query) => $query->where('status', '!=', 'completed'))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $keyword = '%'.Str::lower($search).'%';
                $query->where(function (Builder $matchQuery) use ($keyword): void {
                    $matchQuery->whereRaw('LOWER(participant_label) LIKE ?', [$keyword])
                        ->orWhereRaw('LOWER(red_label) LIKE ?', [$keyword])
                        ->orWhereRaw('LOWER(blue_label) LIKE ?', [$keyword])
                        ->orWhereRaw('LOWER(round_label) LIKE ?', [$keyword])
                        ->orWhereHas('matchCategory', fn (Builder $categoryQuery) => $categoryQuery->whereRaw('LOWER(name) LIKE ?', [$keyword]))
                        ->orWhereHas('court', fn (Builder $courtQuery) => $courtQuery->whereRaw('LOWER(name) LIKE ?', [$keyword]));
                });
            });

        $perPage = ($selectedCategoryId !== '') ? 50 : 15;

        if ($sortBy === 'category') {
            $matches = $matchesQuery
                ->join('event_match_categories', 'tournament_matches.event_match_category_id', '=', 'event_match_categories.id')
                ->select('tournament_matches.*')
                ->orderBy('event_match_categories.order')
                ->orderBy('event_match_categories.name')
                ->orderBy('tournament_matches.match_sequence')
                ->orderBy('tournament_matches.id')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (TournamentMatch $match): array => $this->matchData($match));
        } else {
            $matches = $matchesQuery
                ->orderByRaw('scheduled_start_at IS NULL')
                ->orderBy('scheduled_start_at')
                ->orderBy('event_court_id')
                ->orderBy('match_sequence')
                ->orderBy('id')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (TournamentMatch $match): array => $this->matchData($match));
        }

        $totalMatches = $scopedMatches()->count();
        $completedMatches = $scopedMatches()->where('status', 'completed')->count();
        $scopeScoreToCourts = fn (Builder $query): Builder => $query->when(
            $assignedCourtIds !== null,
            fn (Builder $scoreQuery) => $scoreQuery->whereHas(
                'tournamentMatch',
                fn (Builder $matchQuery) => $matchQuery->whereIn('event_court_id', $assignedCourtIds),
            ),
        );

        $randoriMatches = [];
        $championship = null;
        $embuData = null;
        if ($selectedCategoryId !== '') {
            $selectedCategoryModel = $categoryOptions->firstWhere('id', $selectedCategoryId);
            if ($selectedCategoryModel) {
                if ($selectedCategoryModel->type === 'randori') {
                    app(TournamentDrawingGenerator::class)->syncCategoryByes($selectedCategoryModel);
                    $randoriMatches = TournamentMatch::query()
                        ->where('event_match_category_id', $selectedCategoryId)
                        ->with([
                            'randoriScore',
                            'court:id,name',
                            'redEntry.athlete.contingent:id,name',
                            'blueEntry.athlete.contingent:id,name',
                        ])
                        ->orderBy('match_sequence')
                        ->get()
                        ->map(fn (TournamentMatch $match): array => [
                            'id' => $match->id,
                            'phase' => $match->phase,
                            'round_label' => $match->round_label,
                            'sequence' => $match->match_sequence,
                            'court_id' => $match->event_court_id,
                            'bracket_position' => (int) ($match->bracket_position ?? 1),
                            'next_match_id' => $match->next_match_id,
                            'aka_label' => $match->red_label,
                            'shiro_label' => $match->blue_label,
                            'aka_contingent' => $match->metadata['red']['contingent_name'] ?? $match->redEntry?->athlete?->contingent?->name,
                            'shiro_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->blueEntry?->athlete?->contingent?->name,
                            'red_contingent' => $match->metadata['red']['contingent_name'] ?? $match->redEntry?->athlete?->contingent?->name,
                            'blue_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->blueEntry?->athlete?->contingent?->name,
                            'metadata' => $match->metadata,
                            'court' => $match->court?->name,
                            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                            'status' => $match->status,
                            'is_bye' => (bool) $match->is_bye,
                            'is_ready' => ! ($match->metadata['placeholder'] ?? false),
                            'score' => $match->randoriScore ? [
                                'aka_total' => (int) $match->randoriScore->aka_total,
                                'shiro_total' => (int) $match->randoriScore->shiro_total,
                                'winner_corner' => $match->randoriScore->winner_corner,
                                'is_locked' => $match->randoriScore->locked_at !== null,
                                'locked_at' => $match->randoriScore->locked_at?->translatedFormat('d M Y, H:i'),
                                'notes' => $match->randoriScore->notes,
                            ] : null,
                        ])->values()->all();
                } elseif ($selectedCategoryModel->type === 'embu') {
                    $embuService = app(EmbuResultService::class);
                    $prelimRankings = $embuService->preliminaryRankings($selectedCategoryModel)
                        ->map(fn ($rows) => $rows->values());
                    $finalRankings = $embuService->finalRankings($selectedCategoryModel)->values();
                    $quotaPerPool = $embuService->quotaPerPool($selectedCategoryModel);
                    $boundaryTies = $embuService->boundaryTies($selectedCategoryModel);
                    $activeTies = $embuService->activeTies($selectedCategoryModel);

                    $embuData = [
                        'preliminary_rankings' => $prelimRankings,
                        'final_rankings' => $finalRankings,
                        'quota_per_pool' => $quotaPerPool,
                        'boundary_ties' => $boundaryTies,
                        'active_ties' => $activeTies,
                        'has_top_four_tie' => $embuService->hasTopFourTie($finalRankings),
                    ];
                }

                $champData = app(ChampionResultService::class)->categoryData($event, $selectedCategoryModel);
                $championship = [
                    'required_count' => $champData['required_champion_count'],
                    'is_confirmed' => $champData['current_champions']->isNotEmpty(),
                    'current_champions' => $champData['current_champions']->values(),
                    'generation_ready' => (bool) ($champData['generation']['ready'] ?? false),
                    'generation_message' => (string) ($champData['generation']['message'] ?? ''),
                    'candidates' => collect($champData['generation']['champions'] ?? [])->values(),
                ];
            }
        }

        return Inertia::render('Admin/Panitera/Dashboard', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'canManage' => $eventContext->canManage($request, $event),
            'stats' => [
                'total_matches' => $totalMatches,
                'completed_matches' => $completedMatches,
                'embu_scored' => $scopeScoreToCourts(
                    EmbuScore::query()->whereBelongsTo($event)->where('status', 'verified'),
                )->count(),
                'randori_scored' => $scopeScoreToCourts(
                    RandoriScore::query()->whereBelongsTo($event)->where('status', 'verified'),
                )->count(),
            ],
            'courts' => $courts,
            'categories' => $categoriesData,
            'matches' => $matches,
            'randoriMatches' => $randoriMatches,
            'championship' => $championship,
            'embuData' => $embuData,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'category_type' => $categoryType,
                'court_id' => $selectedCourtId,
                'category_id' => $selectedCategoryId,
                'sort_by' => $sortBy,
                'view_mode' => $viewMode,
            ],
            'isCourtRestricted' => $assignedCourtIds !== null,
        ]);
    }

    /** @return array<string, mixed> */
    private function matchData(TournamentMatch $match): array
    {
        $categoryType = $match->matchCategory?->type;
        $result = null;

        if ($match->status === 'completed') {
            if ($categoryType === 'embu') {
                $embuScore = $match->embuScores->first();
                if ($embuScore) {
                    $result = [
                        'type' => 'embu',
                        'final_score' => (float) $embuScore->final_score,
                        'total_penalty' => $embuScore->effectiveTotalPenalty(),
                        'is_disqualified' => (bool) $embuScore->is_disqualified,
                        'status' => $embuScore->status,
                        'status_label' => match ($embuScore->status) {
                            'verified' => 'Terverifikasi',
                            'ready_for_verification' => 'Siap Verifikasi',
                            default => 'Draft Wasit',
                        },
                    ];
                }
            } elseif ($categoryType === 'randori') {
                $randoriScore = $match->randoriScore;
                if ($randoriScore) {
                    $signatures = is_array($randoriScore->signatures) ? $randoriScore->signatures : [];
                    $signedCount = count(array_filter($signatures, fn ($signed): bool => (bool) $signed));

                    $result = [
                        'type' => 'randori',
                        'winner_corner' => $randoriScore->winner_corner,
                        'winner_label' => match ($randoriScore->winner_corner) {
                            'aka' => $match->red_label ?: 'AKA (Merah)',
                            'shiro' => $match->blue_label ?: 'SHIRO (Putih)',
                            default => 'Belum ditentukan',
                        },
                        'aka_total' => (int) $randoriScore->aka_total,
                        'shiro_total' => (int) $randoriScore->shiro_total,
                        'is_locked' => $randoriScore->locked_at !== null,
                        'signed_count' => $signedCount,
                        'status' => $randoriScore->status,
                    ];
                }
            }
        }

        $athleteNames = [];
        if ($categoryType === 'embu') {
            $members = data_get($match->metadata, 'members', []);
            if (! empty($members) && is_array($members)) {
                $athleteNames = array_values(array_filter($members));
            }
        }

        return [
            'id' => $match->id,
            'category_id' => $match->event_match_category_id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $categoryType,
            'category_is_locked' => (bool) $match->matchCategory?->scoring_locked_at,
            'category_locked_at' => $match->matchCategory?->scoring_locked_at?->translatedFormat('d M Y, H:i'),
            'court_id' => $match->event_court_id,
            'court' => $match->court?->name ?? 'Belum diplot',
            'phase' => $match->phase ?? (Str::contains(Str::lower((string) $match->round_label), 'final') ? 'final' : 'preliminary'),
            'pool' => $match->pool,
            'round_label' => $match->round_label,
            'sequence' => $match->match_sequence,
            'participant' => $match->participant_label ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label])),
            'athlete_names' => $athleteNames,
            'athlete_name' => ! empty($athleteNames) ? implode(' & ', $athleteNames) : null,
            'red_label' => $match->red_label,
            'blue_label' => $match->blue_label,
            'aka_label' => $match->red_label,
            'shiro_label' => $match->blue_label,
            'red_contingent' => $match->metadata['red']['contingent_name'] ?? $match->redEntry?->athlete?->contingent?->name,
            'blue_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->blueEntry?->athlete?->contingent?->name,
            'aka_contingent' => $match->metadata['red']['contingent_name'] ?? $match->redEntry?->athlete?->contingent?->name,
            'shiro_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->blueEntry?->athlete?->contingent?->name,
            'contingent_name' => $match->metadata['contingent_name'] ?? $match->metadata['red']['contingent_name'] ?? null,
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'status' => $match->status,
            'status_label' => match ($match->status) {
                'ready' => 'Siap Dipanggil',
                'in_progress' => 'Sedang Berlangsung',
                'completed' => 'Selesai',
                default => 'Menunggu',
            },
            'call_status' => $match->call_status,
            'call_status_label' => match ($match->call_status) {
                'officials_called' => 'Ofisial Dipanggil',
                'participants_called' => 'Peserta Dipanggil',
                'completed' => 'Selesai',
                default => 'Belum Dipanggil',
            },
            'is_placeholder' => (bool) ($match->metadata['placeholder'] ?? false),
            'result' => $result,
        ];
    }
}
