<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Panitera\StoreRandoriScoreRequest;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\RandoriResultService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RandoriResultController extends Controller
{
    public function index(Request $request, EventContext $eventContext): Response
    {
        $event = $eventContext->eventFor($request);
        $categories = $event->matchCategories()
            ->where('type', 'randori')
            ->where('is_active', true)
            ->whereHas('tournamentDrawing')
            ->with('tournamentDrawing:id,event_match_category_id,bracket_type,status')
            ->get(['id', 'name', 'type', 'gender', 'order']);
        $selectedCategoryId = $request->string('category')->toString() ?: $categories->first()?->id;
        $category = $selectedCategoryId ? $categories->firstWhere('id', $selectedCategoryId) : null;
        $matches = $category
            ? TournamentMatch::query()
                ->where('event_match_category_id', $category->id)
                ->where('is_bye', false)
                ->with(['randoriScore', 'court:id,name'])
                ->orderBy('match_sequence')
                ->get()
                ->map(fn (TournamentMatch $match): array => [
                    'id' => $match->id,
                    'phase' => $match->phase,
                    'round_label' => $match->round_label,
                    'sequence' => $match->match_sequence,
                    'court_id' => $match->event_court_id,
                    'aka_label' => $match->red_label,
                    'shiro_label' => $match->blue_label,
                    'court' => $match->court?->name,
                    'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                    'status' => $match->status,
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
                    ] : null,
                ])->values()
            : collect();

        return Inertia::render('Admin/Panitera/RandoriResult', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'courts' => $event->courts()->where('is_active', true)->get(['id', 'name', 'location']),
            'categories' => $categories->map(fn (EventMatchCategory $item): array => [
                'id' => $item->id,
                'name' => $item->name,
                'gender' => $item->gender,
                'format' => $item->tournamentDrawing?->bracket_type,
                'drawing_status' => $item->tournamentDrawing?->status,
            ])->values(),
            'selectedCategory' => $category?->id,
            'matches' => $matches,
            'canManage' => $eventContext->canManage($request, $event),
        ]);
    }

    public function store(
        StoreRandoriScoreRequest $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        RandoriResultService $results,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($tournamentMatch->event_id === $event->id && $tournamentMatch->matchCategory?->type === 'randori', 404);
        abort_if($tournamentMatch->metadata['placeholder'] ?? false, 422, 'Peserta pertandingan belum lengkap.');

        $validated = $request->validated();
        $results->record(
            $tournamentMatch,
            $validated['aka'],
            $validated['shiro'],
            $validated['signatures'],
            $validated['notes'] ?? null,
            $request->user()->id,
        );

        $redirect = $request->boolean('return_to_match')
            ? redirect()->route('admin.panitera.matches.show', [
                'tournamentMatch' => $tournamentMatch,
                'event_id' => $event->id,
            ])
            : back();

        return $redirect->with('success', 'Hasil Randori berhasil disimpan dan bagan berikutnya diperbarui. Kunci nilai setelah seluruh hasil dipastikan benar.');
    }

    public function lock(
        Request $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        RandoriResultService $results,
    ): RedirectResponse {
        $request->validate([
            'event_id' => ['required', 'uuid'],
        ]);

        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($tournamentMatch->event_id === $event->id && $tournamentMatch->matchCategory?->type === 'randori', 404);

        $results->lock($tournamentMatch, $request->user()->id);

        return redirect()->route('admin.panitera.matches.show', [
            'tournamentMatch' => $tournamentMatch,
            'event_id' => $event->id,
        ])->with('success', 'Nilai Randori berhasil dikunci dan tidak dapat diubah lagi.');
    }
}
