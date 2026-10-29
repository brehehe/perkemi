<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Models\EventCourtAssignment;
use App\Models\TournamentMatch;
use App\Services\Panitera\EmbuPenaltyCatalog;
use App\Services\Panitera\EmbuPenaltyState;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use App\Services\Panitera\PaniteraTimerState;
use App\Services\Panitera\RandoriScoreDraftStore;
use App\Services\Var\VarReviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PaniteraMatchController extends Controller
{
    public function __construct(private readonly PaniteraTimerState $timerState) {}

    public function show(
        Request $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
        RandoriScoreDraftStore $randoriDrafts,
        EmbuPenaltyCatalog $penaltyCatalog,
        EmbuPenaltyState $penaltyState,
    ): Response {
        $event = $eventContext->eventFor($request);
        abort_unless($tournamentMatch->event_id === $event->id, 404);
        $courtAccess->ensureMatchIsAccessible($request, $event, $tournamentMatch);

        $tournamentMatch->load([
            'matchCategory:id,name,type',
            'court.assignments',
            'court.refereeAttendances' => fn ($query) => $query
                ->whereBelongsTo($event)
                ->whereDate('attendance_date', now()->toDateString()),
            'embuScores',
            'embuJudgeScores.referee:id,name',
            'randoriScore',
        ]);
        $event->load([
            'referees:id,name',
            'clerks:id,name',
            'fieldCoordinators:id,name',
        ]);

        $staffNames = [
            'referee' => $event->referees->pluck('name', 'id'),
            'clerk' => $event->clerks->pluck('name', 'id'),
            'field_coordinator' => $event->fieldCoordinators->pluck('name', 'id'),
        ];
        $activeRefereeIds = $tournamentMatch->court?->refereeAttendances
            ->pluck('referee_id')
            ->all() ?? [];
        $staff = $tournamentMatch->court?->assignments
            ->map(fn (EventCourtAssignment $assignment): array => [
                'id' => $assignment->id,
                'type' => $assignment->staff_type,
                'type_label' => match ($assignment->staff_type) {
                    'referee' => 'Wasit / Juri',
                    'clerk' => 'Panitera',
                    'field_coordinator' => 'Koordinator Lapangan',
                    default => Str::title(str_replace('_', ' ', $assignment->staff_type)),
                },
                'name' => $staffNames[$assignment->staff_type]?->get($assignment->staff_id, 'Perangkat tidak tersedia'),
                'role' => $assignment->staff_type === 'referee'
                    ? (RefereeCourtRole::tryFrom($assignment->role)?->label() ?? Str::title(str_replace('_', ' ', $assignment->role)))
                    : Str::title(str_replace('_', ' ', $assignment->role)),
                'is_active' => $assignment->staff_type !== 'referee'
                    || in_array($assignment->staff_id, $activeRefereeIds, true),
            ])->values() ?? collect();

        $judgeScores = $tournamentMatch->embuJudgeScores
            ->where('tiebreak_round', 0)
            ->keyBy('judge_number');
        $sharedPenaltyState = $penaltyState->resolve(
            $tournamentMatch,
            $judgeScores->get(RefereeCourtRole::Chief->judgeNumber()),
        );
        $refereeAssignments = $tournamentMatch->court?->assignments
            ->where('staff_type', 'referee')
            ->keyBy('role') ?? collect();
        $judgeProgress = collect(RefereeCourtRole::cases())
            ->map(function (RefereeCourtRole $role) use ($activeRefereeIds, $judgeScores, $refereeAssignments, $staffNames, $penaltyCatalog, $sharedPenaltyState, $tournamentMatch): array {
                $assignment = $refereeAssignments->get($role->value);
                $score = $judgeScores->get($role->judgeNumber());

                return [
                    'judge_number' => $role->judgeNumber(),
                    'role' => $role->label(),
                    'referee_id' => $assignment?->staff_id,
                    'referee_name' => $assignment
                        ? $staffNames['referee']->get($assignment->staff_id, 'Wasit tidak tersedia')
                        : 'Belum ditugaskan',
                    'is_active' => $assignment
                        ? in_array($assignment->staff_id, $activeRefereeIds, true)
                        : false,
                    'completed_items' => $score?->completed_items ?? 0,
                    'technique_subtotal' => $score ? (float) $score->technique_subtotal : 0,
                    'expression_subtotal' => $score ? (float) $score->expression_subtotal : 0,
                    'total_score' => $score ? (float) $score->total_score : 0,
                    'violation_penalty' => $role === RefereeCourtRole::Chief ? $sharedPenaltyState['points'] : 0,
                    'penalty_summaries' => $role === RefereeCourtRole::Chief
                        ? $penaltyCatalog->summaries($sharedPenaltyState['values'], (string) $tournamentMatch->matchCategory?->name)
                        : [],
                    'status' => $score?->status ?? 'waiting',
                    'is_signed' => $score?->signed_at !== null,
                    'notes' => $score?->notes,
                    'updated_at' => $score?->updated_at?->translatedFormat('H:i:s'),
                ];
            })
            ->values();

        $nextMatch = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->where('event_court_id', $tournamentMatch->event_court_id)
            ->whereKeyNot($tournamentMatch->id)
            ->where('is_bye', false)
            ->whereIn('status', ['pending', 'ready', 'in_progress'])
            ->when(
                $tournamentMatch->scheduled_start_at,
                fn ($query, $scheduledStartAt) => $query->where(function ($scheduled) use ($scheduledStartAt, $tournamentMatch): void {
                    $scheduled->where('scheduled_start_at', '>', $scheduledStartAt)
                        ->orWhere(function ($sameSlot) use ($scheduledStartAt, $tournamentMatch): void {
                            $sameSlot->where('scheduled_start_at', $scheduledStartAt)
                                ->where('id', '>', $tournamentMatch->id);
                        });
                }),
            )
            ->with('matchCategory:id,name,type')
            ->orderByRaw('scheduled_start_at IS NULL')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->get()
            ->first(fn (TournamentMatch $match): bool => ! ($match->metadata['placeholder'] ?? false));

        $serverNow = now();

        return Inertia::render('Admin/Panitera/MatchDetail', [
            'activeEvent' => $event->only(['id', 'name', 'city', 'venue', 'start_date', 'end_date', 'tts_announcer_enabled']),
            'events' => $eventContext->accessibleEvents($request),
            'match' => $this->matchData($tournamentMatch, $randoriDrafts, $penaltyCatalog, $penaltyState),
            'staff' => $staff,
            'judgeProgress' => $judgeProgress,
            'nextMatch' => $nextMatch ? [
                'id' => $nextMatch->id,
                'category_name' => $nextMatch->matchCategory?->name,
                'category_type' => $nextMatch->matchCategory?->type,
                'round_label' => $nextMatch->round_label,
                'sequence' => $nextMatch->match_sequence,
                'scheduled_at' => $nextMatch->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            ] : null,
            'canManage' => $eventContext->canManage($request, $event),
            'serverNow' => $serverNow->toIso8601String(),
            'serverNowMs' => $serverNow->getTimestampMs(),
            'timerStateUrl' => route('admin.panitera.matches.timer', ['tournamentMatch' => $tournamentMatch, 'event_id' => $event->id]),
        ]);
    }

    /** @return array<string, mixed> */
    private function matchData(
        TournamentMatch $match,
        RandoriScoreDraftStore $randoriDrafts,
        EmbuPenaltyCatalog $penaltyCatalog,
        EmbuPenaltyState $penaltyState,
    ): array {
        $type = $match->matchCategory?->type;
        $embuScore = $match->embuScores->first();
        $randoriScore = $match->randoriScore;
        $judgeScores = $match->embuJudgeScores->where('tiebreak_round', 0);
        $sharedPenaltyState = $penaltyState->resolve(
            $match,
            $judgeScores->firstWhere('judge_number', RefereeCourtRole::Chief->judgeNumber()),
        );
        $completedJudges = $judgeScores
            ->filter(fn ($score): bool => $score->completed_items === 10)
            ->count();
        $signedJudges = $judgeScores
            ->filter(fn ($score): bool => $score->completed_items === 10 && $score->signed_at !== null)
            ->count();
        $isEmbuFinished = (bool) data_get($match->metadata, 'panitera.finished_at');

        return [
            'id' => $match->id,
            'category_id' => $match->event_match_category_id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $type,
            'phase' => $match->phase,
            'round_label' => $match->round_label,
            'pool' => $match->pool,
            'sequence' => $match->match_sequence,
            'court_id' => $match->event_court_id,
            'court' => $match->court?->name,
            'court_location' => $match->court?->location,
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'scheduled_end_at' => $match->scheduled_end_at?->translatedFormat('H:i'),
            'participant_label' => $match->participant_label,
            'aka_label' => $match->red_label,
            'shiro_label' => $match->blue_label,
            'status' => $match->status,
            'status_label' => data_get($match->metadata, 'panitera.finished_at')
                ? 'Menunggu Verifikasi Hasil'
                : $this->statusLabel($match->status),
            'call_status' => $match->call_status,
            'call_status_label' => $this->callStatusLabel($match->call_status),
            'called_at' => $match->called_at?->translatedFormat('d M Y, H:i:s'),
            'timer' => [
                ...$this->timerState->timer($match),
                'penalty_category' => Str::contains(Str::lower((string) $match->matchCategory?->name), ['tandoku', 'tunggal'])
                    ? 'Tandoku / Tunggal'
                    : 'Pasangan / Beregu',
            ],
            'is_placeholder' => (bool) ($match->metadata['placeholder'] ?? false),
            'embu_verification' => $type === 'embu' ? [
                'completed_judges' => $completedJudges,
                'signed_judges' => $signedJudges,
                'required_judges' => 5,
                'minimum_judges' => 1,
                'can_save' => $isEmbuFinished && $completedJudges >= 1 && $embuScore?->status !== 'verified',
                'is_saved' => $embuScore?->status === 'verified',
                'reopen_url' => route('admin.panitera.matches.embu-result.destroy', [
                    'tournamentMatch' => $match,
                    'event_id' => $match->event_id,
                ], false),
            ] : null,
            'embu_penalties' => $type === 'embu' ? [
                'options' => $penaltyCatalog->options((string) $match->matchCategory?->name),
                'values' => $sharedPenaltyState['values'],
                'points' => $sharedPenaltyState['points'],
                'source' => $sharedPenaltyState['source'],
                'source_label' => match ($sharedPenaltyState['source']) {
                    EmbuPenaltyState::SourcePanitera => 'Panitera',
                    EmbuPenaltyState::SourceChiefReferee => 'Wasit Utama',
                    default => 'Belum diisi',
                },
                'updated_at' => $sharedPenaltyState['updated_at'],
                'can_edit' => $match->status !== 'completed' && $embuScore?->status !== 'verified',
                'update_url' => route('admin.panitera.matches.embu-penalties.update', [
                    'tournamentMatch' => $match,
                    'event_id' => $match->event_id,
                ], false),
            ] : null,
            'randori_draft' => $type === 'randori'
                ? $randoriDrafts->get($match, $randoriScore)
                : null,
            'result' => $type === 'embu'
                ? ($embuScore ? [
                    'judge_scores' => $embuScore->judge_scores,
                    'judge_numbers' => data_get($match->metadata, 'panitera.result_judge_numbers')
                        ?: range(1, count($embuScore->judge_scores)),
                    'time_penalty' => (float) $embuScore->time_penalty,
                    'violation_penalty' => (float) $embuScore->violation_penalty,
                    'total_penalty' => $embuScore->effectiveTotalPenalty(),
                    'penalty_summaries' => $penaltyCatalog->summaries(
                        $embuScore->violation_penalties ?? [],
                        (string) $match->matchCategory?->name,
                    ),
                    'penalty_recorded_by' => $sharedPenaltyState['source'] === EmbuPenaltyState::SourcePanitera
                        ? 'Panitera'
                        : $judgeScores->firstWhere('judge_number', 1)?->referee?->name,
                    'is_disqualified' => (bool) $embuScore->is_disqualified,
                    'disqualification_reason' => $embuScore->disqualification_reason,
                    'middle_score' => (float) $embuScore->middle_score,
                    'final_score' => (float) $embuScore->final_score,
                    'duration_seconds' => $embuScore->duration_seconds,
                    'status' => $embuScore->status,
                    'verified_at' => $embuScore->verified_at?->translatedFormat('d M Y, H:i'),
                ] : null)
                : ($randoriScore ? [
                    'aka_breakdown' => $randoriScore->aka_breakdown,
                    'shiro_breakdown' => $randoriScore->shiro_breakdown,
                    'aka_total' => $randoriScore->aka_total,
                    'shiro_total' => $randoriScore->shiro_total,
                    'winner_corner' => $randoriScore->winner_corner,
                    'status' => $randoriScore->status,
                    'is_locked' => $randoriScore->locked_at !== null,
                    'locked_at' => $randoriScore->locked_at?->translatedFormat('d M Y, H:i'),
                    'signatures' => $randoriScore->signatures,
                    'signature_names' => $randoriScore->signature_names,
                    'notes' => $randoriScore->notes,
                    'verified_at' => $randoriScore->verified_at?->translatedFormat('d M Y, H:i'),
                    'decision_override' => data_get($match->metadata, 'result.decision_override'),
                    'win_method' => data_get($match->metadata, 'result.win_method'),
                ] : null),
            'var_review' => [
                'cards_remaining' => app(VarReviewService::class)->calculateCardsRemaining($match),
                'active_review' => ($activeReview = $match->activeVarReview) ? app(VarReviewService::class)->formatReview($activeReview) : null,
                'recent_reviews' => $match->varReviews()->latest()->limit(5)->get()->map(fn ($r) => app(VarReviewService::class)->formatReview($r))->values()->all(),
            ],
        ];
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'ready' => 'Siap Dipanggil',
            'in_progress' => 'Sedang Berlangsung',
            'completed' => 'Selesai',
            default => 'Menunggu',
        };
    }

    private function callStatusLabel(string $status): string
    {
        return match ($status) {
            'officials_called' => 'Ofisial Dipanggil',
            'participants_called' => 'Peserta Dipanggil',
            'completed' => 'Selesai',
            default => 'Belum Dipanggil',
        };
    }
}
