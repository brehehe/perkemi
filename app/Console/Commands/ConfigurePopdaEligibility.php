<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\ParticipantEligibilityService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ConfigurePopdaEligibility extends Command
{
    protected $signature = 'event:configure-popda-eligibility {--apply : Simpan perubahan; tanpa opsi ini hanya pratinjau}';

    protected $description = 'Terapkan klarifikasi usia dan sekolah POPDA Jatim 2026 tanpa menjalankan seeder';

    public function handle(ParticipantEligibilityService $eligibility): int
    {
        $event = Event::query()->where('slug', 'popda-xv-jawa-timur-2026')->first();
        if (! $event) {
            $this->error('Event POPDA Jatim 2026 belum tersedia. Tidak ada data yang dibuat.');

            return self::FAILURE;
        }
        $rules = [
            'enabled' => true,
            'age_reference_date' => '2026-11-06',
            'academic_year_start' => 2026,
            'max_age_years' => 17,
            'birth_date_from' => '2009-01-01',
            'max_school_grade' => 11,
            'embu_min_age_months' => 156,
            'embu_min_school_grade' => 7,
            'randori_min_age_months' => 174,
            'require_school_verification' => true,
            'require_school_document' => false,
        ];
        $event->participant_rules = $rules;
        $summary = $eligibility->summary($event);
        $this->info($event->name);
        foreach ($summary as $line) {
            $this->line($line);
        }
        $this->line('Data atlet tetap disimpan. Registrasi yang sebelumnya terverifikasi perlu diperiksa ulang apabila aturan berubah.');
        if (! $this->option('apply')) {
            $this->comment('Pratinjau saja. Gunakan --apply untuk menerapkan.');

            return self::SUCCESS;
        }
        DB::transaction(function () use ($event, $summary): void {
            $event->save();
            $event->ageCategories()->where('name', 'Pelajar POPDA')->update([
                'min_age' => null,
                'max_age' => 17,
                'description' => implode(' ', $summary),
            ]);
        });
        $this->info('Persyaratan tersimpan. Seeder, kontingen, dan data atlet tidak dijalankan ulang.');

        return self::SUCCESS;
    }
}
