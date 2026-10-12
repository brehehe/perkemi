<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Panitera\UpdateChampionResultRequest;
use App\Models\EventMatchCategory;
use App\Models\TournamentResult;
use App\Services\Panitera\ChampionResultService;
use App\Services\Panitera\EventContext;
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
            ->get(['id', 'event_match_category_id', 'match_category']);
        $championship = $selectedCategory ? $champions->categoryData($event, $selectedCategory) : null;
        $categoryRows = $categories->map(function (EventMatchCategory $category) use ($savedResults, $champions, $championship): array {
            $drawing = $category->tournamentDrawing;
            $participantCount = (int) ($drawing?->participant_count ?? 0);
            $resultCount = $savedResults->filter(fn (TournamentResult $result): bool => $result->event_match_category_id === $category->id
                || ($result->event_match_category_id === null && $result->match_category === $category->name))->count();
            $requiredChampionCount = min(4, $participantCount);
            $generation = $championship && $championship['id'] === $category->id
                ? $championship['generation']
                : $champions->generationData($category);

            return [
                'id' => $category->id,
                'name' => $category->name,
                'type' => $category->type,
                'format' => $drawing?->bracket_type,
                'drawing_status' => $drawing?->status,
                'has_drawing' => $drawing !== null,
                'participant_count' => $participantCount,
                'is_exhibition' => $drawing ? $participantCount <= 3 : null,
                'classification_label' => $drawing
                    ? ($participantCount <= 3 ? 'Ekshibisi' : 'Non-ekshibisi')
                    : 'Drawing belum dibuat',
                'required_champion_count' => $requiredChampionCount,
                'result_count' => $resultCount,
                'is_confirmed' => $requiredChampionCount > 0 && $resultCount >= $requiredChampionCount,
                'generation_ready' => $generation['ready'],
                'generation_message' => $generation['message'],
                'generation_candidates' => collect($generation['champions'])->map(fn (array $candidate): array => [
                    'rank' => $candidate['rank'],
                    'label' => $candidate['label'],
                ])->values(),
            ];
        })->values();

        return Inertia::render('Admin/Panitera/ChampionResults', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'categories' => $categoryRows,
            'selectedCategory' => $selectedCategory?->id,
            'championship' => $championship,
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
