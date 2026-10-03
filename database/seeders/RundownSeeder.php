<?php

namespace Database\Seeders;

use App\Models\Rundown;
use Illuminate\Database\Seeder;

class RundownSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $schedules = [
            [
                'time' => '07:30',
                'name' => 'Daftar Ulang & Verifikasi Fisik Kenshi',
                'type' => 'Administrasi',
                'description' => 'Pemeriksaan ID Card, Buku Anggota PERKEMI & Surat Dokter',
                'order' => 1,
            ],
            [
                'time' => '08:30',
                'name' => 'Upacara Pembukaan & Defile Kontingen',
                'type' => 'Seremonial',
                'description' => 'Dihadiri Walikota Surabaya, Pengprov PERKEMI & KONI',
                'order' => 2,
            ],
            [
                'time' => '09:45',
                'name' => 'Babak Penyisihan Embu Berpasangan & Beregu',
                'type' => 'Embu',
                'description' => 'Court 1 (Kyu Kenshi) & Court 2 (Yudansha)',
                'order' => 3,
            ],
            [
                'time' => '13:00',
                'name' => 'Babak Penyisihan Randori Putra & Putri',
                'type' => 'Randori',
                'description' => 'Kelas Remaja & Dewasa di Court 1, 2, dan 3',
                'order' => 4,
            ],
            [
                'time' => '16:00',
                'name' => 'Babak Semifinal & Final Embu',
                'type' => 'Final',
                'description' => 'Perebutan Medali Emas, Perak, dan Perunggu',
                'order' => 5,
            ],
            [
                'time' => '18:30',
                'name' => 'Upacara Penghormatan Pemenang (UPP) Sesi I',
                'type' => 'Penganugerahan',
                'description' => 'Penyerahan Medali Kategori Embu & Piagam Penghargaan',
                'order' => 6,
            ],
        ];

        foreach ($schedules as $s) {
            Rundown::firstOrCreate(
                [
                    'name' => $s['name'],
                    'order' => $s['order'],
                ],
                [
                    'date' => now()->setTimeFromTimeString($s['time']),
                    'type' => $s['type'],
                    'description' => $s['description'],
                ]
            );
        }
    }
}
