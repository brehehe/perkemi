<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\EventMatchCategory;
use App\Services\Panitera\EventContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaniteraCategoryLockController extends Controller
{
    public function lock(
        Request $request,
        EventMatchCategory $matchCategory,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        abort_unless($matchCategory->event_id === $event->id, 404);

        $matchCategory->update([
            'scoring_locked_at' => now(),
            'scoring_locked_by' => $request->user()?->id,
        ]);

        if ($request->filled('redirect_to')) {
            return redirect($request->input('redirect_to'))
                ->with('success', "Nomor pertandingan {$matchCategory->name} berhasil dikunci.");
        }

        return redirect()->route('admin.panitera.scoring.index', [
            'event_id' => $event->id,
            'category_id' => '',
        ])->with('success', "Nomor pertandingan {$matchCategory->name} berhasil dikunci.");
    }

    public function unlock(
        Request $request,
        EventMatchCategory $matchCategory,
        EventContext $eventContext,
    ): RedirectResponse {
        $event = $eventContext->eventFor($request);
        abort_unless($matchCategory->event_id === $event->id, 404);

        $matchCategory->update([
            'scoring_locked_at' => null,
            'scoring_locked_by' => null,
        ]);

        if ($request->filled('redirect_to')) {
            return redirect($request->input('redirect_to'))
                ->with('success', "Kunci nomor pertandingan {$matchCategory->name} berhasil dibuka.");
        }

        return back()->with('success', "Kunci nomor pertandingan {$matchCategory->name} berhasil dibuka.");
    }
}
