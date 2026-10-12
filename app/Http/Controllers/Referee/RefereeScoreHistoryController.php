<?php

namespace App\Http\Controllers\Referee;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\EmbuJudgeScore;
use App\Services\Panitera\EventContext;
use App\Services\Referee\RefereeIdentity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RefereeScoreHistoryController extends Controller
{
    public function __invoke(
        Request $request,
        EventContext $eventContext,
        RefereeIdentity $refereeIdentity,
    ): Response {
        $event = $eventContext->eventFor($request);
        $user = $request->user();
        abort_unless($user && $user->hasRole('Wasit'), 403);

        $referee = $refereeIdentity->forEvent($user, $event);
        abort_unless($referee, 403, 'Akun login belum ditautkan ke master Wasit pada event ini.');

        $scoreQuery = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee);

        $submittedQuery = (clone $scoreQuery)->where('status', 'submitted');
        $scores = (clone $scoreQuery)
            ->with([
                'court:id,name',
                'tournamentMatch:id,event_id,event_match_category_id,event_court_id,round_label,pool,match_sequence,participant_label,scheduled_start_at,status',
                'tournamentMatch.matchCategory:id,name,type',
            ])
            ->latest('updated_at')
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (EmbuJudgeScore $score): array => [
                'id' => $score->id,
                'match_id' => $score->tournament_match_id,
                'court' => $score->court?->name,
                'category_name' => $score->tournamentMatch?->matchCategory?->name,
                'category_type' => $score->tournamentMatch?->matchCategory?->type,
                'sequence' => $score->tournamentMatch?->match_sequence,
                'round_label' => $score->tournamentMatch?->round_label,
                'pool' => $score->tournamentMatch?->pool,
                'participant' => $score->tournamentMatch?->participant_label,
                'scheduled_at' => $score->tournamentMatch?->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                'tiebreak_round' => $score->tiebreak_round,
                'judge_number' => $score->judge_number,
                'role' => $score->role,
                'role_label' => RefereeCourtRole::tryFrom($score->role)?->label() ?? $score->role,
                'aspect_scores' => $score->aspect_scores ?? [],
                'completed_items' => $score->completed_items,
                'technique_subtotal' => (float) $score->technique_subtotal,
                'expression_subtotal' => (float) $score->expression_subtotal,
                'total_score' => (float) $score->total_score,
                'status' => $score->status,
                'status_label' => $score->status === 'submitted' ? 'Sudah dikirim' : 'Draft',
                'is_signed' => filled($score->signature),
                'notes' => $score->notes,
                'submitted_at' => $score->submitted_at?->translatedFormat('d M Y, H:i:s'),
                'updated_at' => $score->updated_at?->translatedFormat('d M Y, H:i:s'),
            ]);

        return Inertia::render('Referee/ScoreHistory', [
            'activeEvent' => $event->only(['id', 'name', 'slug', 'city', 'venue', 'start_date', 'end_date']),
            'events' => $eventContext->accessibleEvents($request),
            'referee' => [
                'id' => $referee->id,
                'name' => $referee->name,
                'license_number' => $referee->license_number,
                'certification_level' => $referee->certification_level,
                'dan_grade' => $referee->dan_grade,
                'region' => $referee->region,
            ],
            'summary' => [
                'total' => (clone $scoreQuery)->count(),
                'submitted' => (clone $submittedQuery)->count(),
                'drafts' => (clone $scoreQuery)->where('status', '!=', 'submitted')->count(),
                'average_score' => ($average = (clone $submittedQuery)->avg('total_score')) !== null
                    ? round((float) $average, 2)
                    : null,
            ],
            'scores' => $scores,
        ]);
    }
}
