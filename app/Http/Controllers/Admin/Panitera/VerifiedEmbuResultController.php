<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use App\Services\Panitera\ReopenEmbuResult;
use App\Services\Panitera\VerifyEmbuResult;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifiedEmbuResultController extends Controller
{
    public function store(
        Request $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
        VerifyEmbuResult $verifyEmbuResult,
    ): RedirectResponse {
        $request->validate([
            'event_id' => ['required', 'uuid'],
        ]);

        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless(
            $tournamentMatch->event_id === $event->id
                && $tournamentMatch->matchCategory?->type === 'embu',
            404,
        );
        $courtAccess->ensureMatchIsAccessible($request, $event, $tournamentMatch);
        $operator = $request->user();
        abort_unless($operator instanceof User, 403);

        $verifyEmbuResult->handle($event, $tournamentMatch, $operator);

        return redirect()
            ->route('admin.panitera.matches.show', [
                'tournamentMatch' => $tournamentMatch,
                'event_id' => $event->id,
            ])
            ->with('success', 'Nilai Embu berhasil disimpan, papan Wasit ditutup, dan hasil masuk ke klasemen.');
    }

    public function destroy(
        Request $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
        ReopenEmbuResult $reopenEmbuResult,
    ): RedirectResponse {
        $request->validate([
            'event_id' => ['required', 'uuid'],
        ]);

        $event = $eventContext->eventFor($request);
        $eventContext->ensureCanManage($request, $event);
        abort_unless(
            $tournamentMatch->event_id === $event->id
                && $tournamentMatch->matchCategory?->type === 'embu',
            404,
        );
        $courtAccess->ensureMatchIsAccessible($request, $event, $tournamentMatch);
        $operator = $request->user();
        abort_unless($operator instanceof User, 403);

        $reopenEmbuResult->handle($event, $tournamentMatch, $operator);

        return redirect()
            ->route('admin.panitera.matches.show', [
                'tournamentMatch' => $tournamentMatch,
                'event_id' => $event->id,
            ])
            ->with('success', 'Form penilaian Wasit berhasil dibuka ulang. Nilai lama tetap tersedia sebagai draft dan hasil harus disimpan ulang.');
    }
}
