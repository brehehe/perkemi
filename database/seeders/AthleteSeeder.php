<?php

namespace Database\Seeders;

use App\Models\Athlete;
use App\Models\Contingent;
use Illuminate\Database\Seeder;

class AthleteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contingents = Contingent::query()->where('name', 'not like', 'Demo Dojo %')->get();

        if ($contingents->isEmpty()) {
            return;
        }

        $sampleNames = [
            // Putra
            ['name' => 'Dimas Aditya Pratama', 'gender' => 'L', 'kyu' => 'Kyu 1', 'weight' => 64.5, 'height' => 172],
            ['name' => 'Rizky Firmansyah', 'gender' => 'L', 'kyu' => 'Kyu 2', 'weight' => 59.0, 'height' => 168],
            ['name' => 'Fajar Nugraha', 'gender' => 'L', 'kyu' => 'Dan I', 'weight' => 69.2, 'height' => 175],
            ['name' => 'Bagus Setiawan', 'gender' => 'L', 'kyu' => 'Kyu 3', 'weight' => 54.0, 'height' => 165],
            ['name' => 'Arif Wicaksono', 'gender' => 'L', 'kyu' => 'Kyu 1', 'weight' => 74.0, 'height' => 178],
            ['name' => 'Bayu Kusuma', 'gender' => 'L', 'kyu' => 'Dan II', 'weight' => 67.5, 'height' => 173],
            ['name' => 'Danu Saputra', 'gender' => 'L', 'kyu' => 'Kyu 4', 'weight' => 51.5, 'height' => 163],
            ['name' => 'Ilham Ramadhan', 'gender' => 'L', 'kyu' => 'Kyu 2', 'weight' => 62.0, 'height' => 170],
            // Putri
            ['name' => 'Nabila Putri Cahyani', 'gender' => 'P', 'kyu' => 'Kyu 1', 'weight' => 49.5, 'height' => 160],
            ['name' => 'Siti Aisyah Rahmawati', 'gender' => 'P', 'kyu' => 'Dan I', 'weight' => 54.0, 'height' => 164],
            ['name' => 'Dian Permatasari', 'gender' => 'P', 'kyu' => 'Kyu 2', 'weight' => 57.5, 'height' => 166],
            ['name' => 'Maya Anggraeni', 'gender' => 'P', 'kyu' => 'Kyu 3', 'weight' => 46.0, 'height' => 158],
            ['name' => 'Rina Kartika', 'gender' => 'P', 'kyu' => 'Kyu 1', 'weight' => 52.0, 'height' => 162],
            ['name' => 'Tari Wulandari', 'gender' => 'P', 'kyu' => 'Kyu 4', 'weight' => 48.0, 'height' => 159],
        ];

        foreach ($contingents as $contingent) {
            // Seed 8-12 athletes per contingent
            $count = rand(8, 12);
            for ($i = 0; $i < $count; $i++) {
                $base = $sampleNames[$i % count($sampleNames)];
                $suffix = $i >= count($sampleNames) ? ' '.($i + 1) : '';

                Athlete::firstOrCreate(
                    [
                        'contingent_id' => $contingent->id,
                        'name' => $base['name'].$suffix,
                    ],
                    [
                        'gender' => $base['gender'],
                        'kyu_dan' => $base['kyu'],
                        'weight' => $base['weight'] + (rand(-30, 30) / 10),
                        'height' => $base['height'] + rand(-3, 3),
                        'birth_date' => now()->subYears(rand(15, 26))->subDays(rand(1, 350)),
                        'created_at' => now()->subMonths(rand(0, 5))->subDays(rand(1, 28)),
                    ]
                );
            }
        }
    }
}
