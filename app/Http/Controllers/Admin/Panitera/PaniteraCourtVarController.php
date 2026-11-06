<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\EventCourt;
use App\Services\Panitera\EventContext;
use App\Services\Panitera\PaniteraCourtAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaniteraCourtVarController extends Controller
{
    public function update(
        Request $request,
        EventCourt $eventCourt,
        EventContext $eventContext,
        PaniteraCourtAccess $courtAccess,
    ): JsonResponse|RedirectResponse {
        $event = $eventContext->eventFor($request);
        abort_unless($eventCourt->event_id === $event->id, 404);
        $courtAccess->ensureCourtIsAccessible($request, $event, $eventCourt);

        $validated = $request->validate([
            'var_url' => ['nullable', 'url', 'max:500'],
        ]);

        $eventCourt->update([
            'var_url' => filled($validated['var_url'] ?? null) ? trim((string) $validated['var_url']) : null,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Link VAR untuk {$eventCourt->name} berhasil diperbarui.",
                'var_url' => $eventCourt->var_url,
                'raw_var_url' => $eventCourt->raw_var_url,
            ]);
        }

        return back()->with('success', "Link VAR untuk {$eventCourt->name} berhasil diperbarui.");
    }
}
