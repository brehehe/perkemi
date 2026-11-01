<?php

namespace App\Console\Commands;

use App\Services\Admin\Event\EventDataSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ImportEventCommand extends Command
{
    protected $signature = 'perkemi:import-event
                            {file : Path ke file JSON paket data event}
                            {--force : Lewati pertanyaan konfirmasi}';

    protected $description = 'Impor seluruh data event dari file JSON paket (sinkronisasi offline ke online server)';

    public function handle(EventDataSyncService $syncService): int
    {
        $filePath = (string) $this->argument('file');

        if (! file_exists($filePath)) {
            $this->error("File tidak ditemukan: {$filePath}");

            return self::FAILURE;
        }

        $rawContent = file_get_contents($filePath);
        $package = json_decode((string) $rawContent, true);

        if (! is_array($package) || ($package['format'] ?? null) !== EventDataSyncService::ExportFormat) {
            $this->error('Format file tidak valid. Paket harus merupakan hasil ekspor Smart Perkemi Event Package.');

            return self::FAILURE;
        }

        $eventName = $package['event_name'] ?? 'Event';
        $this->info("Menyiapkan impor paket data: {$eventName}...");

        if (! $this->option('force') && ! $this->confirm("Apakah Anda yakin ingin mengimpor dan menyinkronkan seluruh data untuk '{$eventName}'?")) {
            $this->warn('Impor dibatalkan.');

            return self::SUCCESS;
        }

        $result = $syncService->importEvent($package);

        $this->info("✓ Sukses! Seluruh data event '{$result['event_name']}' berhasil diimpor & disinkronkan.");
        $this->table(
            ['Komponen Disinkronkan', 'Jumlah Record'],
            collect($result['imported_counts'])->map(fn ($count, $name) => [Str::headline($name), $count])->all()
        );

        return self::SUCCESS;
    }
}
