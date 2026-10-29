<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use App\Models\TournamentMatchVarReview;
use App\Services\Var\VarReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VarReviewController extends Controller
{
    public function store(Request $request, TournamentMatch $tournamentMatch, VarReviewService $varService): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'corner' => ['required', 'string', 'in:aka,shiro,neutral'],
            'requested_by' => ['nullable', 'string'],
            'reason' => ['required', 'string', 'max:255'],
            'match_second' => ['nullable', 'integer', 'min:0'],
            'camera_angle' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $review = $varService->startReview(
                match: $tournamentMatch,
                input: $validated,
                userName: $request->user()?->name ?? 'Panitera',
            );

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Review VAR berhasil dimulai. Timer otomatis dijeda.',
                    'review' => $varService->formatReview($review),
                    'cards_remaining' => $varService->calculateCardsRemaining($tournamentMatch),
                ]);
            }

            return back()->with('success', 'Review VAR berhasil diajukan dan timer dijeda.');
        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->with('error', $e->getMessage());
        }
    }

    public function resolve(Request $request, TournamentMatchVarReview $review, VarReviewService $varService): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:overturned,upheld,inconclusive'],
            'verdict_notes' => ['nullable', 'string', 'max:1000'],
            'reviewed_by' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $resolved = $varService->resolveReview(
                review: $review,
                verdict: $validated,
                userName: $request->user()?->name ?? 'Dewan Wasit VAR',
            );

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Putusan VAR berhasil disahkan.',
                    'review' => $varService->formatReview($resolved),
                    'cards_remaining' => $varService->calculateCardsRemaining($review->match),
                ]);
            }

            return back()->with('success', 'Putusan VAR berhasil dicatat dan disahkan.');
        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->with('error', $e->getMessage());
        }
    }

    public function history(TournamentMatch $tournamentMatch, VarReviewService $varService): JsonResponse
    {
        $reviews = $tournamentMatch->varReviews()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (TournamentMatchVarReview $r) => $varService->formatReview($r));

        return response()->json([
            'reviews' => $reviews,
            'active_review' => $tournamentMatch->activeVarReview ? $varService->formatReview($tournamentMatch->activeVarReview) : null,
            'cards_remaining' => $varService->calculateCardsRemaining($tournamentMatch),
        ]);
    }
}
