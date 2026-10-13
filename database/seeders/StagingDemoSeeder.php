<?php

namespace Database\Seeders;

use App\Enums\ContingentStatus;
use App\Enums\PaymentStatus;
use App\Enums\RefereeCourtRole;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Clerk;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\EventMatchCategory;
use App\Models\FieldCoordinator;
use App\Models\Official;
use App\Models\PaymentMethod;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\SiteSetting;
use App\Models\Technique;
use App\Models\User;
use App\Services\TournamentDrawingGenerator;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StagingDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('Mulai melakukan seeding staging full dummy data...');

        // 1. Pastikan Role & Permissions dan Master Data ada
        $this->call([
            RoleAndPermissionSeeder::class,
            KyuSeeder::class,
            TechniqueSeeder::class,
        ]);

        DB::transaction(function (): void {
            $defaultPassword = Hash::make('password123');

            // 2. Buat Semua User Berdasarkan Role
            // Admin & Super Admin
            $superAdmin = User::updateOrCreate(
                ['email' => 'admin@staging.smart-perkemi.id'],
                ['name' => 'Super Administrator Staging', 'password' => $defaultPassword]
            );
            $superAdmin->syncRoles(['Super Admin', 'Admin']);

            // Penyelenggara / Penanggung Jawab Event
            $organizer = User::updateOrCreate(
                ['email' => 'penyelenggara@staging.smart-perkemi.id'],
                ['name' => 'Sensei Dr. H. Faisal Rahman, V Dan (Ketua Panitia)', 'password' => $defaultPassword]
            );
            $organizer->syncRoles(['Penanggung Jawab Event']);

            // Koordinator Lapangan
            $fieldCoordUser = User::updateOrCreate(
                ['email' => 'korlap@staging.smart-perkemi.id'],
                ['name' => 'Sensei Bambang Sugeng (Koordinator Pertandingan)', 'password' => $defaultPassword]
            );
            $fieldCoordUser->syncRoles(['Koordinator Lapangan', 'Pertandingan']);

            // Wasit Utama & Panel Wasit
            $refereeChiefUser = User::updateOrCreate(
                ['email' => 'wasit@staging.smart-perkemi.id'],
                ['name' => 'Sensei Ahmad Fauzi, IV Dan (Wasit Utama)', 'password' => $defaultPassword]
            );
            $refereeChiefUser->syncRoles(['Wasit']);

            $refereeUsers = [
                $refereeChiefUser,
                User::updateOrCreate(['email' => 'wasit2@staging.smart-perkemi.id'], ['name' => 'Sensei Slamet Riyadi, III Dan (Wasit Daerah 1)', 'password' => $defaultPassword]),
                User::updateOrCreate(['email' => 'wasit3@staging.smart-perkemi.id'], ['name' => 'Sensei Iwan Kurniawan, III Dan (Wasit Daerah 2)', 'password' => $defaultPassword]),
                User::updateOrCreate(['email' => 'wasit4@staging.smart-perkemi.id'], ['name' => 'Sensei Siti Rahayu, II Dan (Wasit Pembantu 1)', 'password' => $defaultPassword]),
                User::updateOrCreate(['email' => 'wasit5@staging.smart-perkemi.id'], ['name' => 'Sensei Budi Prasetyo, II Dan (Wasit Pembantu 2)', 'password' => $defaultPassword]),
            ];
            foreach ($refereeUsers as $ru) {
                $ru->syncRoles(['Wasit']);
            }

            // Panitera
            $clerkUser = User::updateOrCreate(
                ['email' => 'panitera@staging.smart-perkemi.id'],
                ['name' => 'Petugas Panitera & Operator Scoring', 'password' => $defaultPassword]
            );
            $clerkUser->syncRoles(['Panitera']);

            // Kontingen Users
            $contingentSurabayaUser = User::updateOrCreate(
                ['email' => 'kontingen.surabaya@staging.smart-perkemi.id'],
                ['name' => 'Official Kontingen Surabaya', 'password' => $defaultPassword]
            );
            $contingentSurabayaUser->syncRoles(['kontingen']);

            $contingentMalangUser = User::updateOrCreate(
                ['email' => 'kontingen.malang@staging.smart-perkemi.id'],
                ['name' => 'Official Kontingen Malang', 'password' => $defaultPassword]
            );
            $contingentMalangUser->syncRoles(['kontingen']);

            $contingentSidoarjoUser = User::updateOrCreate(
                ['email' => 'kontingen.sidoarjo@staging.smart-perkemi.id'],
                ['name' => 'Official Kontingen Sidoarjo', 'password' => $defaultPassword]
            );
            $contingentSidoarjoUser->syncRoles(['kontingen']);

            $contingentKediriUser = User::updateOrCreate(
                ['email' => 'kontingen.kediri@staging.smart-perkemi.id'],
                ['name' => 'Official Kontingen Kediri', 'password' => $defaultPassword]
            );
            $contingentKediriUser->syncRoles(['kontingen']);

            // Akun User Tambahan untuk Atlet & Official
            $athleteUser = User::updateOrCreate(
                ['email' => 'atlet@staging.smart-perkemi.id'],
                ['name' => 'Raditya Pratama (Kenshi Atlet)', 'password' => $defaultPassword]
            );
            $officialUser = User::updateOrCreate(
                ['email' => 'official@staging.smart-perkemi.id'],
                ['name' => 'Sensei Hartono (Pelatih Kepala Official)', 'password' => $defaultPassword]
            );

            // 3. Buat Satu Event Trial Utama
            $event = Event::withTrashed()->firstOrNew([
                'slug' => 'trial-staging-2026',
            ]);
            $event->fill([
                'name' => 'Kejuaraan Shorinji Kempo Trial Staging 2026',
                'tenant_subdomain' => 'trial-staging',
                'edition' => 'Edisi Simulasi & Verifikasi Sistem Lengkap',
                'description' => 'Event uji coba dan simulasi menyeluruh untuk Smart Perkemi: Pendaftaran, verifikasi atlet & kontingen, bagan pertandingan, penugasan wasit, penilaian real-time, dan monitor panitera.',
                'venue' => 'GOR Shorinji Kempo Center — Tatami Arena',
                'city' => 'Kota Surabaya',
                'province' => 'Jawa Timur',
                'start_date' => Carbon::now()->toDateString(),
                'end_date' => Carbon::now()->addDays(3)->toDateString(),
                'registration_start' => Carbon::now()->subDays(14)->toDateString(),
                'registration_end' => Carbon::now()->addDays(1)->toDateString(),
                'is_paid' => false,
                'fee_per_athlete' => 100000,
                'fee_per_contingent' => 200000,
                'max_match_categories_per_athlete' => 3,
                'allow_cross_age_group_embu' => true,
                'match_duration_minutes' => 10,
                'minimum_rest_minutes' => 10,
                'minimum_entries_per_category' => 2,
                'minimum_contingents_per_category' => 2,
                'status' => 'open_registration',
                'is_active' => true,
                'organizer' => 'Pengprov PERKEMI Jawa Timur & Tim Staging Smart Perkemi',
                'contact_person' => 'Sensei Faisal Rahman (0812-3456-7890)',
                'contact_phone' => '081234567890',
            ]);
            $event->deleted_at = null;
            $event->save();
            $event->makeActive();

            // Set Featured Event di Homepage
            SiteSetting::query()->updateOrCreate(
                ['id' => 1],
                [
                    'home_landing_mode' => SiteSetting::HomeFeaturedEvent,
                    'featured_event_id' => $event->id,
                ]
            );

            // Hubungkan User ke Event
            $event->users()->syncWithoutDetaching([
                $organizer->id => ['access_role' => Event::AccessRoleResponsible],
                $superAdmin->id => ['access_role' => 'admin'],
                $fieldCoordUser->id => ['access_role' => 'match_coordinator'],
            ]);

            // 4. Setup Tatami / Gelanggang (Courts)
            $courtsData = [
                ['name' => 'Court 1 (Tatami Utama)', 'location' => 'Area Tengah (Center Arena)', 'order' => 1],
                ['name' => 'Court 2 (Tatami Barat)', 'location' => 'Sayap Barat (West Wing)', 'order' => 2],
                ['name' => 'Court 3 (Tatami Timur)', 'location' => 'Sayap Timur (East Wing)', 'order' => 3],
            ];
            $courts = [];
            foreach ($courtsData as $c) {
                $courts[] = EventCourt::withTrashed()->updateOrCreate(
                    ['event_id' => $event->id, 'name' => $c['name']],
                    ['location' => $c['location'], 'order' => $c['order'], 'is_active' => true, 'deleted_at' => null]
                );
            }
            $court1 = $courts[0];
            $court2 = $courts[1];

            // 5. Setup Master Wasit, Panitera, dan Koordinator Lapangan Terdaftar
            $refereeRoles = [
                RefereeCourtRole::Chief->value,
                RefereeCourtRole::RegionalOne->value,
                RefereeCourtRole::RegionalTwo->value,
                RefereeCourtRole::AssistantOne->value,
                RefereeCourtRole::AssistantTwo->value,
            ];
            $refereeModels = [];
            foreach ($refereeUsers as $idx => $ru) {
                $refereeModel = Referee::withTrashed()->updateOrCreate(
                    ['email' => $ru->email],
                    [
                        'user_id' => $ru->id,
                        'name' => $ru->name,
                        'gender' => ($idx === 3 ? 'female' : 'male'),
                        'dan_grade' => ($idx === 0 ? 'IV Dan' : ($idx <= 2 ? 'III Dan' : 'II Dan')),
                        'license_number' => 'W-STG-2026-00'.($idx + 1),
                        'certification_level' => ($idx === 0 ? 'Nasional A' : 'Nasional B'),
                        'region' => 'Jawa Timur',
                        'phone' => '08123456789'.($idx + 1),
                        'is_active' => true,
                        'deleted_at' => null,
                    ]
                );
                $refereeModels[] = $refereeModel;

                // Hubungkan ke event
                $event->referees()->syncWithoutDetaching([
                    $refereeModel->id => ['role' => ($idx === 0 ? 'Wasit Utama' : 'Wasit Juri')],
                ]);

                // Hadirkan hari ini
                RefereeAttendance::updateOrCreate(
                    ['referee_id' => $refereeModel->id, 'event_id' => $event->id, 'attendance_date' => now()->toDateString()],
                    ['is_present' => true, 'checked_in_at' => now(), 'checked_in_by_user_id' => $superAdmin->id, 'method' => 'manual']
                );
                RefereeCourtAttendance::updateOrCreate(
                    ['referee_id' => $refereeModel->id, 'event_id' => $event->id, 'event_court_id' => $court1->id, 'attendance_date' => now()->toDateString()],
                    ['checked_in_at' => now(), 'checked_in_by_user_id' => $superAdmin->id, 'method' => 'manual']
                );

                // Pasang di Court 1 Panel
                EventCourtAssignment::updateOrCreate(
                    ['event_court_id' => $court1->id, 'staff_type' => 'referee', 'role' => $refereeRoles[$idx]],
                    ['staff_id' => $refereeModel->id]
                );
            }

            // Panitera Model
            $clerkModel = Clerk::withTrashed()->updateOrCreate(
                ['email' => $clerkUser->email],
                [
                    'name' => $clerkUser->name,
                    'employee_number' => 'CLK-STG-2026-01',
                    'certification' => 'Panitera Nasional Terakreditasi',
                    'region' => 'Jawa Timur',
                    'phone' => '081298765430',
                    'is_active' => true,
                    'deleted_at' => null,
                ]
            );
            $event->clerks()->syncWithoutDetaching([
                $clerkModel->id => ['role' => 'Panitera Gelanggang 1'],
            ]);
            EventCourtAssignment::updateOrCreate(
                ['event_court_id' => $court1->id, 'staff_type' => 'clerk', 'role' => 'panitera'],
                ['staff_id' => $clerkModel->id]
            );

            // Koordinator Lapangan Model
            $fieldCoordModel = FieldCoordinator::withTrashed()->updateOrCreate(
                ['email' => $fieldCoordUser->email],
                [
                    'name' => $fieldCoordUser->name,
                    'coordinator_number' => 'KORLAP-STG-2026-01',
                    'region' => 'Jawa Timur',
                    'phone' => '081277665544',
                    'is_active' => true,
                    'deleted_at' => null,
                ]
            );
            $event->fieldCoordinators()->syncWithoutDetaching([
                $fieldCoordModel->id => ['assignment_area' => 'Seluruh Gelanggang & Call Room'],
            ]);

            // 6. Setup Payment Method
            $paymentMethod = PaymentMethod::firstOrCreate(['code' => 'staging-bank-mandiri'], [
                'name' => 'Transfer Bank Rekening Resmi PERKEMI Jatim',
                'type' => 'bank_transfer',
                'provider' => 'Bank Mandiri',
                'account_name' => 'PENGPROV PERKEMI JAWA TIMUR',
                'account_number' => '141-00-9876543-2',
                'instructions' => 'Pembayaran simulasi staging terverifikasi otomatis.',
                'order' => 1,
                'is_active' => true,
            ]);
            $event->paymentMethods()->syncWithoutDetaching([$paymentMethod->id]);

            // 7. Setup Rundown Pertandingan
            $baseDate = Carbon::now();
            $rundownsData = [
                ['name' => 'Hari 1 - Sesi Pagi (Penyisihan Embu & Randori)', 'day' => 0, 'start' => '08:00', 'end' => '12:00', 'order' => 1],
                ['name' => 'Hari 1 - Sesi Siang (Penyisihan Lanjutan)', 'day' => 0, 'start' => '13:00', 'end' => '18:00', 'order' => 2],
                ['name' => 'Hari 2 - Sesi Pagi (Perempat Final & Pool Embu)', 'day' => 1, 'start' => '08:00', 'end' => '12:00', 'order' => 3],
                ['name' => 'Hari 2 - Sesi Siang (Semi Final & Final Embu)', 'day' => 1, 'start' => '13:00', 'end' => '18:00', 'order' => 4],
                ['name' => 'Hari 3 - Sesi Pagi (Final Randori & UPP)', 'day' => 2, 'start' => '08:00', 'end' => '13:00', 'order' => 5],
            ];
            foreach ($rundownsData as $rd) {
                $sessionDate = $baseDate->copy()->addDays($rd['day']);
                Rundown::withTrashed()->updateOrCreate(
                    ['event_id' => $event->id, 'name' => $rd['name']],
                    [
                        'date' => $sessionDate->copy()->setTimeFromTimeString($rd['start']),
                        'end_time' => $sessionDate->copy()->setTimeFromTimeString($rd['end']),
                        'type' => 'Pertandingan',
                        'order' => $rd['order'],
                        'is_match_session' => true,
                        'deleted_at' => null,
                    ]
                );
            }

            // 8. Kelompok Umur (Age Categories)
            $ageRemaja = EventAgeCategory::withTrashed()->updateOrCreate(
                ['event_id' => $event->id, 'name' => 'Remaja (Kyu III - I)'],
                ['min_age' => 14, 'max_age' => 17, 'fee' => 0, 'order' => 1, 'is_active' => true, 'deleted_at' => null]
            );
            $ageDewasa = EventAgeCategory::withTrashed()->updateOrCreate(
                ['event_id' => $event->id, 'name' => 'Dewasa (Yudansha)'],
                ['min_age' => 18, 'max_age' => 35, 'fee' => 0, 'order' => 2, 'is_active' => true, 'deleted_at' => null]
            );

            // 9. Nomor Pertandingan / Teknik-Teknik (Match Categories)
            $matchSpecs = [
                // Embu Remaja
                ['name' => 'Embu Tandoku Remaja Putra Kyu III - I', 'age_id' => $ageRemaja->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 1', 'order' => 1],
                ['name' => 'Embu Tandoku Remaja Putri Kyu III - I', 'age_id' => $ageRemaja->id, 'type' => 'embu', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 1', 'order' => 2],
                ['name' => 'Embu Berpasangan Remaja Putra Kyu III - I', 'age_id' => $ageRemaja->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 1', 'order' => 3],
                ['name' => 'Embu Berpasangan Remaja Putri Kyu III - I', 'age_id' => $ageRemaja->id, 'type' => 'embu', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 1', 'order' => 4],
                ['name' => 'Embu Berpasangan Remaja Campuran Kyu III - I', 'age_id' => $ageRemaja->id, 'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 1', 'order' => 5],

                // Randori Remaja
                ['name' => 'Randori Remaja Putra Kelas 50 kg', 'age_id' => $ageRemaja->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 45.0, 'max_w' => 50.0, 'order' => 6],
                ['name' => 'Randori Remaja Putra Kelas 55 kg', 'age_id' => $ageRemaja->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 50.01, 'max_w' => 55.0, 'order' => 7],
                ['name' => 'Randori Remaja Putra Kelas 60 kg', 'age_id' => $ageRemaja->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 55.01, 'max_w' => 60.0, 'order' => 8],
                ['name' => 'Randori Remaja Putri Kelas 50 kg', 'age_id' => $ageRemaja->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 45.0, 'max_w' => 50.0, 'order' => 9],
                ['name' => 'Randori Remaja Putri Kelas 55 kg', 'age_id' => $ageRemaja->id, 'type' => 'randori', 'gender' => 'female', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 50.01, 'max_w' => 55.0, 'order' => 10],

                // Dewasa
                ['name' => 'Embu Berpasangan Dewasa Putra Yudansha', 'age_id' => $ageDewasa->id, 'type' => 'embu', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 2, 'min_kyu' => 'Dan 1', 'max_kyu' => 'Dan 3', 'order' => 11],
                ['name' => 'Randori Dewasa Putra Kelas 60 kg', 'age_id' => $ageDewasa->id, 'type' => 'randori', 'gender' => 'male', 'capacity' => 16, 'max_athletes' => 1, 'min_w' => 55.01, 'max_w' => 60.0, 'order' => 12],
            ];

            $matchCategories = [];
            foreach ($matchSpecs as $spec) {
                $matchCategories[] = EventMatchCategory::withTrashed()->updateOrCreate(
                    ['event_id' => $event->id, 'name' => $spec['name']],
                    [
                        'age_category_id' => $spec['age_id'],
                        'type' => $spec['type'],
                        'gender' => $spec['gender'],
                        'capacity' => $spec['capacity'],
                        'max_athletes_per_team' => $spec['max_athletes'],
                        'min_weight' => $spec['min_w'] ?? null,
                        'max_weight' => $spec['max_w'] ?? null,
                        'min_kyu' => $spec['min_kyu'] ?? 'Kyu 3',
                        'max_kyu' => $spec['max_kyu'] ?? 'Dan 1',
                        'order' => $spec['order'],
                        'is_active' => true,
                        'deleted_at' => null,
                    ]
                );
            }

            // 10. Setup Kontingen (Verified)
            $contingentsData = [
                [
                    'user' => $contingentSurabayaUser,
                    'name' => 'Pengcab PERKEMI Kota Surabaya',
                    'city' => 'Kota Surabaya',
                    'manager' => 'Sensei Budi Santoso, IV Dan',
                    'phone' => '081234560001',
                    'email' => 'kontingen.surabaya@staging.smart-perkemi.id',
                    'code' => 'REG-SBY-001',
                ],
                [
                    'user' => $contingentMalangUser,
                    'name' => 'Pengcab PERKEMI Kota Malang',
                    'city' => 'Kota Malang',
                    'manager' => 'Sensei Heru Prasetyo, III Dan',
                    'phone' => '081234560002',
                    'email' => 'kontingen.malang@staging.smart-perkemi.id',
                    'code' => 'REG-MLG-002',
                ],
                [
                    'user' => $contingentSidoarjoUser,
                    'name' => 'Pengcab PERKEMI Kabupaten Sidoarjo',
                    'city' => 'Kabupaten Sidoarjo',
                    'manager' => 'Sensei Joko Susilo, III Dan',
                    'phone' => '081234560003',
                    'email' => 'kontingen.sidoarjo@staging.smart-perkemi.id',
                    'code' => 'REG-SDA-003',
                ],
                [
                    'user' => $contingentKediriUser,
                    'name' => 'Pengcab PERKEMI Kota Kediri',
                    'city' => 'Kota Kediri',
                    'manager' => 'Sensei Danang Wijaya, III Dan',
                    'phone' => '081234560004',
                    'email' => 'kontingen.kediri@staging.smart-perkemi.id',
                    'code' => 'REG-KDR-004',
                ],
            ];

            $techniques = Technique::all();
            if ($techniques->isEmpty()) {
                $techniques = collect([
                    Technique::create(['name' => 'Gorin Gasho', 'category' => 'Dasar', 'level' => 'Kyu 3']),
                    Technique::create(['name' => 'Uchi Uke Tsuki', 'category' => 'Juho', 'level' => 'Kyu 2']),
                    Technique::create(['name' => 'Kote Nuki', 'category' => 'Goho', 'level' => 'Kyu 1']),
                ]);
            }

            foreach ($contingentsData as $cIdx => $cData) {
                $contingent = Contingent::withTrashed()->updateOrCreate(
                    ['event_id' => $event->id, 'name' => $cData['name']],
                    [
                        'user_id' => $cData['user']->id,
                        'city' => $cData['city'],
                        'manager_name' => $cData['manager'],
                        'phone' => $cData['phone'],
                        'email' => $cData['email'],
                        'address' => 'Gedung Koni '.$cData['city'],
                        'status' => ContingentStatus::Verified,
                        'deleted_at' => null,
                    ]
                );

                // Buat Official Kontingen
                Official::withTrashed()->updateOrCreate(
                    ['contingent_id' => $contingent->id, 'name' => $cData['manager']],
                    [
                        'role' => 'Manager Kontingen',
                        'gender' => 'male',
                        'phone' => $cData['phone'],
                        'email' => $cData['email'],
                        'id_card_number' => '3578'.rand(100000000000, 999999999999),
                        'deleted_at' => null,
                    ]
                );
                Official::withTrashed()->updateOrCreate(
                    ['contingent_id' => $contingent->id, 'name' => 'Sensei Pelatih '.$cData['city']],
                    [
                        'role' => 'Pelatih Kepala',
                        'gender' => 'male',
                        'phone' => '0812889900'.($cIdx + 1),
                        'email' => 'pelatih.'.$cIdx.'@staging.smart-perkemi.id',
                        'id_card_number' => '3578'.rand(100000000000, 999999999999),
                        'deleted_at' => null,
                    ]
                );

                // 11. Buat Atlet (Putra dan Putri dengan data lengkap & verifikasi sekolah)
                $athletes = [];
                // 4 Atlet Remaja Putra
                for ($a = 1; $a <= 4; $a++) {
                    $name = ['Raditya Pratama', 'Bima Arya Santoso', 'Dimas Mahendra', 'Wahyu Hidayat'][$a - 1].' ('.$cData['city'].')';
                    $athletes[] = Athlete::withTrashed()->updateOrCreate(
                        ['contingent_id' => $contingent->id, 'kenshi_number' => 'KNS-'.strtoupper(substr($cData['city'], 0, 3)).'-M0'.$a],
                        [
                            'event_age_category_id' => $ageRemaja->id,
                            'name' => $name,
                            'gender' => 'male',
                            'nik' => '3578'.rand(100000000000, 999999999999),
                            'birth_place' => $cData['city'],
                            'birth_date' => Carbon::parse('2010-04-15')->subMonths($a * 2),
                            'blood_type' => 'O',
                            'home_address' => 'Jl. Shorinji No. '.$a.', '.$cData['city'],
                            'dojo_name' => 'Dojo '.$cData['city'].' Induk',
                            'kyu_dan' => 'Kyu '.($a % 3 + 1),
                            'weight' => 48.0 + ($a * 2.5), // 50.5, 53.0, 55.5, 58.0
                            'height' => 165.0 + $a,
                            'bpjs_number' => '00012345678'.$a,
                            'bpjs_status' => 'active',
                            'school_name' => 'SMA Negeri 1 '.$cData['city'],
                            'school_level' => 'SMA',
                            'school_entry_year' => 2024,
                            'school_grade' => 10,
                            'school_verified_at' => now(),
                            'school_verified_by' => $superAdmin->id,
                            'deleted_at' => null,
                        ]
                    );
                }

                // 4 Atlet Remaja Putri
                for ($a = 1; $a <= 4; $a++) {
                    $name = ['Annisa Rahmawati', 'Citra Dewi Permata', 'Nabila Larasati', 'Safira Putri'][$a - 1].' ('.$cData['city'].')';
                    $athletes[] = Athlete::withTrashed()->updateOrCreate(
                        ['contingent_id' => $contingent->id, 'kenshi_number' => 'KNS-'.strtoupper(substr($cData['city'], 0, 3)).'-F0'.$a],
                        [
                            'event_age_category_id' => $ageRemaja->id,
                            'name' => $name,
                            'gender' => 'female',
                            'nik' => '3578'.rand(100000000000, 999999999999),
                            'birth_place' => $cData['city'],
                            'birth_date' => Carbon::parse('2010-06-20')->subMonths($a * 2),
                            'blood_type' => 'A',
                            'home_address' => 'Jl. Kenanga No. '.$a.', '.$cData['city'],
                            'dojo_name' => 'Dojo '.$cData['city'].' Induk',
                            'kyu_dan' => 'Kyu '.($a % 3 + 1),
                            'weight' => 46.0 + ($a * 2.0), // 48.0, 50.0, 52.0, 54.0
                            'height' => 158.0 + $a,
                            'bpjs_number' => '00098765432'.$a,
                            'bpjs_status' => 'active',
                            'school_name' => 'SMA Negeri 2 '.$cData['city'],
                            'school_level' => 'SMA',
                            'school_entry_year' => 2024,
                            'school_grade' => 10,
                            'school_verified_at' => now(),
                            'school_verified_by' => $superAdmin->id,
                            'deleted_at' => null,
                        ]
                    );
                }

                // 2 Atlet Dewasa Putra
                for ($a = 1; $a <= 2; $a++) {
                    $name = ['Satria Yudha Pratama', 'Doni Kurniawan'][$a - 1].' ('.$cData['city'].')';
                    $athletes[] = Athlete::withTrashed()->updateOrCreate(
                        ['contingent_id' => $contingent->id, 'kenshi_number' => 'KNS-'.strtoupper(substr($cData['city'], 0, 3)).'-DAN0'.$a],
                        [
                            'event_age_category_id' => $ageDewasa->id,
                            'name' => $name,
                            'gender' => 'male',
                            'nik' => '3578'.rand(100000000000, 999999999999),
                            'birth_place' => $cData['city'],
                            'birth_date' => Carbon::parse('2002-03-10'),
                            'blood_type' => 'B',
                            'home_address' => 'Jl. Veteran No. '.$a.', '.$cData['city'],
                            'dojo_name' => 'Dojo '.$cData['city'].' Yudansha',
                            'kyu_dan' => 'Dan 1',
                            'weight' => 58.5,
                            'height' => 170.0,
                            'bpjs_number' => '00055443322'.$a,
                            'bpjs_status' => 'active',
                            'school_name' => 'Universitas Negeri '.$cData['city'],
                            'school_level' => 'PT',
                            'school_entry_year' => 2021,
                            'school_grade' => 4,
                            'school_verified_at' => now(),
                            'school_verified_by' => $superAdmin->id,
                            'deleted_at' => null,
                        ]
                    );
                }

                // 12. Buat Registrasi Kontingen (Status Terverifikasi Penuh)
                $registration = Registration::withTrashed()->updateOrCreate(
                    ['event_id' => $event->id, 'contingent_id' => $contingent->id],
                    [
                        'registration_number' => 'REG-'.strtoupper(substr($cData['city'], 0, 3)).'-2026-'.($cIdx + 1),
                        'verification_code' => (string) (101 + $cIdx),
                        'status' => RegistrationStatus::Verified,
                        'payment_status' => PaymentStatus::Verified,
                        'payment_method_id' => $paymentMethod->id,
                        'total_amount' => 1200000,
                        'final_amount' => 1200000,
                        'payment_amount' => 1200000,
                        'payment_submitted_at' => now(),
                        'payment_verified_at' => now(),
                        'payment_verified_by' => $superAdmin->id,
                        'payment_reference' => 'TRX-STG-00'.($cIdx + 1),
                        'notes' => 'Pendaftaran, berkas identitas atlet, dan pembayaran lunas diverifikasi.',
                        'deleted_at' => null,
                    ]
                );

                // 13. Daftarkan Atlet ke Nomor Pertandingan
                $maleAthletes = collect($athletes)->where('gender', 'male')->values();
                $femaleAthletes = collect($athletes)->where('gender', 'female')->values();

                foreach ($matchCategories as $cat) {
                    if ($cat->age_category_id === $ageRemaja->id) {
                        if ($cat->name === 'Embu Tandoku Remaja Putra Kyu III - I' && isset($maleAthletes[0])) {
                            AthleteMatchCategoryEntry::firstOrCreate([
                                'event_id' => $event->id,
                                'athlete_id' => $maleAthletes[0]->id,
                                'event_match_category_id' => $cat->id,
                                'team_number' => 1,
                            ]);
                        }
                        if ($cat->name === 'Embu Tandoku Remaja Putri Kyu III - I' && isset($femaleAthletes[0])) {
                            AthleteMatchCategoryEntry::firstOrCreate([
                                'event_id' => $event->id,
                                'athlete_id' => $femaleAthletes[0]->id,
                                'event_match_category_id' => $cat->id,
                                'team_number' => 1,
                            ]);
                        }
                        if ($cat->name === 'Embu Berpasangan Remaja Putra Kyu III - I' && isset($maleAthletes[0], $maleAthletes[1])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[0]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[1]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Embu Berpasangan Remaja Putri Kyu III - I' && isset($femaleAthletes[0], $femaleAthletes[1])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $femaleAthletes[0]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $femaleAthletes[1]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Embu Berpasangan Remaja Campuran Kyu III - I' && isset($maleAthletes[2], $femaleAthletes[2])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[2]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $femaleAthletes[2]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Randori Remaja Putra Kelas 50 kg' && isset($maleAthletes[0])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[0]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Randori Remaja Putra Kelas 55 kg' && isset($maleAthletes[1])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[1]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Randori Remaja Putra Kelas 60 kg' && isset($maleAthletes[2])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[2]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Randori Remaja Putri Kelas 50 kg' && isset($femaleAthletes[0])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $femaleAthletes[0]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Randori Remaja Putri Kelas 55 kg' && isset($femaleAthletes[1])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $femaleAthletes[1]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                    }

                    if ($cat->age_category_id === $ageDewasa->id) {
                        if ($cat->name === 'Embu Berpasangan Dewasa Putra Yudansha' && isset($maleAthletes[4], $maleAthletes[5])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[4]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[5]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                        if ($cat->name === 'Randori Dewasa Putra Kelas 60 kg' && isset($maleAthletes[4])) {
                            AthleteMatchCategoryEntry::firstOrCreate(['event_id' => $event->id, 'athlete_id' => $maleAthletes[4]->id, 'event_match_category_id' => $cat->id, 'team_number' => 1]);
                        }
                    }

                    // Tautkan Teknik Embu
                    if ($cat->type === 'embu') {
                        foreach ($techniques->take(3) as $tIdx => $t) {
                            EmbuTeamTechnique::updateOrCreate(
                                [
                                    'event_id' => $event->id,
                                    'contingent_id' => $contingent->id,
                                    'event_match_category_id' => $cat->id,
                                    'team_number' => 1,
                                    'technique_id' => $t->id,
                                ],
                                ['order' => $tIdx + 1]
                            );
                        }
                    }
                }
            }

            // 14. Generate Bagan Pertandingan (Drawing) & Jadwal Lapangan Otomatis
            $this->command?->info('Membentuk bagan drawing dan jadwal otomatis pertandingan...');
            $generator = app(TournamentDrawingGenerator::class);
            $genResult = $generator->generate($event);
            $this->command?->info("Hasil drawing: {$genResult['generated']} kategori berhasil dibagan, {$genResult['matches']} pertandingan terjadwal.");

            // Publikasikan Bagan agar siap ditampilkan di semua portal
            $event->tournamentDrawings()->where('status', 'generated')->update([
                'status' => 'published',
                'published_at' => now(),
            ]);

            $this->command?->info('Seluruh dummy data trial event untuk staging berhasil disiapkan!');
        });
    }
}
