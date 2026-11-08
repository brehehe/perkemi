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
        $event = ($request->filled('event_id') || $request->has('event_id'))
            ? $eventContext->eventFor($request)
            : ($eventCourt->event ?? $eventContext->eventFor($request));

        abort_unless($eventCourt->event_id === $event->id, 404);
        $eventContext->ensureCanManage($request, $event);
        $courtAccess->ensureCourtIsAccessible($request, $event, $eventCourt);

        $validated = $request->validate([
            'var_url' => ['nullable', 'url', 'max:500'],
            'is_var_enabled' => ['nullable', 'boolean'],
        ]);

        $updateData = [];
        if ($request->has('var_url')) {
            $updateData['var_url'] = filled($validated['var_url'] ?? null) ? trim((string) $validated['var_url']) : null;
        }
        if ($request->has('is_var_enabled')) {
            $updateData['is_var_enabled'] = $request->boolean('is_var_enabled');
        }

        if (! empty($updateData)) {
            $eventCourt->update($updateData);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Pengaturan VAR untuk {$eventCourt->name} berhasil diperbarui.",
                'var_url' => $eventCourt->var_url,
                'raw_var_url' => $eventCourt->raw_var_url,
                'is_var_enabled' => (bool) $eventCourt->is_var_enabled,
            ]);
        }

        return back()->with('success', "Pengaturan VAR untuk {$eventCourt->name} berhasil diperbarui.");
    }
}
