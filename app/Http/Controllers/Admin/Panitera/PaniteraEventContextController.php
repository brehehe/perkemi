<?php

namespace App\Http\Controllers\Admin\Panitera;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaniteraEventContextController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'event_id' => ['required', 'uuid', 'exists:events,id'],
            'destination' => ['required', Rule::in(['dashboard', 'embu', 'randori'])],
        ]);
        $event = Event::query()->findOrFail($validated['event_id']);
        $user = $request->user();

        abort_unless($user && (
            $user->hasAnyRole(['Super Admin', 'Admin'])
            || $event->users()->whereKey($user->id)->exists()
        ), 404);

        $request->session()->put('tenant_event_id', $event->id);
        $request->session()->put('tenant_event_slug', $event->slug);

        $routeName = match ($validated['destination']) {
            'embu' => 'admin.panitera.embu-result.index',
            'randori' => 'admin.panitera.randori-result.index',
            default => 'admin.panitera.scoring.index',
        };

        return redirect()->route($routeName, ['event_id' => $event->id])
            ->with('success', "Berhasil beralih ke event: {$event->name}");
    }
}
