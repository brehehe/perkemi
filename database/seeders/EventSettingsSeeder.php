<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use Illuminate\Database\Seeder;

class EventSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $events = Event::all();

        foreach ($events as $event) {
            // 1. Kelompok Umur dengan tarif masing-masing
            $pemula = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Pemula'],
                [
                    'min_age' => 7,
                    'max_age' => 10,
                    'fee' => 400000,
                    'description' => 'Kenshi usia dini (Kelahiran 2016-2019) Kyu VIII - Kyu V',
                    'order' => 1,
                    'is_active' => true,
                ]
            );

            $remajaA = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Remaja A'],
                [
                    'min_age' => 11,
                    'max_age' => 13,
                    'fee' => 500000,
                    'description' => 'Pra-remaja (Kelahiran 2013-2015) Kyu VI - Kyu III',
                    'order' => 2,
                    'is_active' => true,
                ]
            );

            $remajaB = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Remaja B'],
                [
                    'min_age' => 14,
                    'max_age' => 17,
                    'fee' => 500000,
                    'description' => 'Remaja madya (Kelahiran 2009-2012) Kyu IV - Dan I',
                    'order' => 3,
                    'is_active' => true,
                ]
            );

            $dewasa = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Dewasa'],
                [
                    'min_age' => 18,
                    'max_age' => 35,
                    'fee' => 600000,
                    'description' => 'Kategori Senior / Terbuka (Kelahiran 1991-2008)',
                    'order' => 4,
                    'is_active' => true,
                ]
            );

            // 2. Lapangan (Court / Tatami)
            EventCourt::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Court 1'],
                [
                    'location' => 'Tatami Utama - Area Tengah (Center Arena)',
                    'description' => 'Gelanggang utama partai final dan partai pilihan',
                    'order' => 1,
                    'is_active' => true,
                ]
            );

            EventCourt::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Court 2'],
                [
                    'location' => 'Tatami Sisi Barat (West Wing)',
                    'description' => 'Gelanggang penyisihan Embu Berpasangan & Beregu',
                    'order' => 2,
                    'is_active' => true,
                ]
            );

            EventCourt::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Court 3'],
                [
                    'location' => 'Tatami Sisi Timur (East Wing)',
                    'description' => 'Gelanggang penyisihan Randori Kelas Bebas',
                    'order' => 3,
                    'is_active' => true,
                ]
            );

            // 3. Nomer Pertandingan
            $matchCategoriesData = [
                [
                    'name' => 'Embu Berpasangan Pemula Putra Kyu 7-5',
                    'age_category_id' => $pemula->id,
                    'type' => 'embu',
                    'gender' => 'male',
                    'capacity' => 16,
                    'max_athletes_per_team' => 2,
                    'min_kyu' => 'Kyu 7',
                    'max_kyu' => 'Kyu 5',
                    'order' => 1,
                ],
                [
                    'name' => 'Embu Berpasangan Pemula Putri Kyu 7-5',
                    'age_category_id' => $pemula->id,
                    'type' => 'embu',
                    'gender' => 'female',
                    'capacity' => 16,
                    'max_athletes_per_team' => 2,
                    'min_kyu' => 'Kyu 7',
                    'max_kyu' => 'Kyu 5',
                    'order' => 2,
                ],
                [
                    'name' => 'Randori Putra Remaja A Kelas 50 kg',
                    'age_category_id' => $remajaA->id,
                    'type' => 'randori',
                    'gender' => 'male',
                    'capacity' => 32,
                    'min_weight' => 45.00,
                    'max_weight' => 50.00,
                    'order' => 3,
                ],
                [
                    'name' => 'Randori Putri Remaja A Kelas 45 kg',
                    'age_category_id' => $remajaA->id,
                    'type' => 'randori',
                    'gender' => 'female',
                    'capacity' => 32,
                    'min_weight' => 40.00,
                    'max_weight' => 45.00,
                    'order' => 4,
                ],
                [
                    'name' => 'Embu Campuran Remaja B Kyu 2 - Dan 1',
                    'age_category_id' => $remajaB->id,
                    'type' => 'embu',
                    'gender' => 'mixed',
                    'capacity' => 16,
                    'max_athletes_per_team' => 2,
                    'min_kyu' => 'Kyu 2',
                    'max_kyu' => 'Dan 1',
                    'order' => 5,
                ],
                [
                    'name' => 'Embu Beregu putra/putri/campuran eksebisi Remaja A Campuran',
                    'age_category_id' => $remajaA->id,
                    'type' => 'embu',
                    'gender' => 'mixed',
                    'capacity' => 16,
                    'max_athletes_per_team' => 4,
                    'order' => 7,
                ],
                [
                    'name' => 'Randori Putra Dewasa Kelas 65 kg',
                    'age_category_id' => $dewasa->id,
                    'type' => 'randori',
                    'gender' => 'male',
                    'capacity' => 32,
                    'min_weight' => 60.00,
                    'max_weight' => 65.00,
                    'order' => 6,
                ],
            ];

            foreach ($matchCategoriesData as $mcData) {
                EventMatchCategory::firstOrCreate(
                    [
                        'event_id' => $event->id,
                        'name' => $mcData['name'],
                    ],
                    [
                        'age_category_id' => $mcData['age_category_id'],
                        'type' => $mcData['type'],
                        'gender' => $mcData['gender'],
                        'capacity' => $mcData['capacity'],
                        'max_athletes_per_team' => $mcData['max_athletes_per_team'] ?? 1,
                        'min_weight' => $mcData['min_weight'] ?? null,
                        'max_weight' => $mcData['max_weight'] ?? null,
                        'min_kyu' => $mcData['min_kyu'] ?? null,
                        'max_kyu' => $mcData['max_kyu'] ?? null,
                        'order' => $mcData['order'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
