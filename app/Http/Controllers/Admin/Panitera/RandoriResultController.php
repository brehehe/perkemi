<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Events\RandoriScoreStateUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Panitera\StoreRandoriScoreRequest;
use App\Http\Requests\Admin\Panitera\UpdateRandoriScoreDraftRequest;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use App\Services\Panitera\RandoriResultService;
use App\Services\Panitera\RandoriScoreDraftStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
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
        PaniteraCourtAccess $courtAccess,
        RandoriResultService $results,
        RandoriScoreDraftStore $drafts,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($tournamentMatch->event_id === $event->id && $tournamentMatch->matchCategory?->type === 'randori', 404);
        $courtAccess->ensureMatchIsAccessible($request, $event, $tournamentMatch);
        abort_if($tournamentMatch->metadata['placeholder'] ?? false, 422, 'Peserta pertandingan belum lengkap.');

        $validated = $request->validated();
        $score = $results->record(
            $tournamentMatch,
            $validated['aka'],
            $validated['shiro'],
            $validated['signatures'],
            $validated['signature_names'] ?? null,
            $validated['notes'] ?? null,
            $request->user()->id,
        );
        $state = $drafts->replaceFromScore($tournamentMatch, $score, $request->user()->id);
        $this->broadcastState(
            $tournamentMatch,
            'result_saved',
            $state,
            $validated['sync_client_id'] ?? null,
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
        PaniteraCourtAccess $courtAccess,
        RandoriResultService $results,
        RandoriScoreDraftStore $drafts,
    ): RedirectResponse {
        $request->validate([
            'event_id' => ['required', 'uuid'],
            'sync_client_id' => ['nullable', 'string', 'max:100'],
        ]);

        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($tournamentMatch->event_id === $event->id && $tournamentMatch->matchCategory?->type === 'randori', 404);
        $courtAccess->ensureMatchIsAccessible($request, $event, $tournamentMatch);

        $score = $results->lock($tournamentMatch, $request->user()->id);
        $state = $drafts->replaceFromScore($tournamentMatch, $score, $request->user()->id);
        $this->broadcastState(
            $tournamentMatch,
            'result_locked',
            $state,
            $request->string('sync_client_id')->toString() ?: null,
        );

        return redirect()->route('admin.panitera.matches.show', [
            'tournamentMatch' => $tournamentMatch,
            'event_id' => $event->id,
        ])->with('success', 'Nilai Randori berhasil dikunci dan tidak dapat diubah lagi.');
    }

    public function updateDraft(
        UpdateRandoriScoreDraftRequest $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
        RandoriScoreDraftStore $drafts,
    ): JsonResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($tournamentMatch->event_id === $event->id && $tournamentMatch->matchCategory?->type === 'randori', 404);
        $courtAccess->ensureMatchIsAccessible($request, $event, $tournamentMatch);
        abort_if($tournamentMatch->metadata['placeholder'] ?? false, 422, 'Peserta pertandingan belum lengkap.');

        if ($tournamentMatch->randoriScore?->locked_at) {
            throw ValidationException::withMessages([
                'result' => 'Nilai Randori sudah dikunci dan draft tidak dapat diubah lagi.',
            ]);
        }

        $validated = $request->validated();
        $state = $drafts->put($tournamentMatch, $validated['changes'], $request->user()->id);

        if ($state['changes'] !== []) {
            $this->broadcastState(
                $tournamentMatch,
                'draft_updated',
                $state,
                $validated['client_id'],
            );
        }

        return response()->json([
            'version' => $state['state']['version'],
            'updated_at' => $state['state']['updated_at'],
            'changed' => $state['changes'] !== [],
        ]);
    }

    /** @param array{state: array<string, mixed>, changes: array<string, mixed>} $state */
    private function broadcastState(
        TournamentMatch $match,
        string $action,
        array $state,
        ?string $clientId,
    ): void {
        RandoriScoreStateUpdated::dispatch(
            eventId: $match->event_id,
            matchId: $match->id,
            courtId: $match->event_court_id,
            action: $action,
            version: $state['state']['version'],
            changes: $state['changes'],
            clientId: $clientId,
            updatedAt: (string) $state['state']['updated_at'],
        );
    }
}
