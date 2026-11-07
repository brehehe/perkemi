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
use Illuminate\Support\Facades\Cache;

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

        $today = now()->toDateString();
        $isCheckedIn = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($referee)
            ->where('is_present', true)
            ->where(function ($q) use ($today) {
                $q->whereDate('attendance_date', $today)
                    ->orWhere('checked_in_at', '>=', now()->startOfDay());
            })
            ->exists()
            && RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereBelongsTo($tournamentMatch->court, 'court')
                ->whereBelongsTo($referee)
                ->where(function ($q) use ($today) {
                    $q->whereDate('attendance_date', $today)
                        ->orWhere('checked_in_at', '>=', now()->startOfDay());
                })
                ->exists();
        abort_unless($isCheckedIn, 403, 'Scan QR event dan court terlebih dahulu.');

        $lockKey = "referee_session_lock:court_{$tournamentMatch->event_court_id}:role_{$role->value}";
        Cache::put($lockKey, [
            'session_id' => $request->session()->getId(),
            'user_id' => (string) $user->id,
            'referee_id' => (string) $referee->id,
            'acquired_at' => now()->toIso8601String(),
        ], now()->addHours(6));

        $isMatchActive = in_array($tournamentMatch->status, ['ready', 'in_progress'], true);

        if (! $isMatchActive) {
            $existingScore = $tournamentMatch->embuJudgeScores()
                ->where('judge_number', $role->judgeNumber())
                ->where('tiebreak_round', 0)
                ->first();

            if ($existingScore?->status === 'submitted') {
                return redirect()->route('wasit.portal', ['event_id' => $event->id])
                    ->with('info', 'Penilaian Anda untuk partai ini telah selesai dan dikirim.');
            }

            if ($tournamentMatch->status === 'completed') {
                abort(409, 'Pertandingan ini telah selesai dan ditutup oleh Panitera.');
            }

            abort(409, 'Pertandingan Embu belum dipanggil atau sedang tidak aktif.');
        }

        $validated = $request->validated();
        $scoreService->save(
            match: $tournamentMatch,
            court: $tournamentMatch->court,
            referee: $referee,
            user: $user,
            role: $role,
            aspectScores: $validated['aspect_scores'],
            violationPenalties: $validated['violation_penalties'] ?? null,
            signature: $validated['signature'] ?? null,
            notes: $validated['notes'] ?? null,
            status: $validated['status'],
        );

        return $validated['status'] === 'submitted'
            ? back()->with('success', 'Penilaian Embu berhasil dikirim ke Panitera.')
            : back();
    }
}
