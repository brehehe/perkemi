<?php

namespace App\Services;

use App\Enums\RefereeCourtRole;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\TournamentMatch;
use App\Services\Panitera\EmbuScoreCalculator;
use App\Services\Panitera\PaniteraTimerState;
use App\Services\Panitera\RandoriScoreDraftStore;
use App\Services\Var\VarReviewService;

class CourtMonitorDataService
{
    public function __construct(
        private readonly EmbuParticipantDetails $participantDetails,
        private readonly PaniteraTimerState $timerState,
        private readonly EmbuScoreCalculator $calculator,
        private readonly RandoriScoreDraftStore $randoriDrafts,
    ) {}

    /** @return array<string, mixed> */
    public function monitorData(Event $event, EventCourt $court): array
    {
        $relations = [
            'matchCategory:id,name,type',
            'embuScores',
            'embuJudgeScores.referee:id,name,region,dan_grade',
            'randoriScore',
            'activeVarReview',
            'redEntry.athlete.contingent:id,name',
            'blueEntry.athlete.contingent:id,name',
        ];
        $baseQuery = fn () => TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($court, 'court')
            ->where('is_bye', false);

        $activeMatch = $baseQuery()
            ->whereIn('status', ['ready', 'in_progress'])
            ->with($relations)
            ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
            ->orderByDesc('called_at')
            ->first();

        $lastCompletedMatch = $baseQuery()
            ->where('status', 'completed')
            ->with($relations)
            ->latest('updated_at')
            ->first();

        $queue = $baseQuery()
            ->when($activeMatch, fn ($query) => $query->whereKeyNot($activeMatch->id))
            ->whereIn('status', ['pending', 'ready'])
            ->with('matchCategory:id,name,type')
            ->orderByRaw('scheduled_start_at IS NULL')
            ->orderBy('scheduled_start_at')
            ->orderBy('match_sequence')
            ->limit(10)
            ->get()
            ->reject(fn (TournamentMatch $match): bool => (bool) ($match->metadata['placeholder'] ?? false))
            ->take(3)
            ->map(fn (TournamentMatch $match): array => $this->queueMatchData($match))
            ->values();

        $serverNow = now();

        $categoryRecap = $this->categoryRecapData($event, $court, $activeMatch, $lastCompletedMatch);
        $activeCategoryId = $categoryRecap['id'] ?? null;

        $categoriesOnCourt = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($court, 'court')
            ->where('is_bye', false)
            ->with('matchCategory:id,name,type,gender,scoring_locked_at')
            ->get()
            ->filter(fn (TournamentMatch $m) => $m->matchCategory !== null)
            ->groupBy('event_match_category_id')
            ->map(function ($catMatches) use ($activeCategoryId): array {
                $first = $catMatches->first();
                $cat = $first->matchCategory;
                $total = $catMatches->count();
                $completed = $catMatches->where('status', 'completed')->count();

                return [
                    'id' => $cat?->id,
                    'name' => $cat?->name,
                    'type' => $cat?->type,
                    'gender' => $cat?->gender,
                    'is_locked' => (bool) $cat?->scoring_locked_at,
                    'total_matches' => $total,
                    'completed_matches' => $completed,
                    'is_active' => $cat?->id === $activeCategoryId,
                ];
            })
            ->values()
            ->all();

        return [
            'server_now' => $serverNow->toIso8601String(),
            'server_now_ms' => $serverNow->getTimestampMs(),
            'court_status' => $court->is_active ? 'active' : 'inactive',
            'active_match' => $activeMatch ? $this->matchData($event, $activeMatch) : null,
            'last_result' => $lastCompletedMatch ? $this->matchData($event, $lastCompletedMatch) : null,
            'queue' => $queue,
            'staff' => $this->staffData($event, $court),
            'progress' => [
                'total' => $baseQuery()->count(),
                'completed' => $baseQuery()->where('status', 'completed')->count(),
            ],
            'category_recap' => $categoryRecap,
            'categories_on_court' => $categoriesOnCourt,
        ];
    }

    /** @return array<string, mixed>|null */
    public function categoryRecapData(
        Event $event,
        EventCourt $court,
        ?TournamentMatch $activeMatch,
        ?TournamentMatch $lastCompletedMatch,
    ): ?array {
        $activeCategoryId = $activeMatch?->event_match_category_id
            ?? $lastCompletedMatch?->event_match_category_id;

        if (! $activeCategoryId) {
            $firstCourtMatch = TournamentMatch::query()
                ->whereBelongsTo($event)
                ->whereBelongsTo($court, 'court')
                ->where('is_bye', false)
                ->orderByRaw('scheduled_start_at IS NULL')
                ->orderBy('scheduled_start_at')
                ->orderBy('match_sequence')
                ->first();
            $activeCategoryId = $firstCourtMatch?->event_match_category_id;
        }

        if (! $activeCategoryId) {
            return null;
        }

        $category = $event->matchCategories()
            ->with('tournamentDrawing:id,event_match_category_id,bracket_type,status')
            ->where('id', $activeCategoryId)
            ->first();

        if (! $category) {
            return null;
        }

        if ($category->type === 'randori') {
            app(TournamentDrawingGenerator::class)->syncCategoryByes($category);
            $matches = TournamentMatch::query()
                ->whereBelongsTo($event)
                ->where('event_match_category_id', $category->id)
                ->with([
                    'randoriScore',
                    'court:id,name',
                    'redEntry.athlete.contingent:id,name',
                    'blueEntry.athlete.contingent:id,name',
                ])
                ->orderBy('match_sequence')
                ->get();
        } else {
            $matchesQuery = TournamentMatch::query()
                ->whereBelongsTo($event)
                ->where('event_match_category_id', $category->id)
                ->where('is_bye', false)
                ->whereBelongsTo($court, 'court')
                ->with([
                    'embuScores',
                    'embuJudgeScores.referee:id,name',
                    'court:id,name',
                ])
                ->orderBy('match_sequence');

            $matches = $matchesQuery->get();

            if ($matches->isEmpty()) {
                $matches = TournamentMatch::query()
                    ->whereBelongsTo($event)
                    ->where('event_match_category_id', $category->id)
                    ->where('is_bye', false)
                    ->with([
                        'embuScores',
                        'embuJudgeScores.referee:id,name',
                        'court:id,name',
                    ])
                    ->orderBy('match_sequence')
                    ->get();
            }
        }

        $totalMatches = $matches->count();
        $completedMatches = $matches->where('status', 'completed')->count();

        // Calculate temporary rank for embu completed matches
        $completedEmbu = $matches->filter(fn (TournamentMatch $m) => $m->status === 'completed' && $m->embuScores->isNotEmpty());
        $sortedEmbu = $completedEmbu->sortByDesc(function (TournamentMatch $m) {
            $score = $m->embuScores->first();
            if ($score?->is_disqualified) {
                return -999999;
            }

            return (float) ($score?->final_score ?? 0);
        })->values();

        $ranksByMatchId = [];
        $rankCounter = 1;
        foreach ($sortedEmbu as $m) {
            $score = $m->embuScores->first();
            if ($score?->is_disqualified) {
                $ranksByMatchId[$m->id] = 'DQ';
            } else {
                $ranksByMatchId[$m->id] = $rankCounter++;
            }
        }

        $matchRows = $matches->map(function (TournamentMatch $match) use ($event, $category, $activeMatch, $ranksByMatchId): array {
            $embuScore = $match->embuScores->first();
            $randoriScore = $match->randoriScore;
            $isActive = $activeMatch && $match->id === $activeMatch->id;
            $athletes = [];

            $embuResult = null;
            if ($category->type === 'embu') {
                $participantData = $this->participantDetails->forMatch($event, $match);
                $athletes = collect($participantData['athletes'] ?? [])->pluck('name')->all();

                $judgeScores = $match->relationLoaded('embuJudgeScores')
                    ? $match->embuJudgeScores->where('tiebreak_round', 0)->sortBy('judge_number')->keyBy('judge_number')
                    : collect();

                $liveJudgeScores = [];
                $liveJudgeScoreValues = [];
                for ($j = 1; $j <= 5; $j++) {
                    $js = $judgeScores->get($j);
                    $val = $js && (float) $js->total_score > 0 ? (float) $js->total_score : null;
                    if ($val !== null) {
                        $liveJudgeScoreValues[] = $val;
                    }
                    $liveJudgeScores[] = [
                        'judge_number' => $j,
                        'referee_name' => $js?->referee?->name ?? 'Juri '.$j,
                        'score' => $val,
                        'completed_items' => $js ? (int) $js->completed_items : 0,
                        'technique_subtotal' => $js ? (float) $js->technique_subtotal : 0,
                        'expression_subtotal' => $js ? (float) $js->expression_subtotal : 0,
                        'status' => $js?->status ?? 'waiting',
                        'is_submitted' => $js?->status === 'submitted',
                    ];
                }

                if ($embuScore && $embuScore->status === 'verified') {
                    $embuResult = [
                        'final_score' => (float) $embuScore->final_score,
                        'judge_scores' => is_array($embuScore->judge_scores) && ! empty($embuScore->judge_scores)
                            ? $embuScore->judge_scores
                            : $liveJudgeScoreValues,
                        'live_judges' => $liveJudgeScores,
                        'time_penalty' => (float) $embuScore->time_penalty,
                        'violation_penalty' => (float) $embuScore->violation_penalty,
                        'total_penalty' => $embuScore->effectiveTotalPenalty(),
                        'duration_seconds' => (int) $embuScore->duration_seconds,
                        'is_disqualified' => (bool) $embuScore->is_disqualified,
                        'disqualification_reason' => $embuScore->disqualification_reason,
                        'status' => 'verified',
                        'is_live' => false,
                    ];
                } elseif ($embuScore || ! empty($liveJudgeScoreValues)) {
                    $finalScore = null;
                    if ($embuScore && (float) $embuScore->final_score > 0) {
                        $finalScore = (float) $embuScore->final_score;
                    } elseif (count($liveJudgeScoreValues) >= 3) {
                        $tentative = $this->calculator->calculate(
                            $liveJudgeScoreValues,
                            $embuScore?->duration_seconds,
                            (string) $category->name,
                        );
                        $finalScore = (float) $tentative['final_score'];
                    }

                    $embuResult = [
                        'final_score' => $finalScore,
                        'judge_scores' => ! empty($embuScore?->judge_scores) ? $embuScore->judge_scores : $liveJudgeScoreValues,
                        'live_judges' => $liveJudgeScores,
                        'time_penalty' => (float) ($embuScore?->time_penalty ?? 0),
                        'violation_penalty' => (float) ($embuScore?->violation_penalty ?? 0),
                        'total_penalty' => $embuScore ? $embuScore->effectiveTotalPenalty() : 0.0,
                        'duration_seconds' => $embuScore?->duration_seconds,
                        'is_disqualified' => (bool) ($embuScore?->is_disqualified ?? false),
                        'disqualification_reason' => $embuScore?->disqualification_reason,
                        'status' => $embuScore?->status ?? 'scoring',
                        'is_live' => true,
                    ];
                }
            }

            $randoriResult = null;
            if ($category->type === 'randori') {
                if ($randoriScore) {
                    $randoriResult = [
                        'aka_label' => $match->red_label,
                        'shiro_label' => $match->blue_label,
                        'aka_total' => (int) $randoriScore->aka_total,
                        'shiro_total' => (int) $randoriScore->shiro_total,
                        'winner_corner' => $randoriScore->winner_corner,
                        'status' => $randoriScore->status,
                        'is_live' => $randoriScore->status !== 'completed',
                    ];
                } elseif ($isActive || $match->status === 'in_progress') {
                    $randoriDraft = $this->randoriDrafts->get($match);
                    if ($randoriDraft && (($randoriDraft['aka']['total'] ?? 0) > 0 || ($randoriDraft['shiro']['total'] ?? 0) > 0)) {
                        $randoriResult = [
                            'aka_label' => $match->red_label,
                            'shiro_label' => $match->blue_label,
                            'aka_total' => (int) ($randoriDraft['aka']['total'] ?? 0),
                            'shiro_total' => (int) ($randoriDraft['shiro']['total'] ?? 0),
                            'winner_corner' => $randoriDraft['decision_override']['winner_corner'] ?? null,
                            'status' => 'in_progress',
                            'is_live' => true,
                        ];
                    }
                }
            }

            return [
                'id' => $match->id,
                'phase' => $match->phase,
                'bracket_position' => (int) ($match->bracket_position ?? 1),
                'next_match_id' => $match->next_match_id,
                'sequence' => $match->match_sequence,
                'round_label' => $match->round_label,
                'participant_label' => $match->participant_label ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label])),
                'aka_label' => $match->red_label,
                'shiro_label' => $match->blue_label,
                'aka_contingent' => $match->metadata['red']['contingent_name'] ?? $match->redEntry?->athlete?->contingent?->name,
                'shiro_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->blueEntry?->athlete?->contingent?->name,
                'red_contingent' => $match->metadata['red']['contingent_name'] ?? $match->redEntry?->athlete?->contingent?->name,
                'blue_contingent' => $match->metadata['blue']['contingent_name'] ?? $match->blueEntry?->athlete?->contingent?->name,
                'metadata' => $match->metadata,
                'court' => $match->court?->name,
                'court_id' => $match->event_court_id,
                'is_bye' => (bool) $match->is_bye,
                'is_ready' => ! ($match->metadata['placeholder'] ?? false),
                'athletes' => $athletes,
                'status' => $match->status,
                'status_label' => $this->statusLabel($match->status),
                'call_status' => $match->call_status,
                'call_status_label' => $this->callStatusLabel($match->call_status),
                'is_active' => $isActive,
                'is_completed' => $match->status === 'completed',
                'rank' => $ranksByMatchId[$match->id] ?? null,
                'scheduled_at' => $match->scheduled_start_at?->translatedFormat('H:i'),
                'embu_result' => $embuResult,
                'randori_result' => $randoriResult,
                'score' => $randoriResult,
            ];
        })->values()->all();

        return [
            'id' => $category->id,
            'name' => $category->name,
            'type' => $category->type,
            'gender' => $category->gender,
            'format' => $category->tournamentDrawing?->bracket_type,
            'is_locked' => (bool) $category->scoring_locked_at,
            'locked_at' => $category->scoring_locked_at?->translatedFormat('d M Y, H:i'),
            'total_matches' => $totalMatches,
            'completed_matches' => $completedMatches,
            'matches' => $matchRows,
        ];
    }

    /** @return array<string, mixed> */
    public function matchData(Event $event, TournamentMatch $match): array
    {
        $embuScore = $match->embuScores->first();
        $randoriScore = $match->randoriScore;
        $type = $match->matchCategory?->type;

        $redContingent = data_get($match->metadata, 'red.contingent_name')
            ?? data_get($match->metadata, 'red.contingent')
            ?? $match->redEntry?->athlete?->contingent?->name
            ?? null;
        $blueContingent = data_get($match->metadata, 'blue.contingent_name')
            ?? data_get($match->metadata, 'blue.contingent')
            ?? $match->blueEntry?->athlete?->contingent?->name
            ?? null;

        return [
            'id' => $match->id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $type,
            'round_label' => $match->round_label,
            'sequence' => $match->match_sequence,
            'pool' => $match->pool,
            'participant_label' => $match->participant_label,
            'participant' => $type === 'embu' ? $this->participantDetails->forMatch($event, $match) : null,
            'aka_label' => $match->red_label,
            'shiro_label' => $match->blue_label,
            'aka_contingent' => $redContingent,
            'shiro_contingent' => $blueContingent,
            'red_contingent' => $redContingent,
            'blue_contingent' => $blueContingent,
            'status' => $match->status,
            'status_label' => $this->statusLabel($match->status),
            'call_status' => $match->call_status,
            'call_status_label' => $this->callStatusLabel($match->call_status),
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('d M Y, H:i'),
            'timer' => $this->timerState->timer($match),
            'result' => $type === 'embu'
                ? ($this->embuResultData($embuScore) ?? $this->liveEmbuResultData($match))
                : ($randoriScore ? [
                    'aka_total' => $randoriScore->aka_total,
                    'shiro_total' => $randoriScore->shiro_total,
                    'aka_breakdown' => $randoriScore->aka_breakdown ?? [],
                    'shiro_breakdown' => $randoriScore->shiro_breakdown ?? [],
                    'winner_corner' => $randoriScore->winner_corner,
                    'verified_at' => $randoriScore->verified_at?->translatedFormat('d M Y, H:i'),
                ] : null),
            'judge_scores' => $type === 'embu' && $match->relationLoaded('embuJudgeScores')
                ? $match->embuJudgeScores
                    ->where('tiebreak_round', 0)
                    ->sortBy('judge_number')
                    ->map(fn ($score): array => [
                        'judge_number' => $score->judge_number,
                        'role' => $score->role,
                        'referee_name' => $score->referee?->name ?? 'Juri '.$score->judge_number,
                        'technique_subtotal' => (float) $score->technique_subtotal,
                        'expression_subtotal' => (float) $score->expression_subtotal,
                        'total_score' => (float) $score->total_score,
                        'completed_items' => (int) $score->completed_items,
                        'status' => $score->status,
                        'is_signed' => filled($score->signature) || filled($score->signed_at),
                    ])
                    ->values()
                    ->all()
                : [],
            'var_stream_url' => data_get($match->metadata, 'var_stream_url')
                ?? $match->court?->var_url
                ?? 'https://var.smart-perkemi.id',
            'var_review' => [
                'is_under_review' => (bool) data_get($match->metadata, 'under_var_review', false),
                'reason' => data_get($match->metadata, 'var_review_reason'),
                'corner' => data_get($match->metadata, 'var_review_corner'),
                'last_verdict' => data_get($match->metadata, 'last_var_verdict'),
                'active_review' => ($activeReview = $match->activeVarReview) ? app(VarReviewService::class)->formatReview($activeReview) : null,
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function queueMatchData(TournamentMatch $match): array
    {
        return [
            'id' => $match->id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $match->matchCategory?->type,
            'round_label' => $match->round_label,
            'sequence' => $match->match_sequence,
            'scheduled_at' => $match->scheduled_start_at?->translatedFormat('H:i'),
        ];
    }

    /** @return array<string, mixed>|null */
    public function embuResultData(?EmbuScore $score): ?array
    {
        if (! $score) {
            return null;
        }

        return [
            'judge_scores' => $score->judge_scores,
            'time_penalty' => (float) $score->time_penalty,
            'violation_penalty' => (float) $score->violation_penalty,
            'total_penalty' => $score->effectiveTotalPenalty(),
            'is_disqualified' => (bool) $score->is_disqualified,
            'disqualification_reason' => $score->disqualification_reason,
            'final_score' => (float) $score->final_score,
            'duration_seconds' => $score->duration_seconds,
            'verified_at' => $score->verified_at?->translatedFormat('d M Y, H:i'),
            'is_live' => $score->status !== 'verified',
        ];
    }

    /** @return array<string, mixed>|null */
    public function liveEmbuResultData(TournamentMatch $match): ?array
    {
        if (! $match->relationLoaded('embuJudgeScores') || $match->embuJudgeScores->isEmpty()) {
            return null;
        }

        $judgeScores = $match->embuJudgeScores
            ->where('tiebreak_round', 0)
            ->sortBy('judge_number');

        $totals = [];
        foreach (range(1, 5) as $j) {
            $js = $judgeScores->firstWhere('judge_number', $j);
            $totals[] = $js && (float) $js->total_score > 0 ? (float) $js->total_score : 0.0;
        }

        $nonZero = array_filter($totals, fn ($v) => $v > 0);
        if (empty($nonZero)) {
            return null;
        }

        $calc = $this->calculator->calculate(
            $totals,
            null,
            (string) $match->matchCategory?->name,
        );

        return [
            'judge_scores' => $totals,
            'time_penalty' => 0.0,
            'violation_penalty' => 0.0,
            'total_penalty' => 0.0,
            'is_disqualified' => false,
            'disqualification_reason' => null,
            'final_score' => count($nonZero) >= 3 ? (float) $calc['final_score'] : null,
            'duration_seconds' => null,
            'verified_at' => null,
            'is_live' => true,
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public function staffData(Event $event, EventCourt $court): array
    {
        $event->loadMissing([
            'referees:id,name,profile_photo_path,certification_level,dan_grade,region',
        ]);
        $court->loadMissing('assignments');
        $eventPresentRefereeIds = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereDate('attendance_date', now()->toDateString())
            ->where('is_present', true)
            ->pluck('referee_id');
        $presentRefereeIds = $court->refereeAttendances()
            ->whereDate('attendance_date', now()->toDateString())
            ->whereIn('referee_id', $eventPresentRefereeIds)
            ->pluck('referee_id');
        $referees = $event->referees->keyBy('id');

        $activeRoles = [
            RefereeCourtRole::Chief->value,
            RefereeCourtRole::RegionalOne->value,
            RefereeCourtRole::RegionalTwo->value,
            RefereeCourtRole::AssistantOne->value,
            RefereeCourtRole::AssistantTwo->value,
        ];

        return $court->assignments
            ->where('staff_type', 'referee')
            ->filter(fn (EventCourtAssignment $assignment): bool => in_array($assignment->role, $activeRoles, true))
            ->sortBy(fn (EventCourtAssignment $assignment): int => RefereeCourtRole::tryFrom($assignment->role)?->judgeNumber() ?? 99)
            ->values()
            ->take(5)
            ->map(function (EventCourtAssignment $assignment) use ($presentRefereeIds, $referees): array {
                $referee = $referees->get($assignment->staff_id);
                $role = RefereeCourtRole::tryFrom($assignment->role);

                return [
                    'id' => $assignment->id,
                    'type' => 'referee',
                    'type_label' => 'Wasit / Juri',
                    'judge_number' => $role?->judgeNumber(),
                    'name' => $referee?->name ?? 'Wasit tidak tersedia',
                    'role' => $role?->label() ?? 'Wasit / Juri',
                    'certification' => $referee?->certification_level ?: $referee?->dan_grade,
                    'region' => $referee?->region,
                    'photo_url' => $referee?->profilePhotoUrl(),
                    'is_present' => $presentRefereeIds->contains($assignment->staff_id),
                ];
            })
            ->values()
            ->all();
    }

    public function statusLabel(string $status): string
    {
        return match ($status) {
            'ready' => 'Siap Dipanggil',
            'in_progress' => 'Sedang Berlangsung',
            'completed' => 'Selesai',
            default => 'Menunggu',
        };
    }

    public function callStatusLabel(string $status): string
    {
        return match ($status) {
            'officials_called' => 'Ofisial Dipanggil',
            'participants_called' => 'Peserta Dipanggil',
            'completed' => 'Selesai',
            default => 'Belum Dipanggil',
        };
    }
}
