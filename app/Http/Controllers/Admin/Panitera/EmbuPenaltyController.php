<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Panitera\UpdateEmbuPenaltiesRequest;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use App\Services\Panitera\UpdateEmbuPenalties;
use Illuminate\Http\RedirectResponse;

class EmbuPenaltyController extends Controller
{
    public function update(
        UpdateEmbuPenaltiesRequest $request,
        TournamentMatch $tournamentMatch,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
        UpdateEmbuPenalties $updateEmbuPenalties,
    ): RedirectResponse {
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

        $updateEmbuPenalties->handle(
            $event,
            $tournamentMatch,
            $operator,
            $request->validated('violation_penalties'),
        );

        return back()->with('success', 'Denda teknis Embu berhasil disimpan dan nilai akhir langsung diperbarui.');
    }
}
