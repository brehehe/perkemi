<?php

namespace Database\Seeders;

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentResult;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DashboardSampleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Don't duplicate if already seeded
        if (Contingent::count() >= 5) {
            return;
        }

        DB::transaction(function () {
            $contingentsData = [
                ['name' => 'Dojo Garuda Sakti Surabaya', 'city' => 'Kota Surabaya', 'manager' => 'Sensei Budi Santoso', 'phone' => '081234567891'],
                ['name' => 'Dojo Macan Putih Malang', 'city' => 'Kota Malang', 'manager' => 'Sensei Haryono', 'phone' => '081234567892'],
                ['name' => 'Dojo Rajawali Sidoarjo', 'city' => 'Kabupaten Sidoarjo', 'manager' => 'Sensei Dewi Anggraini', 'phone' => '081234567893'],
                ['name' => 'Dojo Naga Emas Gresik', 'city' => 'Kabupaten Gresik', 'manager' => 'Sensei Agus Setiawan', 'phone' => '081234567894'],
                ['name' => 'Dojo Brawijaya Pasuruan', 'city' => 'Kota Pasuruan', 'manager' => 'Sensei Bambang W.', 'phone' => '081234567895'],
                ['name' => 'Dojo Satria Mojokerto', 'city' => 'Kabupaten Mojokerto', 'manager' => 'Sensei Hendra Gunawan', 'phone' => '081234567896'],
                ['name' => 'Dojo Perkemi Jember', 'city' => 'Kabupaten Jember', 'manager' => 'Sensei Anita Rahayu', 'phone' => '081234567897'],
                ['name' => 'Dojo Mahameru Banyuwangi', 'city' => 'Kabupaten Banyuwangi', 'manager' => 'Sensei Rudi Hartono', 'phone' => '081234567898'],
            ];

            $createdContingents = [];

            foreach ($contingentsData as $idx => $data) {
                $user = User::firstOrCreate(
                    ['email' => 'contingent'.($idx + 1).'@perkemi-surabaya.id'],
                    [
                        'name' => $data['manager'],
                        'password' => Hash::make('password'),
                    ]
                );

                $contingent = Contingent::create([
                    'user_id' => $user->id,
                    'name' => $data['name'],
                    'city' => $data['city'],
                    'manager_name' => $data['manager'],
                    'phone' => $data['phone'],
                    'address' => 'Jl. Shorinji Kempo No. '.($idx + 10).', '.$data['city'],
                    'status' => 'verified',
                ]);

                $createdContingents[] = $contingent;

                // Create athletes for each contingent (5 to 12 athletes)
                $athleteCount = rand(5, 12);
                for ($a = 1; $a <= $athleteCount; $a++) {
                    Athlete::create([
                        'contingent_id' => $contingent->id,
                        'name' => 'Kenshi '.$contingent->name.' #'.$a,
                        'gender' => $a % 3 === 0 ? 'P' : 'L',
                        'kyu_dan' => 'Kyu '.rand(1, 6),
                        'weight' => rand(45, 80),
                        'height' => rand(155, 185),
                        'birth_date' => now()->subYears(rand(14, 25))->subDays(rand(1, 365)),
                        'created_at' => now()->subMonths(rand(0, 5))->subDays(rand(1, 28)),
                    ]);
                }

                // Create registrations
                Registration::create([
                    'contingent_id' => $contingent->id,
                    'registration_number' => 'REG-2026-'.str_pad($idx + 1, 4, '0', STR_PAD_LEFT),
                    'status' => $idx % 4 === 0 ? 'pending' : ($idx % 5 === 0 ? 'rejected' : 'verified'),
                    'total_amount' => $athleteCount * 150000,
                    'final_amount' => $athleteCount * 150000,
                    'notes' => 'Pendaftaran kontingen '.$data['name'],
                    'created_at' => now()->subDays($idx * 2 + 1),
                ]);
            }

            // Create sample tournament medal results
            $medals = [
                ['rank' => 1, 'contingent_idx' => 0, 'category' => 'Embu Berpasangan Kyu I Putra'],
                ['rank' => 1, 'contingent_idx' => 0, 'category' => 'Randori Dewasa 65kg Putra'],
                ['rank' => 1, 'contingent_idx' => 1, 'category' => 'Embu Beregu Campuran'],
                ['rank' => 1, 'contingent_idx' => 2, 'category' => 'Randori Remaja 50kg Putri'],
                ['rank' => 2, 'contingent_idx' => 0, 'category' => 'Embu Tunggal Dan I Putra'],
                ['rank' => 2, 'contingent_idx' => 1, 'category' => 'Randori Dewasa 60kg Putra'],
                ['rank' => 2, 'contingent_idx' => 3, 'category' => 'Randori Dewasa 55kg Putri'],
                ['rank' => 3, 'contingent_idx' => 1, 'category' => 'Embu Berpasangan Kyu II Putri'],
                ['rank' => 3, 'contingent_idx' => 2, 'category' => 'Randori Dewasa 70kg Putra'],
                ['rank' => 3, 'contingent_idx' => 4, 'category' => 'Randori Remaja 55kg Putra'],
                ['rank' => 4, 'contingent_idx' => 3, 'category' => 'Embu Berpasangan Yudansha'],
            ];

            foreach ($medals as $m) {
                $targetContingent = $createdContingents[$m['contingent_idx']] ?? $createdContingents[0];
                TournamentResult::create([
                    'contingent_id' => $targetContingent->id,
                    'contingent_name' => $targetContingent->name,
                    'rank' => $m['rank'],
                    'match_category' => $m['category'],
                ]);
            }

            // Create Rundowns for today
            $todayRundowns = [
                ['time' => '08:00', 'name' => 'Upacara Pembukaan & Defile Kontingen', 'type' => 'Seremonial', 'desc' => 'Dihadiri jajaran Forkopimda & Pengprov PERKEMI'],
                ['time' => '09:30', 'name' => 'Babak Penyisihan Embu Berpasangan & Beregu', 'type' => 'Embu', 'desc' => 'Court 1 & Court 2 — Tingkat Kyu Kenshi'],
                ['time' => '13:00', 'name' => 'Babak Penyisihan Randori Putra & Putri', 'type' => 'Randori', 'desc' => 'Court 1 (Putra) & Court 2 (Putri)'],
                ['time' => '16:00', 'name' => 'Babak Semifinal & Final Embu', 'type' => 'Final Embu', 'desc' => 'Perebutan Medali Emas, Perak & Perunggu'],
                ['time' => '18:30', 'name' => 'Upacara Penghormatan Pemenang (UPP)', 'type' => 'Penganugerahan', 'desc' => 'Penyerahan Medali Sesi I'],
            ];

            foreach ($todayRundowns as $order => $r) {
                Rundown::create([
                    'date' => now()->setTimeFromTimeString($r['time']),
                    'name' => $r['name'],
                    'type' => $r['type'],
                    'description' => $r['desc'],
                    'order' => $order + 1,
                ]);
            }
        });
    }
}
