<?php

namespace App\Http\Controllers\Admin\Simulation;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\Simulation\TrainingModeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TrainingModeController extends Controller
{
    public function toggle(Request $request, TrainingModeService $service): RedirectResponse
    {
        $event = $this->resolveEvent($request);
        $newState = $service->toggleTrainingMode($event);

        $message = $newState
            ? 'Mode Simulasi & Gladi Bersih turnamen berhasil diaktifkan. Data pertandingan pada sesi ini tidak dihitung ke rekap resmi.'
            : 'Mode Simulasi dinonaktifkan. Sistem kembali ke mode kejuaraan resmi.';

        return back()->with('success', $message);
    }

    public function reset(Request $request, TrainingModeService $service): RedirectResponse
    {
        $event = $this->resolveEvent($request);
        $stats = $service->resetSimulationData($event);

        return back()->with('success', "Data simulasi berhasil dibersihkan ({$stats['matches_deleted']} partai, {$stats['drawings_deleted']} bagan, {$stats['scores_deleted']} penilaian dihapus). Event kembali bersih.");
    }

    public function seed(Request $request, TrainingModeService $service): RedirectResponse
    {
        $event = $this->resolveEvent($request);
        $result = $service->seedSimulationMatches($event);

        return back()->with('success', $result['message']);
    }

    private function resolveEvent(Request $request): Event
    {
        $eventId = $request->input('event_id');
        if ($eventId) {
            return Event::query()->findOrFail($eventId);
        }

        $tenantEvent = $request->attributes->get('tenantEvent');
        if ($tenantEvent instanceof Event) {
            return $tenantEvent;
        }

        return Event::query()->where('is_active', true)->firstOrFail();
    }
}
