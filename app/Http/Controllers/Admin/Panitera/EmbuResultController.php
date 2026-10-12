<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Panitera\StoreEmbuScoreRequest;
use App\Models\EmbuScore;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use App\Services\Panitera\EmbuResultService;
use App\Services\Panitera\EmbuScoreCalculator;
use App\Services\Panitera\EventContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmbuResultController extends Controller
{
    public function index(Request $request, EventContext $eventContext, EmbuResultService $results): Response
    {
        $event = $eventContext->eventFor($request);
        $categories = $event->matchCategories()
            ->where('type', 'embu')
            ->where('is_active', true)
            ->whereHas('tournamentDrawing')
            ->with('tournamentDrawing:id,event_match_category_id,bracket_type,status,participant_count')
            ->get(['id', 'name', 'type', 'gender', 'order']);
        $selectedCategoryId = $request->string('category')->toString() ?: $categories->first()?->id;
        $category = $selectedCategoryId ? $categories->firstWhere('id', $selectedCategoryId) : null;
        $focusMatchId = $request->string('match_id')->toString();
        $focusMatchId = $category && $focusMatchId !== '' && TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where('event_match_category_id', $category->id)
            ->whereKey($focusMatchId)
            ->exists()
                ? $focusMatchId
                : null;

        $preliminaryRankings = $category
            ? $results->preliminaryRankings($category)->map(fn ($rows) => $rows->values())->all()
            : [];
        $finalRankings = $category ? $results->finalRankings($category) : collect();
        $champions = $category
            ? $event->tournamentResults()
                ->where(function ($query) use ($category): void {
                    $query->where('event_match_category_id', $category->id)
                        ->orWhere(function ($legacy) use ($category): void {
                            $legacy->whereNull('event_match_category_id')
                                ->where('match_category', $category->name);
                        });
                })
                ->orderBy('rank')->get()->map(fn ($result): array => [
                    'id' => $result->id,
                    'rank' => $result->rank->value,
                    'rank_label' => $result->rank->label(),
                    'contingent_name' => $result->contingent_name,
                ])->values()
            : collect();

        return Inertia::render('Admin/Panitera/EmbuResult', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'courts' => $event->courts()->where('is_active', true)->get(['id', 'name', 'location']),
            'categories' => $categories->map(fn (EventMatchCategory $item): array => [
                'id' => $item->id,
                'name' => $item->name,
                'gender' => $item->gender,
                'format' => $item->tournamentDrawing?->bracket_type,
                'drawing_status' => $item->tournamentDrawing?->status,
                'participant_count' => (int) $item->tournamentDrawing?->participant_count,
            ])->values(),
            'selectedCategory' => $category?->id,
            'focusMatchId' => $focusMatchId,
            'preliminaryRankings' => $preliminaryRankings,
            'finalRankings' => $finalRankings,
            'boundaryTies' => $category ? $results->boundaryTies($category) : collect(),
            'quotaPerPool' => $category ? $results->quotaPerPool($category) : null,
            'hasTopFourTie' => $category ? $results->hasTopFourTie($finalRankings) : false,
            'champions' => $champions,
            'canManage' => $eventContext->canManage($request, $event),
        ]);
    }

    public function store(
        StoreEmbuScoreRequest $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        EmbuScoreCalculator $calculator,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($tournamentMatch->event_id === $event->id && $tournamentMatch->matchCategory?->type === 'embu', 404);

        $validated = $request->validated();
        $calculated = $calculator->calculate(
            $validated['judge_scores'],
            $validated['duration_seconds'] ?? null,
            $tournamentMatch->matchCategory->name,
            array_key_exists('penalty_override', $validated) && $validated['penalty_override'] !== null
                ? (float) $validated['penalty_override']
                : null,
        );

        EmbuScore::updateOrCreate(
            [
                'tournament_match_id' => $tournamentMatch->id,
                'tiebreak_round' => $validated['tiebreak_round'],
            ],
            [
                'event_id' => $event->id,
                'judge_scores' => array_map('floatval', $validated['judge_scores']),
                'duration_seconds' => $validated['duration_seconds'] ?? null,
                ...$calculated,
                'status' => 'verified',
                'submitted_by' => $request->user()->id,
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ],
        );
        $runningMilliseconds = $tournamentMatch->timer_started_at_ms
            ? max(0, now()->getTimestampMs() - $tournamentMatch->timer_started_at_ms)
            : ($tournamentMatch->timer_started_at
                ? (int) floor($tournamentMatch->timer_started_at->diffInMilliseconds(now()))
                : 0);
        $elapsedMilliseconds = max(0, (int) $tournamentMatch->timer_elapsed_ms);

        if ($elapsedMilliseconds === 0 && $tournamentMatch->timer_elapsed_seconds > 0) {
            $elapsedMilliseconds = $tournamentMatch->timer_elapsed_seconds * 1000;
        }

        $elapsedMilliseconds += $runningMilliseconds;
        $tournamentMatch->update([
            'status' => 'completed',
            'call_status' => 'completed',
            'timer_status' => 'stopped',
            'timer_started_at' => null,
            'timer_started_at_ms' => null,
            'timer_elapsed_seconds' => (int) floor($elapsedMilliseconds / 1000),
            'timer_elapsed_ms' => $elapsedMilliseconds,
            'timer_version' => max(0, (int) $tournamentMatch->timer_version) + 1,
        ]);

        $redirect = $request->boolean('return_to_match')
            ? redirect()->route('admin.panitera.matches.show', [
                'tournamentMatch' => $tournamentMatch,
                'event_id' => $event->id,
            ])
            : back();

        return $redirect->with('success', 'Nilai Embu berhasil diverifikasi dan disimpan.');
    }

    public function advanceFinalists(
        Request $request,
        EventMatchCategory $matchCategory,
        EventContext $eventContext,
        EmbuResultService $results,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($matchCategory->event_id === $event->id && $matchCategory->type === 'embu', 404);

        $updated = $results->advanceFinalists($matchCategory);

        return back()->with('success', $updated > 0
            ? "{$updated} slot finalis berhasil diisi dari hasil penyisihan."
            : 'Kategori ini memakai final langsung; peserta final sudah tersedia.');
    }

    public function confirmChampions(
        Request $request,
        EventMatchCategory $matchCategory,
        EventContext $eventContext,
        EmbuResultService $results,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($matchCategory->event_id === $event->id && $matchCategory->type === 'embu', 404);

        $results->confirmChampions($event, $matchCategory);

        return back()->with('success', 'Juara Embu berhasil dikunci: emas, perak, dan dua perunggu bersama.');
    }
}
