<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\TournamentDrawingDemoData;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use RuntimeException;

class SeedTournamentDrawingDemo extends Command
{
    protected $signature = 'event:seed-drawing-demo
                            {event : UUID event yang akan diisi data dummy}
                            {--delete : Hapus data dummy dan drawing yang dibuat command ini}
                            {--seed= : Seed angka agar jumlah peserta acak dapat dibuat ulang}';

    protected $description = 'Buat atau hapus data dummy kontingen, peserta, dan drawing untuk satu event';

    public function handle(TournamentDrawingDemoData $demoData): int
    {
        $event = Event::query()->find((string) $this->argument('event'));

        if (! $event) {
            $this->error('Event tidak ditemukan. Periksa kembali UUID event.');

            return self::FAILURE;
        }

        try {
            if ($this->option('delete')) {
                $result = $demoData->delete($event);

                $this->info("Data dummy drawing untuk '{$event->name}' berhasil dihapus.");
                $this->line("Kontingen: {$result['contingents']}, atlet: {$result['athletes']}, drawing: {$result['drawings']}.");

                return self::SUCCESS;
            }

            $result = $demoData->create($event, $this->randomSeed());
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Data dummy drawing untuk '{$event->name}' berhasil dibuat.");
        $this->line("Kontingen: {$result['contingents']}, atlet: {$result['athletes']}, drawing: {$result['drawings']}, partai/penampilan: {$result['matches']}.");
        $this->line("Seed acak: {$result['random_seed']}.");
        $this->line("Double elimination (4 atlet): {$result['double_elimination_category']}.");
        $this->line("Single elimination (>4 atlet): {$result['single_elimination_categories']} nomor randori.");
        $this->newLine();
        $this->table(
            ['Nomor Pertandingan', 'Jenis', 'Jumlah'],
            collect($result['category_participants'])
                ->map(fn (array $category): array => [
                    $category['name'],
                    Str::headline($category['type']),
                    "{$category['participant_count']} {$category['unit']}",
                ])
                ->all(),
        );

        return self::SUCCESS;
    }

    private function randomSeed(): ?int
    {
        $seed = $this->option('seed');

        if ($seed === null) {
            return null;
        }

        $validatedSeed = filter_var($seed, FILTER_VALIDATE_INT, [
            'options' => [
                'min_range' => 0,
                'max_range' => 2_147_483_647,
            ],
        ]);

        if ($validatedSeed === false) {
            throw new RuntimeException('Opsi --seed harus berupa bilangan bulat antara 0 dan 2147483647.');
        }

        return $validatedSeed;
    }
}
