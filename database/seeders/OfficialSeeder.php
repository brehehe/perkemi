<?php

namespace Database\Seeders;

use App\Models\Contingent;
use App\Models\Official;
use Illuminate\Database\Seeder;

class OfficialSeeder extends Seeder
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

        $sampleOfficials = [
            [
                'name' => 'Sensei Ir. H. Bambang Soediro, M.M.',
                'role' => 'Manajer Tim',
                'gender' => 'male',
                'phone' => '0812-3456-7801',
                'email' => 'bambang.soediro@perkemi.org',
                'notes' => 'Penanggung jawab utama kontingen dan administrasi',
            ],
            [
                'name' => 'Sensei Agus Suryanto, S.Pd. (IV Dan)',
                'role' => 'Pelatih Kepala',
                'gender' => 'male',
                'phone' => '0813-9876-5402',
                'email' => 'agus.suryanto@kempo.id',
                'notes' => 'Pelatih kepala nomor Embu dan Randori',
            ],
            [
                'name' => 'Simpai Dian Puspitasari, S.Or. (III Dan)',
                'role' => 'Pelatih',
                'gender' => 'female',
                'phone' => '0817-6543-2103',
                'email' => 'dian.puspitasari@kempo.id',
                'notes' => 'Pelatih spesialisasi putri & pemanasan fisik',
            ],
            [
                'name' => 'Simpai Hendra Gunawan (II Dan)',
                'role' => 'Asisten Pelatih',
                'gender' => 'male',
                'phone' => '0852-1122-3304',
                'email' => 'hendra.gunawan@kempo.id',
                'notes' => 'Pendamping sudut atlet dan kelengkapan bertanding',
            ],
            [
                'name' => 'dr. Ratna Dewi Lestari, Sp.KO',
                'role' => 'Tim Medis',
                'gender' => 'female',
                'phone' => '0818-7788-9905',
                'email' => 'ratna.medis@klinikolahraga.com',
                'notes' => 'Dokter kontingen & penanganan fisioterapi cedera',
            ],
            [
                'name' => 'Ahmad Fauzi, S.Kom.',
                'role' => 'Ofisial Tim',
                'gender' => 'male',
                'phone' => '0878-3344-5506',
                'email' => 'fauzi.official@gmail.com',
                'notes' => 'Logistik perlengkapan, konsumsi dan berkas ID card',
            ],
        ];

        foreach ($contingents as $idx => $contingent) {
            // Assign manager name from contingent if available
            if ($contingent->manager_name) {
                Official::firstOrCreate(
                    [
                        'contingent_id' => $contingent->id,
                        'name' => $contingent->manager_name,
                    ],
                    [
                        'role' => 'Manajer Tim',
                        'gender' => 'male',
                        'phone' => $contingent->phone ?: '0812-3456-7890',
                        'email' => 'manajer.'.str()->slug($contingent->name).'@smart-perkemi.id',
                        'notes' => 'Manajer resmi terdaftar saat registrasi dojo',
                        'created_at' => now()->subDays(rand(10, 30)),
                    ]
                );
            }

            // Seed 3-4 additional officials per contingent
            $count = rand(3, 4);
            for ($i = 0; $i < $count; $i++) {
                $sample = $sampleOfficials[($idx + $i) % count($sampleOfficials)];

                Official::firstOrCreate(
                    [
                        'contingent_id' => $contingent->id,
                        'name' => $sample['name'].($i > 1 && $idx > 3 ? ' ('.($idx + 1).')' : ''),
                    ],
                    [
                        'role' => $sample['role'],
                        'gender' => $sample['gender'],
                        'phone' => $sample['phone'],
                        'email' => $sample['email'],
                        'notes' => $sample['notes'],
                        'id_card_number' => '35'.rand(10000000000000, 99999999999999),
                        'created_at' => now()->subDays(rand(1, 25)),
                    ]
                );
            }
        }
    }
}
