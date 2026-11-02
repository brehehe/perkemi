<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Panitera\UpdateChampionResultRequest;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use App\Services\Panitera\ChampionResultService;
use App\Services\Panitera\EmbuResultService;
use App\Services\Panitera\EventContext;
use App\Services\TournamentDrawingGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChampionResultController extends Controller
{
    public function index(
        Request $request,
        EventContext $eventContext,
        ChampionResultService $champions,
    ): Response {
        $event = $eventContext->eventFor($request);
        $categories = $event->matchCategories()
            ->where('is_active', true)
            ->with([
                'tournamentDrawing:id,event_id,event_match_category_id,status,bracket_type,participant_count,contingent_count',
                'tournamentDrawing.matches.randoriScore',
            ])
            ->orderBy('order')
            ->orderBy('name')
            ->get(['id', 'event_id', 'name', 'type', 'gender', 'order']);
        $selectedCategoryId = $request->string('category')->toString()
            ?: $categories->first(fn (EventMatchCategory $category): bool => $category->tournamentDrawing !== null)?->id
            ?: $categories->first()?->id;
        $selectedCategory = $selectedCategoryId ? $categories->firstWhere('id', $selectedCategoryId) : null;
        abort_if($selectedCategoryId !== null && ! $selectedCategory, 404);

        $savedResults = TournamentResult::query()
            ->whereBelongsTo($event)
            ->with('athlete:id,name')
            ->orderBy('rank')
            ->get();
        $championship = $selectedCategory ? $champions->categoryData($event, $selectedCategory) : null;
        $categoryRows = $categories->map(function (EventMatchCategory $category) use ($savedResults, $champions, $championship): array {
            $drawing = $category->tournamentDrawing;
            $participantCount = (int) ($drawing?->participant_count ?? 0);
            $categorySavedResults = $savedResults->filter(fn (TournamentResult $result): bool => $result->event_match_category_id === $category->id
                || ($result->event_match_category_id === null && $result->match_category === $category->name))->values();
            $resultCount = $categorySavedResults->count();
            $requiredChampionCount = min(4, $participantCount);
            $generation = $championship && $championship['id'] === $category->id
                ? $championship['generation']
                : $champions->generationData($category);

            return [
                'id' => $category->id,
                'name' => $category->name,
                'type' => $category->type,
                'gender' => $category->gender,
                'format' => $drawing?->bracket_type,
                'drawing_status' => $drawing?->status,
                'has_drawing' => $drawing !== null,
                'participant_count' => $participantCount,
                'is_exhibition' => $drawing ? ((bool) $category->is_exhibition || $participantCount <= 3) : null,
                'classification_label' => $drawing
                    ? (((bool) $category->is_exhibition || $participantCount <= 3) ? 'Ekshibisi' : 'Non-ekshibisi')
                    : 'Drawing belum dibuat',
                'required_champion_count' => $requiredChampionCount,
                'result_count' => $resultCount,
                'is_confirmed' => $requiredChampionCount > 0 && $resultCount >= $requiredChampionCount,
                'saved_champions' => $categorySavedResults->map(fn (TournamentResult $res): array => [
                    'id' => $res->id,
                    'rank' => $res->rank->value,
                    'rank_label' => $res->rank->label(),
                    'label' => $res->athlete?->name ?: $res->contingent_name,
                    'contingent_name' => $res->contingent_name,
                ])->values(),
                'generation_ready' => $generation['ready'],
                'generation_message' => $generation['message'],
                'generation_candidates' => collect($generation['champions'])->map(fn (array $candidate): array => [
                    'rank' => $candidate['rank'],
                    'label' => $candidate['label'],
                    'contingent_name' => $candidate['contingent_name'] ?? null,
                    'basis' => $candidate['basis'] ?? null,
                ])->values(),
            ];
        })->values();

        $requestedType = $request->string('type')->toString();
        $type = in_array($requestedType, ['embu', 'randori'], true) ? $requestedType : 'all';

        $selectedMatches = collect();
        $embuData = null;

        if ($selectedCategory) {
            if ($selectedCategory->type === 'randori') {
                app(TournamentDrawingGenerator::class)->syncCategoryByes($selectedCategory);
                $drawing = $selectedCategory->tournamentDrawing;
                $matchQuery = $drawing
                    ? $drawing->matches()
                    : TournamentMatch::query()->where('event_match_category_id', $selectedCategory->id);

                $selectedMatches = $matchQuery
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
                        'aka_contingent' => $match->metadata['red']['contingent_name'] ?? $match->metadata['red']['city'] ?? $match->redEntry?->athlete?->contingent?->name,
                        'shiro_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->metadata['blue']['city'] ?? $match->blueEntry?->athlete?->contingent?->name,
                        'red_contingent' => $match->metadata['red']['contingent_name'] ?? $match->metadata['red']['city'] ?? $match->redEntry?->athlete?->contingent?->name,
                        'blue_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->metadata['blue']['city'] ?? $match->blueEntry?->athlete?->contingent?->name,
                        'metadata' => $match->metadata,
                        'court' => $match->court?->name,
                        'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                        'status' => $match->status,
                        'is_bye' => (bool) $match->is_bye,
                        'is_ready' => ! ($match->metadata['placeholder'] ?? false),
                        'score' => $match->randoriScore ? [
                            'aka_breakdown' => $match->randoriScore->aka_breakdown,
                            'shiro_breakdown' => $match->randoriScore->shiro_breakdown,
                            'aka_total' => $match->randoriScore->aka_total,
                            'shiro_total' => $match->randoriScore->shiro_total,
                            'winner_corner' => $match->randoriScore->winner_corner,
                            'is_locked' => $match->randoriScore->locked_at !== null,
                            'locked_at' => $match->randoriScore->locked_at?->translatedFormat('d M Y, H:i'),
                            'verified_at' => $match->randoriScore->verified_at?->translatedFormat('d M Y, H:i'),
                            'notes' => $match->randoriScore->notes,
                            'decision_override' => data_get($match->metadata, 'result.decision_override'),
                            'win_method' => data_get($match->metadata, 'result.win_method'),
                        ] : null,
                    ])->values();
            } elseif ($selectedCategory->type === 'embu') {
                $embuService = app(EmbuResultService::class);
                $finalRankings = $embuService->finalRankings($selectedCategory)->values();
                $embuData = [
                    'preliminary_rankings' => $embuService->preliminaryRankings($selectedCategory)->map(fn ($rows) => $rows->values())->all(),
                    'final_rankings' => $finalRankings,
                    'boundary_ties' => $embuService->boundaryTies($selectedCategory)->values(),
                    'quota_per_pool' => $embuService->quotaPerPool($selectedCategory),
                    'has_top_four_tie' => $embuService->hasTopFourTie($finalRankings),
                ];
            }
        }

        return Inertia::render('Admin/Panitera/ChampionResults', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'categories' => $categoryRows,
            'selectedCategory' => $selectedCategory?->id,
            'championship' => $championship,
            'matches' => $selectedMatches,
            'embuData' => $embuData,
            'filters' => [
                'type' => $type,
                'category' => $selectedCategory?->id,
            ],
            'summary' => [
                'total_categories' => $categoryRows->count(),
                'ready_categories' => $categoryRows->whereStrict('generation_ready', true)->count(),
                'exhibition_categories' => $categoryRows->whereStrict('is_exhibition', true)->count(),
                'non_exhibition_categories' => $categoryRows->whereStrict('is_exhibition', false)->count(),
                'confirmed_categories' => $categoryRows->whereStrict('is_confirmed', true)->count(),
            ],
            'canManage' => $eventContext->canManage($request, $event),
        ]);
    }

    public function generate(
        Request $request,
        EventMatchCategory $matchCategory,
        EventContext $eventContext,
        ChampionResultService $champions,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($matchCategory->event_id === $event->id, 404);

        $champions->generate($event, $matchCategory);

        return back()->with('success', 'Hasil juara otomatis berhasil dibuat dari hasil pertandingan terbaru.');
    }

    public function update(
        UpdateChampionResultRequest $request,
        EventMatchCategory $matchCategory,
        EventContext $eventContext,
        ChampionResultService $champions,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($matchCategory->event_id === $event->id, 404);

        $champions->save($event, $matchCategory, $request->validated('champions'));

        return back()->with('success', 'Susunan juara berhasil disesuaikan dan disimpan.');
    }
}
