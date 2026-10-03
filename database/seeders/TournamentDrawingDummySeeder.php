<?php

namespace Database\Seeders;

use App\Enums\ContingentStatus;
use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Official;
use App\Models\PaymentMethod;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\Technique;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\TournamentDrawingGenerator;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TournamentDrawingDummySeeder extends Seeder
{
    private const MALE_FIRST_NAMES = [
        'Arya', 'Bagas', 'Bayu', 'Bima', 'Candra', 'Daffa', 'Danu', 'Dimas', 'Doni',
        'Fajar', 'Farhan', 'Galang', 'Gilang', 'Hafiz', 'Ilham', 'Indra', 'Kevin',
        'Krisna', 'Mahendra', 'Naufal', 'Pandu', 'Raditya', 'Raka', 'Rangga', 'Rayhan',
        'Rendy', 'Reza', 'Rizky', 'Satria', 'Surya', 'Tegar', 'Wahyu', 'Wildan', 'Yoga', 'Yudha',
    ];

    private const FEMALE_FIRST_NAMES = [
        'Adinda', 'Anisa', 'Annisa', 'Arini', 'Ayu', 'Bella', 'Cantika', 'Citra', 'Dinda',
        'Farah', 'Febriana', 'Gita', 'Indah', 'Intan', 'Kartika', 'Kayla', 'Laras',
        'Maya', 'Melani', 'Mutia', 'Nabila', 'Nadia', 'Natasha', 'Putri', 'Rahma',
        'Ratna', 'Rini', 'Sabrina', 'Safira', 'Salsa', 'Shinta', 'Tiara', 'Winda', 'Zahra',
    ];

    private const LAST_NAMES = [
        'Pratama', 'Saputra', 'Kusuma', 'Wijaya', 'Hidayat', 'Permana', 'Santoso',
        'Wibowo', 'Setiawan', 'Nugroho', 'Utomo', 'Prasetyo', 'Firmansyah', 'Wardhana',
        'Ramadhan', 'Pangestu', 'Gunawan', 'Mahendra', 'Purnomo', 'Ardiansyah',
        'Wicaksono', 'Subagyo', 'Hartono', 'Sudrajat', 'Suhendra',
    ];

    public function run(): void
    {
        $event = Event::query()->where('is_active', true)->first()
            ?? Event::query()->orderByDesc('created_at')->first();

        if (! $event) {
            $this->command?->error('Tidak ada event yang ditemukan.');

            return;
        }

        $this->command?->info("Membuat dummy data drawing untuk event: {$event->name}");

        DB::transaction(function () use ($event): void {
            // 1. Pastikan setting event mendukung drawing penuh
            $event->update([
                'minimum_entries_per_category' => 3,
                'minimum_contingents_per_category' => 3,
                'match_duration_minutes' => 10,
                'minimum_rest_minutes' => 15,
                'allow_cross_age_group_embu' => true,
            ]);

            // 2. Setup Tatami / Lapangan (3 Court)
            $courtsData = [
                ['name' => 'Court 1 (Tatami Utama)', 'location' => 'Area Tengah (Center Arena)', 'order' => 1],
                ['name' => 'Court 2 (Tatami Barat)', 'location' => 'Sayap Barat (West Wing)', 'order' => 2],
                ['name' => 'Court 3 (Tatami Timur)', 'location' => 'Sayap Timur (East Wing)', 'order' => 3],
            ];
            foreach ($courtsData as $c) {
                EventCourt::updateOrCreate(
                    ['event_id' => $event->id, 'name' => $c['name']],
                    ['location' => $c['location'], 'order' => $c['order'], 'is_active' => true]
                );
            }

            // 3. Setup Rundown & Sesi Pertandingan yang luas untuk jadwal otomatis
            $baseDate = Carbon::parse($event->start_date ?? '2026-12-04');
            $rundownsData = [
                ['name' => 'Hari 1 - Sesi Pagi (Penyisihan)', 'day' => 0, 'start' => '08:00', 'end' => '12:00', 'order' => 1],
                ['name' => 'Hari 1 - Sesi Siang (Penyisihan)', 'day' => 0, 'start' => '13:00', 'end' => '18:00', 'order' => 2],
                ['name' => 'Hari 2 - Sesi Pagi (Perempat Final & Pool)', 'day' => 1, 'start' => '08:00', 'end' => '12:00', 'order' => 3],
                ['name' => 'Hari 2 - Sesi Siang (Semi Final)', 'day' => 1, 'start' => '13:00', 'end' => '18:00', 'order' => 4],
                ['name' => 'Hari 3 - Sesi Pagi (Perebutan Juara 3)', 'day' => 2, 'start' => '08:00', 'end' => '12:00', 'order' => 5],
                ['name' => 'Hari 3 - Sesi Siang (Grand Final)', 'day' => 2, 'start' => '13:00', 'end' => '18:00', 'order' => 6],
            ];
            foreach ($rundownsData as $rd) {
                $sessionDate = $baseDate->copy()->addDays($rd['day']);
                Rundown::updateOrCreate(
                    ['event_id' => $event->id, 'name' => $rd['name']],
                    [
                        'date' => $sessionDate->copy()->setTimeFromTimeString($rd['start']),
                        'end_time' => $sessionDate->copy()->setTimeFromTimeString($rd['end']),
                        'type' => 'Pertandingan',
                        'order' => $rd['order'],
                        'is_match_session' => true,
                    ]
                );
            }

            // 4. Setup Payment Method & Role
            Role::findOrCreate('kontingen', 'web');
            $paymentMethod = PaymentMethod::firstOrCreate(['code' => 'demo-transfer-bank'], [
                'name' => 'Transfer Bank Resmi PERKEMI',
                'type' => 'bank_transfer',
                'provider' => 'Bank Mandiri',
                'account_name' => 'PENGPROV PERKEMI JATIM',
                'account_number' => '1410012345678',
                'instructions' => 'Pembayaran lunas via transfer rekening panitia.',
                'order' => 1,
                'is_active' => true,
            ]);
            $event->paymentMethods()->syncWithoutDetaching([$paymentMethod->id]);

            // 5. Kelompok Umur (Age Categories)
            $pemula = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Pemula'],
                ['min_age' => 7, 'max_age' => 10, 'fee' => 300000, 'order' => 1, 'is_active' => true]
            );
            $remajaA = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Remaja A'],
                ['min_age' => 11, 'max_age' => 13, 'fee' => 350000, 'order' => 2, 'is_active' => true]
            );
            $remajaB = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Remaja B'],
                ['min_age' => 14, 'max_age' => 17, 'fee' => 350000, 'order' => 3, 'is_active' => true]
            );
            $dewasa = EventAgeCategory::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'Dewasa'],
                ['min_age' => 18, 'max_age' => 35, 'fee' => 400000, 'order' => 4, 'is_active' => true]
            );

            // 6. Nomor Pertandingan Lengkap (Banyak Nomor Pertandingan: 24 Nomor)
            $matchCategoriesSpecs = [
                // Pemula
                ['name' => 'Embu Berpasangan Pemula Putra Kyu 7-5', 'age_id' => $pemula->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 7', 'max_kyu' => 'Kyu 5', 'order' => 1],
                ['name' => 'Embu Berpasangan Pemula Putri Kyu 7-5', 'age_id' => $pemula->id, 'type' => 'embu', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 7', 'max_kyu' => 'Kyu 5', 'order' => 2],
                ['name' => 'Embu Beregu Pemula Campuran', 'age_id' => $pemula->id, 'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes' => 4, 'min_kyu' => 'Kyu 7', 'max_kyu' => 'Kyu 5', 'order' => 3],

                // Remaja A
                ['name' => 'Embu Berpasangan Remaja A Putra Kyu 6-4', 'age_id' => $remajaA->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 6', 'max_kyu' => 'Kyu 4', 'order' => 4],
                ['name' => 'Embu Berpasangan Remaja A Putri Kyu 6-4', 'age_id' => $remajaA->id, 'type' => 'embu', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 6', 'max_kyu' => 'Kyu 4', 'order' => 5],
                ['name' => 'Embu Beregu Remaja A Campuran', 'age_id' => $remajaA->id, 'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes' => 4, 'min_kyu' => 'Kyu 6', 'max_kyu' => 'Kyu 4', 'order' => 6],
                ['name' => 'Randori Putra Remaja A Kelas 45 kg', 'age_id' => $remajaA->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 40.0, 'max_w' => 45.0, 'order' => 7],
                ['name' => 'Randori Putra Remaja A Kelas 50 kg', 'age_id' => $remajaA->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 45.0, 'max_w' => 50.0, 'order' => 8],
                ['name' => 'Randori Putri Remaja A Kelas 40 kg', 'age_id' => $remajaA->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 35.0, 'max_w' => 40.0, 'order' => 9],
                ['name' => 'Randori Putri Remaja A Kelas 45 kg', 'age_id' => $remajaA->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 40.0, 'max_w' => 45.0, 'order' => 10],

                // Remaja B
                ['name' => 'Embu Berpasangan Remaja B Putra Kyu 3-1', 'age_id' => $remajaB->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 1', 'order' => 11],
                ['name' => 'Embu Berpasangan Remaja B Putri Kyu 3-1', 'age_id' => $remajaB->id, 'type' => 'embu', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 1', 'order' => 12],
                ['name' => 'Embu Berpasangan Remaja B Campuran Kyu 2-Dan 1', 'age_id' => $remajaB->id, 'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 2', 'max_kyu' => 'Dan 1', 'order' => 13],
                ['name' => 'Embu Beregu Remaja B Campuran', 'age_id' => $remajaB->id, 'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes' => 4, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Dan 1', 'order' => 14],
                ['name' => 'Randori Putra Remaja B Kelas 50 kg', 'age_id' => $remajaB->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 45.0, 'max_w' => 50.0, 'order' => 15],
                ['name' => 'Randori Putra Remaja B Kelas 55 kg', 'age_id' => $remajaB->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 50.0, 'max_w' => 55.0, 'order' => 16],
                ['name' => 'Randori Putra Remaja B Kelas 60 kg', 'age_id' => $remajaB->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 55.0, 'max_w' => 60.0, 'order' => 17],
                ['name' => 'Randori Putri Remaja B Kelas 48 kg', 'age_id' => $remajaB->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 44.0, 'max_w' => 48.0, 'order' => 18],
                ['name' => 'Randori Putri Remaja B Kelas 52 kg', 'age_id' => $remajaB->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 48.0, 'max_w' => 52.0, 'order' => 19],

                // Dewasa
                ['name' => 'Embu Berpasangan Dewasa Putra Dan 1-Dan 2', 'age_id' => $dewasa->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Dan 1', 'max_kyu' => 'Dan 2', 'order' => 20],
                ['name' => 'Embu Berpasangan Dewasa Putri Dan 1-Dan 2', 'age_id' => $dewasa->id, 'type' => 'embu', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Dan 1', 'max_kyu' => 'Dan 2', 'order' => 21],
                ['name' => 'Embu Berpasangan Dewasa Campuran Yudansha', 'age_id' => $dewasa->id, 'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Dan 1', 'max_kyu' => 'Dan 3', 'order' => 22],
                ['name' => 'Embu Beregu Dewasa Putra', 'age_id' => $dewasa->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 4, 'min_kyu' => 'Dan 1', 'max_kyu' => 'Dan 3', 'order' => 23],
                ['name' => 'Randori Putra Dewasa Kelas 60 kg', 'age_id' => $dewasa->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 55.0, 'max_w' => 60.0, 'order' => 24],
                ['name' => 'Randori Putra Dewasa Kelas 65 kg', 'age_id' => $dewasa->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 60.0, 'max_w' => 65.0, 'order' => 25],
                ['name' => 'Randori Putra Dewasa Kelas 70 kg', 'age_id' => $dewasa->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 65.0, 'max_w' => 70.0, 'order' => 26],
                ['name' => 'Randori Putri Dewasa Kelas 55 kg', 'age_id' => $dewasa->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 50.0, 'max_w' => 55.0, 'order' => 27],
                ['name' => 'Randori Putri Dewasa Kelas 60 kg', 'age_id' => $dewasa->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 55.0, 'max_w' => 60.0, 'order' => 28],
            ];

            $createdCategories = [];
            foreach ($matchCategoriesSpecs as $spec) {
                $createdCategories[] = EventMatchCategory::updateOrCreate(
                    ['event_id' => $event->id, 'name' => $spec['name']],
                    [
                        'age_category_id' => $spec['age_id'],
                        'type' => $spec['type'],
                        'gender' => $spec['gender'],
                        'capacity' => $spec['capacity'],
                        'max_athletes_per_team' => $spec['max_athletes'],
                        'min_weight' => $spec['min_w'] ?? null,
                        'max_weight' => $spec['max_w'] ?? null,
                        'min_kyu' => $spec['min_kyu'] ?? null,
                        'max_kyu' => $spec['max_kyu'] ?? null,
                        'order' => $spec['order'],
                        'is_active' => true,
                        'merged_into_id' => null,
                        'is_combined' => false,
                    ]
                );
            }

            // Nonaktifkan nomor pertandingan lama yang tidak ada dalam daftar spesifikasi
            $activeCategoryIds = collect($createdCategories)->pluck('id');
            EventMatchCategory::query()
                ->where('event_id', $event->id)
                ->whereNotIn('id', $activeCategoryIds)
                ->update(['is_active' => false]);

            // 7. Kontingen Lengkap se-Jawa Timur (12 Kontingen Resmi)
            $contingentsList = [
                ['name' => 'Pengkot PERKEMI Surabaya', 'short' => 'Surabaya', 'city' => 'Kota Surabaya', 'manager' => 'Sensei Hartono, IV Dan'],
                ['name' => 'Pengkab PERKEMI Malang', 'short' => 'Kab. Malang', 'city' => 'Kabupaten Malang', 'manager' => 'Sensei Bambang Setiawan, III Dan'],
                ['name' => 'Pengkot PERKEMI Malang', 'short' => 'Kota Malang', 'city' => 'Kota Malang', 'manager' => 'Sensei Dwi Cahyono, III Dan'],
                ['name' => 'Pengkab PERKEMI Sidoarjo', 'short' => 'Sidoarjo', 'city' => 'Kabupaten Sidoarjo', 'manager' => 'Sensei Agus Wicaksono, III Dan'],
                ['name' => 'Pengkab PERKEMI Gresik', 'short' => 'Gresik', 'city' => 'Kabupaten Gresik', 'manager' => 'Sensei Eko Prasetyo, II Dan'],
                ['name' => 'Pengkot PERKEMI Kediri', 'short' => 'Kediri', 'city' => 'Kota Kediri', 'manager' => 'Sensei Hendra Gunawan, III Dan'],
                ['name' => 'Pengkab PERKEMI Pasuruan', 'short' => 'Pasuruan', 'city' => 'Kabupaten Pasuruan', 'manager' => 'Sensei Slamet Riyadi, II Dan'],
                ['name' => 'Pengkab PERKEMI Banyuwangi', 'short' => 'Banyuwangi', 'city' => 'Kabupaten Banyuwangi', 'manager' => 'Sensei Joko Susilo, III Dan'],
                ['name' => 'Pengkab PERKEMI Jember', 'short' => 'Jember', 'city' => 'Kabupaten Jember', 'manager' => 'Sensei Rudy Hermawan, II Dan'],
                ['name' => 'Pengkot PERKEMI Blitar', 'short' => 'Blitar', 'city' => 'Kota Blitar', 'manager' => 'Sensei Arif Wibowo, II Dan'],
                ['name' => 'Pengkot PERKEMI Madiun', 'short' => 'Madiun', 'city' => 'Kota Madiun', 'manager' => 'Sensei Tri Sutrisno, III Dan'],
                ['name' => 'Pengkab PERKEMI Mojokerto', 'short' => 'Mojokerto', 'city' => 'Kabupaten Mojokerto', 'manager' => 'Sensei Doni Firmansyah, II Dan'],
            ];

            // Bersihkan entri drawing & match lama pada event ini agar fresh
            TournamentMatch::where('event_id', $event->id)->delete();
            TournamentDrawing::where('event_id', $event->id)->delete();
            AthleteMatchCategoryEntry::where('event_id', $event->id)->delete();

            $contingentModels = [];
            $allContingentAthletes = []; // contingent_id => [ 'male' => [ age_group => [athletes] ], 'female' => [...] ]

            $techniques = Technique::all();
            if ($techniques->isEmpty()) {
                $techniques = collect([
                    Technique::firstOrCreate(['name' => 'Tenchiken Daisan'], ['category' => 'Embu', 'order' => 1, 'is_active' => true]),
                    Technique::firstOrCreate(['name' => 'Sode Dori'], ['category' => 'Embu', 'order' => 2, 'is_active' => true]),
                    Technique::firstOrCreate(['name' => 'Harai Uke Geri Ren Han Ko'], ['category' => 'Embu', 'order' => 3, 'is_active' => true]),
                    Technique::firstOrCreate(['name' => 'Tsubame Gaeshi'], ['category' => 'Embu', 'order' => 4, 'is_active' => true]),
                ]);
            }

            foreach ($contingentsList as $idx => $cData) {
                $contingentNum = $idx + 1;
                $email = "kontingen.{$idx}@smart-perkemi.id";
                $user = User::firstOrCreate(['email' => $email], [
                    'name' => $cData['manager'],
                    'password' => Hash::make('password'),
                ]);
                if (! $user->hasRole('kontingen')) {
                    $user->assignRole('kontingen');
                }

                $contingent = Contingent::updateOrCreate([
                    'event_id' => $event->id,
                    'name' => $cData['name'],
                ], [
                    'user_id' => $user->id,
                    'city' => $cData['city'],
                    'manager_name' => $cData['manager'],
                    'phone' => sprintf('081234567%03d', $contingentNum),
                    'email' => $email,
                    'address' => "Pusat Latihan PERKEMI {$cData['city']}, Jl. Olahraga No. {$contingentNum}",
                    'status' => ContingentStatus::Verified,
                ]);

                // Officials
                Official::firstOrCreate([
                    'contingent_id' => $contingent->id,
                    'name' => "Pelatih {$cData['short']}",
                ], [
                    'role' => 'Pelatih',
                    'gender' => 'male',
                    'phone' => sprintf('081399887%03d', $contingentNum),
                    'email' => "pelatih.{$contingentNum}@smart-perkemi.id",
                ]);
                Official::firstOrCreate([
                    'contingent_id' => $contingent->id,
                    'name' => "Official {$cData['short']}",
                ], [
                    'role' => 'Pendamping',
                    'gender' => 'female',
                    'phone' => sprintf('081399886%03d', $contingentNum),
                    'email' => "official.{$contingentNum}@smart-perkemi.id",
                ]);

                // Registration terverifikasi penuh
                $prefix = strtoupper(substr(sha1($event->id), 0, 6));
                $regNumber = sprintf('REG-%s-%04d', $prefix, $contingentNum);

                $registration = Registration::query()
                    ->where('event_id', $event->id)
                    ->where('contingent_id', $contingent->id)
                    ->first();

                $regData = [
                    'registration_number' => $registration?->registration_number ?? $regNumber,
                    'status' => RegistrationStatus::Verified,
                    'total_amount' => 5000000.00,
                    'final_amount' => 5000000.00 + $contingentNum,
                    'verification_code' => 100 + $contingentNum,
                    'payment_method_id' => $paymentMethod->id,
                    'payment_status' => PaymentStatus::Verified,
                    'payment_amount' => 5000000.00 + $contingentNum,
                    'payment_submitted_at' => now()->subDays(10),
                    'payment_verified_at' => now()->subDays(9),
                    'payment_note' => 'Pembayaran lunas via transfer resmi.',
                ];

                if ($registration) {
                    $registration->update($regData);
                } else {
                    Registration::create([
                        'event_id' => $event->id,
                        'contingent_id' => $contingent->id,
                        ...$regData,
                    ]);
                }

                $contingentModels[] = $contingent;

                // 8. Buat Atlet Lengkap per Kontingen (Total ~32 atlet per kontingen)
                // Usia & Kelompok Umur
                $athleteGroups = [
                    'pemula' => ['age_cat' => $pemula, 'count_m' => 4, 'count_f' => 4, 'birth_year' => 2016, 'kyu' => 'Kyu 6', 'w_min' => 28, 'w_max' => 38],
                    'remajaA' => ['age_cat' => $remajaA, 'count_m' => 6, 'count_f' => 6, 'birth_year' => 2013, 'kyu' => 'Kyu 5', 'w_min' => 38, 'w_max' => 48],
                    'remajaB' => ['age_cat' => $remajaB, 'count_m' => 6, 'count_f' => 6, 'birth_year' => 2010, 'kyu' => 'Kyu 2', 'w_min' => 48, 'w_max' => 58],
                    'dewasa' => ['age_cat' => $dewasa, 'count_m' => 6, 'count_f' => 6, 'birth_year' => 2002, 'kyu' => 'Dan 1', 'w_min' => 58, 'w_max' => 68],
                ];

                $allContingentAthletes[$contingent->id] = [];

                foreach ($athleteGroups as $groupKey => $group) {
                    $allContingentAthletes[$contingent->id][$groupKey] = ['male' => [], 'female' => []];

                    // Male
                    for ($m = 0; $m < $group['count_m']; $m++) {
                        $firstName = self::MALE_FIRST_NAMES[($idx * 5 + $m) % count(self::MALE_FIRST_NAMES)];
                        $lastName = self::LAST_NAMES[($contingentNum * 3 + $m) % count(self::LAST_NAMES)];
                        $fullName = "{$firstName} {$lastName} ({$cData['short']})";
                        $nik = sprintf('35%02d%02d%06d%04d', $contingentNum, 11, $group['birth_year'] % 100, $m + 1);
                        $kenshi = sprintf('KJ-%02d-%05d', $contingentNum, ($idx * 50) + $m + 1);

                        $athlete = Athlete::updateOrCreate([
                            'contingent_id' => $contingent->id,
                            'name' => $fullName,
                        ], [
                            'event_age_category_id' => $group['age_cat']->id,
                            'gender' => 'male',
                            'birth_date' => Carbon::createFromDate($group['birth_year'], 5, 10 + $m),
                            'kyu_dan' => $group['kyu'],
                            'weight' => $group['w_min'] + ($m * 2),
                            'height' => 140 + ($m * 3),
                            'nik' => $nik,
                            'kenshi_number' => $kenshi,
                            'dojo_name' => "Dojo {$cData['short']}",
                            'bpjs_status' => 'active',
                            'bpjs_number' => '000'.rand(10000000, 99999999),
                        ]);
                        $allContingentAthletes[$contingent->id][$groupKey]['male'][] = $athlete;
                    }

                    // Female
                    for ($f = 0; $f < $group['count_f']; $f++) {
                        $firstName = self::FEMALE_FIRST_NAMES[($idx * 5 + $f) % count(self::FEMALE_FIRST_NAMES)];
                        $lastName = self::LAST_NAMES[($contingentNum * 4 + $f) % count(self::LAST_NAMES)];
                        $fullName = "{$firstName} {$lastName} ({$cData['short']})";
                        $nik = sprintf('35%02d%02d%06d%04d', $contingentNum, 51, $group['birth_year'] % 100, $f + 1);
                        $kenshi = sprintf('KJ-%02d-%05d', $contingentNum, ($idx * 50) + 25 + $f);

                        $athlete = Athlete::updateOrCreate([
                            'contingent_id' => $contingent->id,
                            'name' => $fullName,
                        ], [
                            'event_age_category_id' => $group['age_cat']->id,
                            'gender' => 'female',
                            'birth_date' => Carbon::createFromDate($group['birth_year'], 8, 12 + $f),
                            'kyu_dan' => $group['kyu'],
                            'weight' => max(30, $group['w_min'] + ($f * 1.5) - 3),
                            'height' => 135 + ($f * 3),
                            'nik' => $nik,
                            'kenshi_number' => $kenshi,
                            'dojo_name' => "Dojo {$cData['short']}",
                            'bpjs_status' => 'active',
                            'bpjs_number' => '000'.rand(10000000, 99999999),
                        ]);
                        $allContingentAthletes[$contingent->id][$groupKey]['female'][] = $athlete;
                    }
                }
            }

            // 9. Daftarkan Atlet ke Setiap Nomor Pertandingan (Full entries!)
            $this->command?->info('Mendaftarkan atlet ke setiap nomor pertandingan...');

            foreach ($createdCategories as $category) {
                // Tentukan grup usia berdasarkan age_category_id
                $groupKey = match ($category->age_category_id) {
                    $pemula->id => 'pemula',
                    $remajaA->id => 'remajaA',
                    $remajaB->id => 'remajaB',
                    $dewasa->id => 'dewasa',
                    default => 'remajaB',
                };

                if ($category->type === 'randori') {
                    // Isi 8 sampai 16 atlet dari berbagai kontingen berbeda!
                    // Misal 8 atlet (Quarterfinal penuh 4 match) atau 16 atlet (Round of 16 penuh 8 match)
                    $targetContestants = in_array($category->gender, ['female'], true) ? 8 : 12; // 8 atau 12 atlet
                    $genderKey = $category->gender === 'female' ? 'female' : 'male';
                    $weightMid = ($category->min_weight && $category->max_weight)
                        ? round(($category->min_weight + $category->max_weight) / 2, 1)
                        : 55.0;

                    $enteredCount = 0;
                    foreach ($contingentModels as $cIdx => $contingent) {
                        if ($enteredCount >= $targetContestants) {
                            break;
                        }

                        $pool = $allContingentAthletes[$contingent->id][$groupKey][$genderKey] ?? [];
                        if (empty($pool)) {
                            continue;
                        }

                        // Ambil 1 atlet dari kontingen ini untuk kategori ini
                        $athlete = $pool[$cIdx % count($pool)];
                        $athlete->update(['weight' => $weightMid]);

                        AthleteMatchCategoryEntry::create([
                            'event_id' => $event->id,
                            'athlete_id' => $athlete->id,
                            'event_match_category_id' => $category->id,
                            'team_number' => 1,
                        ]);
                        $enteredCount++;
                    }
                } elseif ($category->type === 'embu') {
                    $maxAthletesPerTeam = (int) ($category->max_athletes_per_team ?? 2);
                    // Pasangan (2 atlet) atau Beregu (4 atlet)
                    // Ambil 8 sampai 10 tim dari 8-10 kontingen berbeda
                    $targetTeams = $maxAthletesPerTeam === 4 ? 6 : 10; // 6 tim beregu atau 10 pasang (2 pool)
                    $teamCreated = 0;

                    foreach ($contingentModels as $cIdx => $contingent) {
                        if ($teamCreated >= $targetTeams) {
                            break;
                        }

                        $mPool = $allContingentAthletes[$contingent->id][$groupKey]['male'] ?? [];
                        $fPool = $allContingentAthletes[$contingent->id][$groupKey]['female'] ?? [];

                        $athletesForTeam = [];
                        if ($category->gender === 'male') {
                            $athletesForTeam = array_slice($mPool, 0, $maxAthletesPerTeam);
                        } elseif ($category->gender === 'female') {
                            $athletesForTeam = array_slice($fPool, 0, $maxAthletesPerTeam);
                        } else {
                            // mixed
                            if ($maxAthletesPerTeam === 2) {
                                if (! empty($mPool) && ! empty($fPool)) {
                                    $athletesForTeam = [$mPool[0], $fPool[0]];
                                }
                            } else {
                                // beregu 4: 2 male, 2 female
                                $athletesForTeam = [
                                    $mPool[0] ?? null, $mPool[1] ?? null,
                                    $fPool[0] ?? null, $fPool[1] ?? null,
                                ];
                                $athletesForTeam = array_filter($athletesForTeam);
                            }
                        }

                        if (count($athletesForTeam) >= $maxAthletesPerTeam) {
                            $teamCreated++;
                            foreach ($athletesForTeam as $member) {
                                AthleteMatchCategoryEntry::create([
                                    'event_id' => $event->id,
                                    'athlete_id' => $member->id,
                                    'event_match_category_id' => $category->id,
                                    'team_number' => 1,
                                ]);
                            }

                            // Hubungkan dengan teknik embu
                            foreach ($techniques->take(2) as $techIdx => $tech) {
                                EmbuTeamTechnique::updateOrCreate([
                                    'event_id' => $event->id,
                                    'contingent_id' => $contingent->id,
                                    'event_match_category_id' => $category->id,
                                    'team_number' => 1,
                                    'technique_id' => $tech->id,
                                ], [
                                    'order' => $techIdx + 1,
                                ]);
                            }
                        }
                    }
                }
            }

            // 10. Generate Seluruh Bagan Drawing & Jadwal Otomatis
            $this->command?->info('Membentuk bagan drawing dan jadwal otomatis untuk seluruh nomor pertandingan...');
            $generator = app(TournamentDrawingGenerator::class);
            $genResult = $generator->generate($event);

            $this->command?->info("Hasil generate: {$genResult['generated']} nomor berhasil dibagan, {$genResult['skipped']} nomor dilewati, {$genResult['matches']} partai/penampilan terjadwal.");
        });

        $this->command?->info('Dummy data nomor pertandingan dan atlet full berhasil dibuat!');
    }
}
