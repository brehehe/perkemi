<?php

namespace App\Http\Controllers\Admin\Arbitration;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Arbitration\StoreEventCourtAssignmentRequest;
use App\Http\Requests\Admin\Arbitration\StoreEventRefereeRequest;
use App\Http\Requests\Admin\Arbitration\UpdateEventRefereeRequest;
use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\TournamentMatch;
use App\Services\EmbuParticipantDetails;
use App\Services\Panitera\EmbuPenaltyCatalog;
use App\Services\Panitera\EmbuPenaltyState;
use App\Services\Referee\RefereeIdentity;
use App\Services\Reports\ReportWorkbook;
use App\Services\Reports\ScoreReportFormatter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ArbitrationController extends Controller
{
    /**
     * Display a listing of registered referees and judges.
     */
    public function referee(Request $request): Response
    {
        $activeEvent = $this->eventForRequest($request);
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $status = in_array($status, ['active', 'inactive'], true) ? $status : 'all';
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $allAssignedReferees = $activeEvent instanceof Event
            ? $activeEvent->referees()
                ->select([
                    'referees.id',
                    'referees.name',
                    'referees.gender',
                    'referees.dan_grade',
                    'referees.license_number',
                    'referees.certification_level',
                    'referees.region',
                    'referees.phone',
                    'referees.email',
                    'referees.profile_photo_path',
                    'referees.notes',
                    'referees.is_active',
                ])
                ->get()
            : collect();

        $assignedReferees = $activeEvent instanceof Event
            ? $activeEvent->referees()
                ->select([
                    'referees.id',
                    'referees.name',
                    'referees.gender',
                    'referees.dan_grade',
                    'referees.license_number',
                    'referees.certification_level',
                    'referees.region',
                    'referees.phone',
                    'referees.email',
                    'referees.profile_photo_path',
                    'referees.notes',
                    'referees.is_active',
                ])
                ->when($status === 'active', fn ($query) => $query->where('referees.is_active', true))
                ->when($status === 'inactive', fn ($query) => $query->where('referees.is_active', false))
                ->when($search, fn ($query) => $query->where(fn ($query) => $query
                    ->where('referees.name', $likeOperator, "%{$search}%")
                    ->orWhere('referees.dan_grade', $likeOperator, "%{$search}%")
                    ->orWhere('referees.license_number', $likeOperator, "%{$search}%")
                    ->orWhere('referees.certification_level', $likeOperator, "%{$search}%")
                    ->orWhere('referees.region', $likeOperator, "%{$search}%")))
                ->get()
            : collect();

        $nationalA = $allAssignedReferees->filter(fn ($referee) => Str::contains(Str::lower((string) $referee->certification_level), ['nasional a', 'national a']))->count();
        $nationalB = $allAssignedReferees->filter(fn ($referee) => Str::contains(Str::lower((string) $referee->certification_level), ['nasional b', 'national b']))->count();

        $referees = $assignedReferees->map(fn ($referee) => [
            'id' => $referee->id,
            'name' => $referee->name,
            'gender' => $referee->gender,
            'dan_grade' => $referee->dan_grade ?: '-',
            'license' => $referee->certification_level ?: ($referee->license_number ?: 'Belum terverifikasi'),
            'license_number' => $referee->license_number,
            'certification_level' => $referee->certification_level,
            'region' => $referee->region ?: '-',
            'phone' => $referee->phone ?: '-',
            'email' => $referee->email,
            'photo_url' => $referee->profilePhotoUrl(),
            'notes' => $referee->notes,
            'role' => $referee->pivot->role,
            'role_label' => match ($referee->pivot->role) {
                'chief' => 'Wasit Utama',
                'judge' => 'Juri',
                'reserve' => 'Wasit Cadangan',
                default => 'Wasit',
            },
            'is_active' => $referee->is_active,
        ])->values();

        $canManageEventReferees = $this->canManageEventStaff($request, $activeEvent);
        $assignedRefereeIds = $allAssignedReferees->pluck('id');
        $availableReferees = Referee::query()
            ->whereNotIn('id', $assignedRefereeIds)
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'dan_grade', 'license_number', 'certification_level', 'region', 'is_active'])
            ->map(fn (Referee $referee): array => [
                'id' => $referee->id,
                'name' => $referee->name,
                'sublabel' => implode(' · ', array_filter([
                    $referee->certification_level ?: $referee->license_number,
                    $referee->dan_grade,
                    $referee->region,
                    $referee->is_active ? 'Aktif' : 'Tidak aktif',
                ])),
            ])
            ->values();

        return Inertia::render('Admin/Arbitration/Referee', [
            'referees' => $referees,
            'stats' => [
                'total_referees' => $allAssignedReferees->count(),
                'active_referees' => $allAssignedReferees->where('is_active', true)->count(),
                'inactive_referees' => $allAssignedReferees->where('is_active', false)->count(),
                'national_a' => $nationalA,
                'national_b' => $nationalB,
                'regional' => $allAssignedReferees->count() - $nationalA - $nationalB,
            ],
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'activeEvent' => $activeEvent?->only(['id', 'name']),
            'events' => $this->eventOptions($request),
            'availableReferees' => $availableReferees,
            'canManageEventReferees' => $canManageEventReferees,
        ]);
    }

    public function storeReferee(StoreEventRefereeRequest $request): RedirectResponse
    {
        $event = $this->eventForRequest($request);
        abort_unless($this->canManageEventStaff($request, $event), 403);

        $validated = $request->validated();
        $role = $validated['role'];
        $source = $validated['source'];
        $refereeId = $validated['referee_id'] ?? null;
        $profilePhoto = $validated['profile_photo'] ?? null;
        unset($validated['role'], $validated['source'], $validated['referee_id'], $validated['profile_photo']);

        if ($source === 'new' && $profilePhoto) {
            $validated['profile_photo_path'] = $profilePhoto->store('referee-photos', 'public');
        }

        DB::transaction(function () use ($event, $validated, $role, $source, $refereeId): void {
            $referee = $source === 'existing'
                ? Referee::query()->findOrFail($refereeId)
                : Referee::query()->create($validated);

            if ($event->referees()->whereKey($referee->id)->exists()) {
                throw ValidationException::withMessages([
                    'referee_id' => 'Wasit tersebut sudah terdaftar pada event ini.',
                ]);
            }

            $event->referees()->attach($referee, ['role' => $role]);
        });

        return back()->with('success', $source === 'existing'
            ? 'Wasit dari master berhasil ditambahkan ke event.'
            : 'Wasit baru berhasil dibuat dan ditambahkan ke event.');
    }

    public function updateReferee(UpdateEventRefereeRequest $request, Referee $referee): RedirectResponse
    {
        $event = $this->eventForRequest($request);
        abort_unless($this->canManageEventStaff($request, $event), 403);
        abort_unless($event?->referees()->whereKey($referee->id)->exists(), 404);

        $validated = $request->validated();
        $role = $validated['role'];
        $profilePhoto = $validated['profile_photo'] ?? null;
        unset($validated['role'], $validated['profile_photo']);

        $previousPhotoPath = $referee->profile_photo_path;
        if ($profilePhoto) {
            $validated['profile_photo_path'] = $profilePhoto->store('referee-photos', 'public');
        }

        DB::transaction(function () use ($event, $referee, $validated, $role): void {
            $referee->update($validated);
            $event->referees()->updateExistingPivot($referee->id, ['role' => $role]);
        });

        if ($profilePhoto && $previousPhotoPath) {
            Storage::disk('public')->delete($previousPhotoPath);
        }

        return back()->with('success', 'Data Wasit berhasil diperbarui.');
    }

    public function destroyReferee(Request $request, Referee $referee): RedirectResponse
    {
        $event = $this->eventForRequest($request);
        abort_unless($this->canManageEventStaff($request, $event), 403);
        abort_unless($event?->referees()->whereKey($referee->id)->exists(), 404);

        DB::transaction(function () use ($event, $referee): void {
            EventCourtAssignment::query()
                ->whereIn('event_court_id', $event->courts()->select('id'))
                ->where('staff_type', 'referee')
                ->where('staff_id', $referee->id)
                ->delete();

            $event->referees()->detach($referee->id);
        });

        return back()->with('success', 'Wasit dihapus dari event. Riwayat penilaiannya tetap tersimpan.');
    }

    /**
     * Display court / tatami referee assignments.
     */
    public function assignment(Request $request): RedirectResponse
    {
        $activeEvent = $this->eventForRequest($request);

        return to_route('admin.arbitrase.wasit', ['event_id' => $activeEvent?->id]);
    }

    public function storeCourtAssignment(StoreEventCourtAssignmentRequest $request, EventCourt $court): RedirectResponse
    {
        $event = $this->eventForRequest($request);
        abort_unless($this->canManageEventStaff($request, $event) && $event?->is($court->event), 403);

        $validated = $request->validated();
        $relation = match ($validated['staff_type']) {
            'referee' => $event->referees(),
            'clerk' => $event->clerks(),
            'field_coordinator' => $event->fieldCoordinators(),
        };
        abort_unless($relation->whereKey($validated['staff_id'])->exists(), 404);

        EventCourtAssignment::updateOrCreate(
            ['event_court_id' => $court->id, 'staff_type' => $validated['staff_type'], 'staff_id' => $validated['staff_id']],
            ['role' => $validated['role']],
        );

        return back()->with('success', 'Perangkat berhasil ditugaskan ke lapangan.');
    }

    public function destroyCourtAssignment(Request $request, EventCourt $court, EventCourtAssignment $assignment): RedirectResponse
    {
        $event = $this->eventForRequest($request);
        abort_unless($this->canManageEventStaff($request, $event) && $event?->is($court->event) && $assignment->event_court_id === $court->id, 404);

        $assignment->delete();

        return back()->with('success', 'Penugasan perangkat lapangan dihapus.');
    }

    /**
     * Display the active Embu scoring sheet for the assigned referee and court.
     */
    public function scoring(
        Request $request,
        RefereeIdentity $refereeIdentity,
        EmbuParticipantDetails $participantDetails,
        EmbuPenaltyCatalog $penaltyCatalog,
        EmbuPenaltyState $penaltyState,
        ScoreReportFormatter $scoreReportFormatter,
    ): Response {
        $activeEvent = $this->eventForRequest($request);
        $refereeSession = null;
        $user = $request->user();

        if (! $user?->hasRole('Wasit') || $user->hasAnyRole(['Super Admin', 'Admin'])) {
            return $this->scoreReport($request, $activeEvent, $scoreReportFormatter);
        }

        if ($activeEvent) {
            $referee = $refereeIdentity->forEvent($user, $activeEvent);
            abort_unless($referee, 403);
            $courtIds = $activeEvent->courts()->pluck('id');
            $requestedCourtId = $request->string('court_id')->toString();
            $assignment = EventCourtAssignment::query()
                ->whereIn('event_court_id', $courtIds)
                ->where('staff_type', 'referee')
                ->where('staff_id', $referee->id)
                ->when($requestedCourtId !== '', fn ($query) => $query->where('event_court_id', $requestedCourtId))
                ->first();
            abort_unless($assignment, 403, 'Anda belum memiliki penugasan court pada event ini.');
            $role = RefereeCourtRole::tryFrom($assignment->role);
            abort_unless($role, 403, 'Posisi juri pada court belum valid.');
            $court = $activeEvent->courts()->findOrFail($assignment->event_court_id);
            $activeMatch = TournamentMatch::query()
                ->whereBelongsTo($activeEvent)
                ->whereBelongsTo($court, 'court')
                ->whereIn('status', ['ready', 'in_progress'])
                ->where('call_status', 'participants_called')
                ->with('matchCategory:id,name,type')
                ->orderByRaw("CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END")
                ->orderByRaw('scheduled_start_at IS NULL')
                ->orderBy('scheduled_start_at')
                ->orderBy('match_sequence')
                ->first();
            $judgeScore = $activeMatch?->matchCategory?->type === 'embu'
                ? $activeMatch->embuJudgeScores()
                    ->where('tiebreak_round', 0)
                    ->where('judge_number', $role->judgeNumber())
                    ->first()
                : null;
            $sharedPenaltyState = $role === RefereeCourtRole::Chief && $activeMatch
                ? $penaltyState->resolve($activeMatch, $judgeScore)
                : ['values' => [], 'points' => 0.0, 'source' => null, 'updated_by' => null, 'updated_at' => null];

            $refereeSession = [
                'referee_name' => $referee->name,
                'court_id' => $court->id,
                'court_name' => $court->name,
                'role_key' => $assignment->role,
                'role' => $role->label(),
                'judge_number' => $role->judgeNumber(),
                'can_manage_penalties' => $role === RefereeCourtRole::Chief,
                'penalty_state' => $sharedPenaltyState,
                'is_checked_in' => RefereeAttendance::query()
                    ->whereBelongsTo($activeEvent)
                    ->whereBelongsTo($referee)
                    ->whereDate('attendance_date', now()->toDateString())
                    ->where('is_present', true)
                    ->exists()
                    && RefereeCourtAttendance::query()
                        ->whereBelongsTo($activeEvent)
                        ->whereBelongsTo($court, 'court')
                        ->whereBelongsTo($referee)
                        ->whereDate('attendance_date', now()->toDateString())
                        ->exists(),
                'active_match' => $activeMatch ? [
                    'id' => $activeMatch->id,
                    'category_name' => $activeMatch->matchCategory?->name,
                    'category_type' => $activeMatch->matchCategory?->type,
                    'sequence' => $activeMatch->match_sequence,
                    'round_label' => $activeMatch->round_label,
                    'participant_label' => $activeMatch->participant_label,
                    'red_label' => $activeMatch->red_label,
                    'blue_label' => $activeMatch->blue_label,
                    'scheduled_at' => $activeMatch->scheduled_start_at?->translatedFormat('d M Y, H:i'),
                    'status' => $activeMatch->status,
                    'call_status' => $activeMatch->call_status,
                    'participant' => $participantDetails->forMatch($activeEvent, $activeMatch),
                    'automatic_penalty_rules' => $role === RefereeCourtRole::Chief
                        ? $penaltyCatalog->automaticRules()
                        : [],
                    'penalty_options' => $role === RefereeCourtRole::Chief
                        ? $penaltyCatalog->options((string) $activeMatch->matchCategory?->name)
                        : [],
                    'score_update_url' => route('admin.arbitrase.scoring.embu.update', $activeMatch, false),
                ] : null,
                'score' => $judgeScore ? [
                    'aspect_scores' => $judgeScore->aspect_scores,
                    'completed_items' => $judgeScore->completed_items,
                    'technique_subtotal' => (float) $judgeScore->technique_subtotal,
                    'expression_subtotal' => (float) $judgeScore->expression_subtotal,
                    'total_score' => (float) $judgeScore->total_score,
                    'violation_penalties' => $sharedPenaltyState['values'],
                    'violation_penalty' => $sharedPenaltyState['points'],
                    'violation_penalty_source' => $sharedPenaltyState['source'],
                    'status' => $judgeScore->status,
                    'signature' => $judgeScore->signature,
                    'notes' => $judgeScore->notes,
                    'signed_at' => $judgeScore->signed_at?->toIso8601String(),
                    'updated_at' => $judgeScore->updated_at?->toIso8601String(),
                ] : null,
            ];
        }

        $scoringPage = config('app.wasit_scoring_version') === 'new'
            ? 'Admin/Arbitration/ScoringNew'
            : 'Admin/Arbitration/Scoring';

        return Inertia::render($scoringPage, [
            'activeEvent' => $activeEvent,
            'refereeSession' => $refereeSession,
            'refereePortalUrl' => route('wasit.portal', ['event_id' => $activeEvent?->id], false),
        ]);
    }

    private function eventForRequest(Request $request): ?Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        $requestedEventId = $this->requestedEventId($request);

        if ($tenantEvent instanceof Event) {
            abort_if($requestedEventId !== null && $requestedEventId !== $tenantEvent->id, 404);

            return $tenantEvent;
        }

        if ($requestedEventId !== null) {
            return Event::query()->findOrFail($requestedEventId);
        }

        return Event::query()->where('is_active', true)->orderByDesc('start_date')->orderByDesc('id')->first()
            ?? Event::query()->orderByDesc('start_date')->orderByDesc('id')->first();
    }

    private function requestedEventId(Request $request): ?string
    {
        $eventId = $request->input('event_id');
        abort_unless($eventId === null || is_string($eventId), 404, 'Event tidak ditemukan.');

        $eventId = trim((string) $eventId);
        if ($eventId === '' || $eventId === 'all') {
            return null;
        }

        abort_unless(Str::isUuid($eventId), 404, 'Event tidak ditemukan.');

        return $eventId;
    }

    public function exportScores(
        Request $request,
        ScoreReportFormatter $formatter,
        ReportWorkbook $workbook,
    ): HttpResponse {
        $event = $this->eventForRequest($request);
        abort_unless($event instanceof Event, 404, 'Event belum tersedia.');
        $type = $request->string('type')->toString() === 'randori' ? 'randori' : 'embu';

        if ($type === 'randori') {
            $scores = RandoriScore::query()
                ->whereBelongsTo($event)
                ->with($this->randoriReportRelations())
                ->latest('updated_at')
                ->get();
            $headers = ['No.', 'Nomor Pertandingan', 'Partai', 'Court', 'AKA / Merah', 'Nilai AKA', 'SHIRO / Putih', 'Nilai SHIRO', 'Pemenang', 'Status', 'Pengesahan', 'Nama Penandatangan', 'Catatan'];
            $rows = $scores->values()->map(function (RandoriScore $score, int $index) use ($event, $formatter): array {
                $item = $formatter->randori($score, $event);

                return [
                    $index + 1,
                    $item['category_name'],
                    'Partai #'.$item['sequence'].' · '.$item['round_label'],
                    $item['court'],
                    $item['aka_label'],
                    $item['aka_total'],
                    $item['shiro_label'],
                    $item['shiro_total'],
                    $item['winner_label'],
                    $item['status_label'],
                    $item['signed_count'].'/6 tanda tangan',
                    collect($item['signatures'])->map(fn (array $signature): string => $signature['label'].': '.($signature['name'] ?: '-'))->implode(' | '),
                    $item['notes'],
                ];
            })->all();
            $reportName = 'Laporan Nilai Randori';
        } else {
            $scores = EmbuJudgeScore::query()
                ->whereBelongsTo($event)
                ->with($this->embuReportRelations())
                ->latest('updated_at')
                ->get();
            $headers = ['No.', 'Nomor Pertandingan', 'Partai', 'Court', 'Kontingen', 'Atlet', 'Teknik Terdaftar', 'Wasit / Juri', 'Posisi', 'Nilai Teknik', 'Nilai Ekspresi', 'Total', 'Status', 'Tanda Tangan', 'Catatan'];
            $rows = $scores->values()->map(function (EmbuJudgeScore $score, int $index) use ($event, $formatter): array {
                $item = $formatter->embu($score, $event);
                $participant = $item['participant_details'];

                return [
                    $index + 1,
                    $item['category_name'],
                    'Partai #'.$item['sequence'].' · '.$item['round_label'],
                    $item['court'],
                    $participant['contingent_name'] ?: $item['participant'],
                    collect($participant['athletes'])->pluck('name')->implode(', '),
                    collect($participant['techniques'])->pluck('name')->implode(', '),
                    $item['referee_name'],
                    'Juri '.$item['judge_number'].' · '.$item['role_label'],
                    $item['technique_subtotal'],
                    $item['expression_subtotal'],
                    $item['total_score'],
                    $item['status_label'],
                    $item['is_signed'] ? 'Tercatat' : 'Belum ada',
                    $item['notes'],
                ];
            })->all();
            $reportName = 'Laporan Nilai Embu per Wasit';
        }

        return response($workbook->build(
            $reportName,
            $event->name.' · Diekspor '.now()->translatedFormat('d M Y, H:i'),
            $headers,
            $rows,
        ), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$workbook->filename($reportName, $event->name).'"',
        ]);
    }

    private function scoreReport(Request $request, ?Event $event, ScoreReportFormatter $formatter): Response
    {
        abort_unless($event instanceof Event, 404, 'Event belum tersedia.');

        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $status = in_array($status, ['submitted', 'draft'], true) ? $status : 'all';
        $type = $request->string('type')->toString() === 'randori' ? 'randori' : 'embu';
        $likeOperator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $scoreQuery = $type === 'randori'
            ? RandoriScore::query()->whereBelongsTo($event)
            : EmbuJudgeScore::query()->whereBelongsTo($event);
        $filteredScores = (clone $scoreQuery)
            ->when($status === 'submitted', fn ($query) => $query->where('status', $type === 'randori' ? 'verified' : 'submitted'))
            ->when($status === 'draft', fn ($query) => $query->where('status', '!=', $type === 'randori' ? 'verified' : 'submitted'))
            ->when($search, fn ($query) => $query->where(function ($query) use ($search, $likeOperator, $type): void {
                if ($type === 'embu') {
                    $query->whereHas('referee', fn ($referees) => $referees->where('name', $likeOperator, "%{$search}%"));
                } else {
                    $query->whereHas('tournamentMatch.matchCategory', fn ($categories) => $categories->where('name', $likeOperator, "%{$search}%"));
                }

                $query->orWhereHas('tournamentMatch.matchCategory', fn ($categories) => $categories->where('name', $likeOperator, "%{$search}%"))
                    ->orWhereHas('tournamentMatch', fn ($matches) => $matches
                        ->where('participant_label', $likeOperator, "%{$search}%")
                        ->orWhere('red_label', $likeOperator, "%{$search}%")
                        ->orWhere('blue_label', $likeOperator, "%{$search}%"))
                    ->orWhereHas('tournamentMatch.court', fn ($courts) => $courts->where('name', $likeOperator, "%{$search}%"));
            }));

        $scores = $filteredScores
            ->with($type === 'randori' ? $this->randoriReportRelations() : $this->embuReportRelations())
            ->latest('updated_at')
            ->latest('id')
            ->paginate(12)
            ->withQueryString()
            ->through(fn (EmbuJudgeScore|RandoriScore $score): array => $type === 'randori'
                ? $formatter->randori($score, $event)
                : $formatter->embu($score, $event));

        $submittedQuery = (clone $scoreQuery)->where('status', $type === 'randori' ? 'verified' : 'submitted');

        return Inertia::render('Admin/Arbitration/ScoreReport', [
            'activeEvent' => $event->only(['id', 'name']),
            'events' => $this->eventOptions($request),
            'filters' => ['search' => $search, 'status' => $status, 'type' => $type],
            'summary' => [
                'total' => (clone $scoreQuery)->count(),
                'submitted' => (clone $submittedQuery)->count(),
                'drafts' => (clone $scoreQuery)->where('status', '!=', $type === 'randori' ? 'verified' : 'submitted')->count(),
                'actors' => (clone $scoreQuery)->distinct()->count($type === 'randori' ? 'submitted_by' : 'referee_id'),
                'embu' => EmbuJudgeScore::query()->whereBelongsTo($event)->count(),
                'randori' => RandoriScore::query()->whereBelongsTo($event)->count(),
            ],
            'scores' => $scores,
        ]);
    }

    /** @return list<string> */
    private function embuReportRelations(): array
    {
        return [
            'referee:id,name,license_number,certification_level',
            'court:id,name',
            'tournamentMatch:id,event_id,event_match_category_id,event_court_id,participant_entry_id,round_label,pool,match_sequence,participant_label,scheduled_start_at,metadata',
            'tournamentMatch.matchCategory:id,name,type',
        ];
    }

    /** @return list<string> */
    private function randoriReportRelations(): array
    {
        return [
            'submitter:id,name',
            'verifier:id,name',
            'tournamentMatch:id,event_id,event_match_category_id,event_court_id,round_label,pool,match_sequence,red_label,blue_label,scheduled_start_at,metadata',
            'tournamentMatch.matchCategory:id,name,type',
            'tournamentMatch.court:id,name',
        ];
    }

    private function canManageEventStaff(Request $request, ?Event $event): bool
    {
        $user = $request->user();

        if (! $user || ! $event instanceof Event) {
            return false;
        }

        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return true;
        }

        return in_array($event->accessRoleFor($user), [
            Event::AccessRoleResponsible,
            Event::AccessRoleAdmin,
        ], true);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function eventOptions(Request $request): Collection
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        $events = $tenantEvent instanceof Event
            ? Event::query()->whereKey($tenantEvent->id)
            : Event::query();

        return $events
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'city', 'start_date', 'end_date', 'status', 'is_active'])
            ->map(fn (Event $event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'date_label' => $event->start_date?->translatedFormat('d M Y').' – '.$event->end_date?->translatedFormat('d M Y'),
                'status_label' => $event->status->label(),
                'is_active' => (bool) $event->is_active,
            ]);
    }
}
