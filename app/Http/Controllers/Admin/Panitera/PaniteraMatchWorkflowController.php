<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Panitera\UpdatePaniteraMatchWorkflowRequest;
use App\Models\TournamentMatch;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use App\Services\Panitera\PaniteraMatchWorkflow;
use App\Services\Panitera\PaniteraTimerState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class PaniteraMatchWorkflowController extends Controller
{
    public function update(
        UpdatePaniteraMatchWorkflowRequest $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
        PaniteraMatchWorkflow $workflow,
        PaniteraTimerState $timerState,
    ): RedirectResponse|JsonResponse {
        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless($tournamentMatch->event_id === $event->id, 404);
        $courtAccess->ensureMatchIsAccessible($request, $event, $tournamentMatch);

        $validated = $request->validated();
        $updatedMatch = $workflow->update(
            $event,
            $tournamentMatch,
            $validated['action'],
            $request->user()->id,
            [
                'expected_timer_version' => isset($validated['timer_version']) ? (int) $validated['timer_version'] : null,
                'timer_direction' => $validated['timer_direction'] ?? 'up',
                'timer_duration_seconds' => (int) ($validated['timer_duration_seconds'] ?? 120),
            ],
        );

        if ($request->expectsJson()) {
            return $timerState->response($request, $updatedMatch, $event->id, $updatedMatch->event_court_id, now()->getTimestampMs());
        }

        return redirect()
            ->route('admin.panitera.matches.show', [
                'tournamentMatch' => $tournamentMatch,
                'event_id' => $event->id,
            ])
            ->with('success', $this->successMessage($validated['action']));
    }

    private function successMessage(string $action): string
    {
        return match ($action) {
            PaniteraMatchWorkflow::ActionCallOfficials => 'Ofisial dan perangkat pertandingan berhasil dipanggil.',
            PaniteraMatchWorkflow::ActionCallParticipants => 'Peserta pertandingan berhasil dipanggil ke court.',
            PaniteraMatchWorkflow::ActionStart => 'Pertandingan dan timer berhasil dimulai.',
            PaniteraMatchWorkflow::ActionPause => 'Timer pertandingan berhasil dijeda.',
            PaniteraMatchWorkflow::ActionFinish => 'Pertandingan selesai. Durasi resmi dan denda waktu Embu berhasil dihitung otomatis.',
            PaniteraMatchWorkflow::ActionResetTimer => 'Timer pertandingan berhasil diatur ulang.',
            PaniteraMatchWorkflow::ActionConfigureTimer => 'Mode dan durasi timer berhasil disimpan.',
            PaniteraMatchWorkflow::ActionRestart => 'Pertandingan berhasil diatur ulang untuk dimulai kembali.',
            default => 'Alur pertandingan berhasil diperbarui.',
        };
    }
}
