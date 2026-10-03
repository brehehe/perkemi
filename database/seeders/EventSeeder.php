<?php

namespace Database\Seeders;

use App\Models\Contingent;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentResult;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Primary Active Event (Surabaya 2026)
        $primaryEvent = Event::firstOrCreate(
            ['slug' => 'kejurnas-shorinji-kempo-surabaya-2026'],
            [
                'name' => 'Kejurnas Shorinji Kempo Antar Kota 2026',
                'edition' => 'Piala Walikota Surabaya Ke-X',
                'description' => 'Kejuaraan Nasional Shorinji Kempo memperebutkan Piala Bergilir Walikota Surabaya mempertandingkan nomor Embu (Kerapian Teknik) dan Randori (Perkelahian Bebas) untuk kategori Pemula, Remaja, dan Dewasa.',
                'venue' => 'GOR Gelora Pancasila',
                'city' => 'Kota Surabaya',
                'province' => 'Jawa Timur',
                'start_date' => '2026-10-24',
                'end_date' => '2026-10-26',
                'registration_start' => '2026-08-01',
                'registration_end' => '2026-10-10',
                'fee_per_athlete' => 150000,
                'fee_per_contingent' => 250000,
                'max_match_categories_per_athlete' => 3,
                'status' => 'open_registration',
                'is_active' => true,
                'organizer' => 'Pengkot PERKEMI Kota Surabaya & PB PERKEMI',
                'contact_person' => 'Sensei Hendra Wijaya, IV Dan',
                'contact_phone' => '0812-3456-7890',
            ]
        );

        // 2. Upcoming Regional Event (Malang 2026)
        Event::firstOrCreate(
            ['slug' => 'kejurda-shorinji-kempo-jatim-2026'],
            [
                'name' => 'Kejurda Shorinji Kempo Jawa Timur 2026',
                'edition' => 'Road to Porprov & PON XXII',
                'description' => 'Kejuaraan Daerah Shorinji Kempo se-Jawa Timur sebagai ajang pembinaan atlet dojo dan seleksi kejuaraan tingkat nasional.',
                'venue' => 'GOR Kanjuruhan Kepanjen',
                'city' => 'Kabupaten Malang',
                'province' => 'Jawa Timur',
                'start_date' => '2026-12-05',
                'end_date' => '2026-12-07',
                'registration_start' => '2026-10-01',
                'registration_end' => '2026-11-20',
                'fee_per_athlete' => 125000,
                'fee_per_contingent' => 200000,
                'status' => 'draft',
                'is_active' => false,
                'organizer' => 'Pengprov PERKEMI Jawa Timur',
                'contact_person' => 'Sensei Bambang Setiawan, III Dan',
                'contact_phone' => '0813-9876-5432',
            ]
        );

        // 3. Past Completed Event (Piala Menpora 2025)
        Event::firstOrCreate(
            ['slug' => 'piala-menpora-kempo-2025'],
            [
                'name' => 'Piala Menpora Shorinji Kempo Championship 2025',
                'edition' => 'Seri Kejuaraan Nasional Pelajar & Mahasiswa',
                'description' => 'Kejuaraan bergengsi tingkat nasional memperebutkan Piala Kementerian Pemuda dan Olahraga Republik Indonesia tahun 2025.',
                'venue' => 'Tennis Indoor Gelora Bung Karno',
                'city' => 'Jakarta Pusat',
                'province' => 'DKI Jakarta',
                'start_date' => '2025-11-14',
                'end_date' => '2025-11-16',
                'registration_start' => '2025-09-01',
                'registration_end' => '2025-10-30',
                'fee_per_athlete' => 150000,
                'fee_per_contingent' => 300000,
                'status' => 'completed',
                'is_active' => false,
                'organizer' => 'PB PERKEMI Pusat & Kemenpora RI',
                'contact_person' => 'Sensei Ir. Budi Hartono, V Dan',
                'contact_phone' => '0811-2233-4455',
            ]
        );

        // Associate any unassigned existing data with the primary active event
        Contingent::whereNull('event_id')->update(['event_id' => $primaryEvent->id]);
        Registration::whereNull('event_id')->update(['event_id' => $primaryEvent->id]);
        TournamentResult::whereNull('event_id')->update(['event_id' => $primaryEvent->id]);
        Rundown::whereNull('event_id')->update(['event_id' => $primaryEvent->id]);
    }
}
