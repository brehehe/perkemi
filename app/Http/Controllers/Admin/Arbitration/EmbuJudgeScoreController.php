<?php

namespace App\Http\Controllers\Admin\Arbitration;

use App\Enums\RefereeCourtRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Arbitration\StoreEmbuJudgeScoreRequest;
use App\Models\Event;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\TournamentMatch;
use App\Services\Referee\EmbuRefereeScoreService;
use App\Services\Referee\RefereeIdentity;
use Illuminate\Http\RedirectResponse;

class EmbuJudgeScoreController extends Controller
{
    public function update(
        StoreEmbuJudgeScoreRequest $request,
        TournamentMatch $tournamentMatch,
        RefereeIdentity $refereeIdentity,
        EmbuRefereeScoreService $scoreService,
    ): RedirectResponse {
        $event = $request->attributes->get('tenantEvent');
        abort_unless($event instanceof Event && $event->is($tournamentMatch->event), 404);

        $tournamentMatch->loadMissing(['matchCategory:id,name,type', 'court:id,event_id,name']);
        abort_unless($tournamentMatch->matchCategory?->type === 'embu' && $tournamentMatch->court, 404);
        abort_unless(
            $tournamentMatch->call_status === 'participants_called'
                && in_array($tournamentMatch->status, ['ready', 'in_progress'], true),
            409,
            'Pertandingan Embu belum dipanggil atau sudah tidak aktif.',
        );

        $user = $request->user();
        $referee = $refereeIdentity->forEvent($user, $event);
        abort_unless($referee, 403);

        $assignment = EventCourtAssignment::query()
            ->where('event_court_id', $tournamentMatch->event_court_id)
            ->where('staff_type', 'referee')
            ->where('staff_id', $referee->id)
            ->first();
        $role = RefereeCourtRole::tryFrom((string) $assignment?->role);
        abort_unless($assignment && $role, 403, 'Anda tidak ditugaskan sebagai juri pada court pertandingan ini.');

        $isCheckedIn = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', now()->toDateString())
            ->where('is_present', true)
            ->exists()
            && RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereBelongsTo($tournamentMatch->court, 'court')
                ->whereBelongsTo($referee)
                ->whereDate('attendance_date', now()->toDateString())
                ->exists();
        abort_unless($isCheckedIn, 403, 'Scan QR event dan court terlebih dahulu.');

        $validated = $request->validated();
        $scoreService->save(
            match: $tournamentMatch,
            court: $tournamentMatch->court,
            referee: $referee,
            user: $user,
            role: $role,
            aspectScores: $validated['aspect_scores'],
            violationPenalties: $validated['violation_penalties'] ?? [],
            signature: $validated['signature'] ?? null,
            notes: $validated['notes'] ?? null,
            status: $validated['status'],
        );

        return $validated['status'] === 'submitted'
            ? back()->with('success', 'Penilaian Embu berhasil dikirim ke Panitera.')
            : back();
    }
}
