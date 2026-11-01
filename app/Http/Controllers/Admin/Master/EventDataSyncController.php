<?php

namespace App\Http\Controllers\Admin\Master;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Services\Admin\Event\EventDataSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventDataSyncController extends Controller
{
    /**
     * Download the full portable event package as JSON.
     */
    public function export(Event $event, EventDataSyncService $syncService): StreamedResponse
    {
        $package = $syncService->exportEvent($event);
        $dateSuffix = now()->format('Y-m-d_His');
        $filename = "smart-perkemi-event-{$event->slug}-{$dateSuffix}.json";

        return response()->streamDownload(function () use ($package): void {
            echo json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }, $filename, [
            'Content-Type' => 'application/json; charset=UTF-8',
        ]);
    }

    /**
     * Import a portable event package JSON file and synchronize all event data.
     */
    public function import(Request $request, EventDataSyncService $syncService): RedirectResponse
    {
        $request->validate([
            'package_file' => ['required', 'file', 'max:51200'], // 50MB
        ], [
            'package_file.required' => 'Pilih file paket JSON data event yang akan diimpor.',
            'package_file.max' => 'Ukuran file paket data maksimal 50 MB.',
        ]);

        $file = $request->file('package_file');
        $content = file_get_contents($file->getRealPath());
        $package = json_decode((string) $content, true);

        if (! is_array($package) || ($package['format'] ?? null) !== EventDataSyncService::ExportFormat) {
            return back()->with('error', 'Format file tidak valid. Paket harus merupakan hasil ekspor Smart Perkemi Event Package (.json).');
        }

        try {
            $result = $syncService->importEvent($package);
            $counts = $result['imported_counts'];

            $summary = "{$result['event_name']} berhasil disinkronkan: {$counts['matches']} partai pertandingan, {$counts['athletes']} atlet, {$counts['contingents']} kontingen, {$counts['tournament_results']} hasil juara.";

            return back()->with('success', "Sukses! {$summary}");
        } catch (\Throwable $e) {
            return back()->with('error', "Gagal mengimpor paket data event: {$e->getMessage()}");
        }
    }
}
