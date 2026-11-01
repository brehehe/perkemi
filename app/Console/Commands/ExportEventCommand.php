<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\Admin\Event\EventDataSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ExportEventCommand extends Command
{
    protected $signature = 'perkemi:export-event
                            {event : ID atau slug event yang akan diekspor}
                            {--output= : Path file output JSON (default: storage/app/exports/...)}';

    protected $description = 'Ekspor seluruh data event (jadwal, pendaftaran, partai, skor wasit, rekap juara) ke file JSON paket';

    public function handle(EventDataSyncService $syncService): int
    {
        $eventIdentifier = (string) $this->argument('event');

        $event = Str::isUuid($eventIdentifier)
            ? Event::query()->find($eventIdentifier)
            : Event::query()->where('slug', $eventIdentifier)->first();

        if (! $event) {
            $this->error("Event '{$eventIdentifier}' tidak ditemukan.");

            return self::FAILURE;
        }

        $this->info("Mengekspor seluruh data event: {$event->name} (ID: {$event->id})...");

        $package = $syncService->exportEvent($event);

        $dateSuffix = now()->format('Y-m-d_His');
        $defaultFilename = "smart-perkemi-event-{$event->slug}-{$dateSuffix}.json";
        $outputPath = $this->option('output') ?: storage_path("app/exports/{$defaultFilename}");

        $dir = dirname($outputPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents(
            $outputPath,
            json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        $this->info("✓ Berhasil diekspor ke: {$outputPath}");
        $this->table(
            ['Komponen', 'Jumlah Data'],
            collect($package['counts'])->map(fn ($count, $name) => [Str::headline($name), $count])->all()
        );

        return self::SUCCESS;
    }
}
