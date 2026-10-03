<?php

namespace Database\Seeders;

use App\Models\Contingent;
use App\Models\Registration;
use Illuminate\Database\Seeder;

class RegistrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contingents = Contingent::with('athletes')->get();

        if ($contingents->isEmpty()) {
            return;
        }

        $statuses = ['verified', 'verified', 'verified', 'pending', 'rejected', 'verified'];

        foreach ($contingents as $idx => $contingent) {
            if (! $contingent->event_id) {
                continue;
            }

            if (Registration::query()
                ->where('contingent_id', $contingent->id)
                ->where('event_id', $contingent->event_id)
                ->exists()) {
                continue;
            }

            $athleteCount = $contingent->athletes->count() ?: 8;
            $feePerAthlete = 150000;
            $totalFee = $athleteCount * $feePerAthlete;
            $status = $statuses[$idx % count($statuses)];

            $regNum = 'REG-2026-'.str_pad($idx + 1, 4, '0', STR_PAD_LEFT);

            Registration::firstOrCreate(
                ['registration_number' => $regNum],
                [
                    'contingent_id' => $contingent->id,
                    'event_id' => $contingent->event_id,
                    'status' => $status,
                    'total_amount' => $totalFee,
                    'final_amount' => $totalFee,
                    'notes' => 'Pendaftaran resmi kontingen '.$contingent->name,
                    'created_at' => now()->subDays(20 - $idx),
                ]
            );
        }
    }
}
