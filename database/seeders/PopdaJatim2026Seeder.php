<?php

namespace Database\Seeders;

use App\Models\Athlete;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PopdaJatim2026Seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $responsibleRole = Role::query()->firstOrCreate([
                'name' => 'Penanggung Jawab Event',
                'guard_name' => 'web',
            ]);

            $responsibleUser = User::withTrashed()->firstOrNew([
                'email' => 'penanggungjawab.popda2026@smart-perkemi.id',
            ]);
            $responsibleUser->fill([
                'name' => 'Arya Setyanto W, S.Si., M.Pd.',
                'password' => Hash::make('Popda2026!'),
            ]);
            $responsibleUser->deleted_at = null;
            $responsibleUser->save();
            $responsibleUser->syncRoles([$responsibleRole]);

            $event = Event::withTrashed()->firstOrNew([
                'slug' => 'popda-xv-jawa-timur-2026',
            ]);
            $event->fill([
                'name' => 'POPDA XV Provinsi Jawa Timur 2026 — Shorinji Kempo',
                'tenant_subdomain' => 'popda-jatim-2026',
                'edition' => 'Pekan Olahraga Pelajar Daerah XV Jawa Timur',
                'description' => 'POPDA XV 2026: Beraksi dengan Cerdas, Berkompetisi tanpa Retas. Kenshi Berintegritas, Pemimpin Berkarakter Menyongsong Indonesia Emas.',
                'venue' => 'SMK Negeri 1 Geneng, Jl. Geneng–Ngawi, Keniten',
                'city' => 'Kabupaten Ngawi',
                'province' => 'Jawa Timur',
                'start_date' => '2026-11-06',
                'end_date' => '2026-11-09',
                'registration_start' => '2026-09-15',
                'registration_end' => '2026-10-19',
                'is_paid' => false,
                'fee_per_athlete' => 0,
                'fee_per_contingent' => 0,
                'max_match_categories_per_athlete' => 2,
                'allow_cross_age_group_embu' => false,
                'match_duration_minutes' => 2,
                'minimum_rest_minutes' => 15,
                'minimum_entries_per_category' => 2,
                'minimum_contingents_per_category' => 2,
                'status' => 'open_registration',
                'is_active' => true,
                'organizer' => 'Dispora Provinsi Jawa Timur, BAPOPSI Jawa Timur & Pengprov PERKEMI Jawa Timur',
                'contact_person' => 'Dwi Firawati (utama); Ali Wardana 082230517378; Devia Balqis Rarasati 082231284082',
                'contact_phone' => '089637383426',
            ]);
            $event->deleted_at = null;
            $event->save();
            $event->makeActive();
            $event->paymentMethods()->detach();
            $event->users()->syncWithoutDetaching([
                $responsibleUser->id => ['access_role' => Event::AccessRoleResponsible],
            ]);

            $ageCategory = $this->seedAgeCategory($event);
            $this->seedCourt($event);
            $this->seedMatchCategories($event, $ageCategory);
            $this->seedRundown($event);

            SiteSetting::query()->updateOrCreate(
                ['id' => 1],
                [
                    'home_landing_mode' => SiteSetting::HomeFeaturedEvent,
                    'featured_event_id' => $event->id,
                ],
            );
        });
    }

    private function seedAgeCategory(Event $event): EventAgeCategory
    {
        $ageCategory = EventAgeCategory::withTrashed()->updateOrCreate(
            ['event_id' => $event->id, 'name' => 'Pelajar POPDA'],
            [
                'min_age' => 13,
                'max_age' => 16,
                'fee' => 0,
                'description' => 'Satu kelompok umur untuk nomor Embu dan Randori. Embu minimal 13 tahun dan Randori minimal 14 tahun 6 bulan pada 6 November 2026; pelajar aktif maksimal kelas XI, Kyu III–I. Ketentuan umur tiap nomor diverifikasi panitia.',
                'order' => 1,
                'is_active' => true,
                'deleted_at' => null,
            ],
        );

        EventAgeCategory::query()
            ->where('event_id', $event->id)
            ->whereKeyNot($ageCategory->id)
            ->update(['is_active' => false]);

        Athlete::query()
            ->whereHas('contingent', fn ($query) => $query->whereBelongsTo($event))
            ->update(['event_age_category_id' => $ageCategory->id]);

        return $ageCategory;
    }

    private function seedCourt(Event $event): void
    {
        $court = EventCourt::withTrashed()->updateOrCreate(
            ['event_id' => $event->id, 'name' => 'Arena Utama POPDA'],
            [
                'location' => 'SMK Negeri 1 Geneng, Kabupaten Ngawi',
                'description' => 'Penempatan tatami mengikuti hasil technical meeting panitia pertandingan.',
                'order' => 1,
                'is_active' => true,
                'deleted_at' => null,
            ],
        );

        EventCourt::query()
            ->where('event_id', $event->id)
            ->whereKeyNot($court->id)
            ->update(['is_active' => false]);
    }

    private function seedMatchCategories(
        Event $event,
        EventAgeCategory $ageCategory,
    ): void {
        $categories = [
            ['name' => 'Randori Putra Kelas 50 kg', 'type' => 'randori', 'gender' => 'male', 'team' => 1, 'min' => null, 'max' => 50],
            ['name' => 'Randori Putra Kelas 55 kg', 'type' => 'randori', 'gender' => 'male', 'team' => 1, 'min' => 50.01, 'max' => 55],
            ['name' => 'Randori Putra Kelas 60 kg', 'type' => 'randori', 'gender' => 'male', 'team' => 1, 'min' => 55.01, 'max' => 60],
            ['name' => 'Embu Berpasangan Putra Kyu III / II / I', 'type' => 'embu', 'gender' => 'male', 'team' => 2, 'min' => null, 'max' => null],
            ['name' => 'Embu Tandoku Putra Kyu III', 'type' => 'embu', 'gender' => 'male', 'team' => 1, 'min' => null, 'max' => null, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 3'],
            ['name' => 'Randori Putri Kelas 50 kg', 'type' => 'randori', 'gender' => 'female', 'team' => 1, 'min' => null, 'max' => 50],
            ['name' => 'Randori Putri Kelas 55 kg', 'type' => 'randori', 'gender' => 'female', 'team' => 1, 'min' => 50.01, 'max' => 55],
            ['name' => 'Embu Berpasangan Putri Kyu III / II / I', 'type' => 'embu', 'gender' => 'female', 'team' => 2, 'min' => null, 'max' => null],
            ['name' => 'Embu Tandoku Putri Kyu III', 'type' => 'embu', 'gender' => 'female', 'team' => 1, 'min' => null, 'max' => null, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 3'],
            ['name' => 'Embu Berpasangan Campuran Kyu III', 'type' => 'embu', 'gender' => 'mixed', 'team' => 2, 'min' => null, 'max' => null, 'min_kyu' => 'Kyu 3', 'max_kyu' => 'Kyu 3'],
            ['name' => 'Embu Berpasangan Campuran Kyu II / I', 'type' => 'embu', 'gender' => 'mixed', 'team' => 2, 'min' => null, 'max' => null, 'min_kyu' => 'Kyu 2', 'max_kyu' => 'Kyu 1'],
        ];

        $categoryIds = [];
        foreach ($categories as $index => $categoryData) {
            $category = EventMatchCategory::withTrashed()->updateOrCreate(
                ['event_id' => $event->id, 'name' => $categoryData['name']],
                [
                    'age_category_id' => $ageCategory->id,
                    'weight_class_id' => null,
                    'type' => $categoryData['type'],
                    'gender' => $categoryData['gender'],
                    'capacity' => 76,
                    'max_athletes_per_team' => $categoryData['team'],
                    'min_weight' => $categoryData['min'],
                    'max_weight' => $categoryData['max'],
                    'min_kyu' => $categoryData['min_kyu'] ?? 'Kyu 3',
                    'max_kyu' => $categoryData['max_kyu'] ?? 'Kyu 1',
                    'order' => $index + 1,
                    'is_active' => true,
                    'deleted_at' => null,
                ],
            );
            $categoryIds[] = $category->id;
        }

        EventMatchCategory::query()
            ->where('event_id', $event->id)
            ->whereNotIn('id', $categoryIds)
            ->update(['is_active' => false]);
    }

    private function seedRundown(Event $event): void
    {
        $rundowns = [
            ['2026-11-06 08:00:00', '2026-11-06 11:00:00', 'Refreshing Wasit', 'Persiapan', false],
            ['2026-11-06 13:00:00', '2026-11-06 15:00:00', 'Timbang Badan', 'Registrasi', false],
            ['2026-11-06 15:00:00', '2026-11-06 16:00:00', 'Technical Meeting', 'Rapat Teknis', false],
            ['2026-11-07 08:00:00', '2026-11-07 08:30:00', 'Upacara Tradisi', 'Upacara', false],
            ['2026-11-07 08:30:00', '2026-11-07 12:00:00', 'Pertandingan Sesi Pagi', 'Pertandingan', true],
            ['2026-11-07 12:00:00', '2026-11-07 14:00:00', 'ISHOMA', 'Istirahat', false],
            ['2026-11-07 14:00:00', '2026-11-07 16:00:00', 'Pertandingan Sesi Siang', 'Pertandingan', true],
            ['2026-11-08 08:00:00', '2026-11-08 08:30:00', 'Upacara Tradisi', 'Upacara', false],
            ['2026-11-08 08:30:00', '2026-11-08 12:00:00', 'Pertandingan Sesi Pagi', 'Pertandingan', true],
            ['2026-11-08 12:00:00', '2026-11-08 14:00:00', 'ISHOMA', 'Istirahat', false],
            ['2026-11-08 14:00:00', '2026-11-08 16:00:00', 'Pertandingan Sesi Siang', 'Pertandingan', true],
            ['2026-11-09 07:30:00', '2026-11-09 08:00:00', 'Upacara Tradisi', 'Upacara', false],
            ['2026-11-09 08:00:00', '2026-11-09 09:00:00', 'Pertandingan Final', 'Pertandingan', true],
            ['2026-11-09 09:00:00', null, 'UPP dan Penutupan', 'Penutupan', false],
        ];

        foreach ($rundowns as $index => [$start, $end, $name, $type, $isMatchSession]) {
            Rundown::withTrashed()->updateOrCreate(
                ['event_id' => $event->id, 'date' => $start, 'name' => $name],
                [
                    'end_time' => $end,
                    'type' => $type,
                    'is_match_session' => $isMatchSession,
                    'description' => $name === 'UPP dan Penutupan' ? 'Dilaksanakan mulai pukul 09.00 WIB sampai selesai.' : null,
                    'order' => $index + 1,
                    'deleted_at' => null,
                ],
            );
        }
    }
}
