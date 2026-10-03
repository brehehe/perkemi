<?php

namespace Database\Seeders;

use App\Models\Contingent;
use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ContingentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $primaryEvent = Event::query()->where('slug', 'kejurnas-shorinji-kempo-surabaya-2026')->first();
        if (! $primaryEvent) {
            return;
        }

        $contingents = [
            [
                'name' => 'Dojo Garuda Sakti Surabaya',
                'city' => 'Kota Surabaya',
                'manager_name' => 'Sensei Budi Santoso',
                'phone' => '0812-3456-7890',
                'email' => 'garuda.surabaya@perkemi.id',
                'address' => 'Jl. Pemuda No. 45, Embong Kaliasin, Genteng, Kota Surabaya',
                'status' => 'verified',
            ],
            [
                'name' => 'Dojo Macan Putih Malang',
                'city' => 'Kota Malang',
                'manager_name' => 'Sensei Haryono',
                'phone' => '0812-3456-7891',
                'email' => 'macan.malang@perkemi.id',
                'address' => 'Jl. Ijen No. 22, Klojen, Kota Malang',
                'status' => 'verified',
            ],
            [
                'name' => 'Dojo Rajawali Sidoarjo',
                'city' => 'Kabupaten Sidoarjo',
                'manager_name' => 'Sensei Dewi Anggraini',
                'phone' => '0812-3456-7892',
                'email' => 'rajawali.sidoarjo@perkemi.id',
                'address' => 'Jl. Pahlawan No. 18, Sidoarjo',
                'status' => 'verified',
            ],
            [
                'name' => 'Dojo Naga Emas Gresik',
                'city' => 'Kabupaten Gresik',
                'manager_name' => 'Sensei Agus Setiawan',
                'phone' => '0812-3456-7893',
                'email' => 'naga.gresik@perkemi.id',
                'address' => 'Jl. Veteran No. 10, Kebomas, Gresik',
                'status' => 'verified',
            ],
            [
                'name' => 'Dojo Brawijaya Pasuruan',
                'city' => 'Kota Pasuruan',
                'manager_name' => 'Sensei Bambang Wahyudi',
                'phone' => '0812-3456-7894',
                'email' => 'brawijaya.pasuruan@perkemi.id',
                'address' => 'Jl. Panglima Sudirman No. 50, Pasuruan',
                'status' => 'verified',
            ],
            [
                'name' => 'Dojo Satria Majapahit Mojokerto',
                'city' => 'Kabupaten Mojokerto',
                'manager_name' => 'Sensei Hendra Gunawan',
                'phone' => '0812-3456-7895',
                'email' => 'satria.mojokerto@perkemi.id',
                'address' => 'Jl. Hayam Wuruk No. 8, Mojokerto',
                'status' => 'pending',
            ],
            [
                'name' => 'Dojo Perkemi Jember',
                'city' => 'Kabupaten Jember',
                'manager_name' => 'Sensei Anita Rahayu',
                'phone' => '0812-3456-7896',
                'email' => 'perkemi.jember@perkemi.id',
                'address' => 'Jl. Kalimantan No. 37, Sumbersari, Jember',
                'status' => 'verified',
            ],
            [
                'name' => 'Dojo Mahameru Banyuwangi',
                'city' => 'Kabupaten Banyuwangi',
                'manager_name' => 'Sensei Rudi Hartono',
                'phone' => '0812-3456-7897',
                'email' => 'mahameru.bwi@perkemi.id',
                'address' => 'Jl. Ahmad Yani No. 100, Banyuwangi',
                'status' => 'verified',
            ],
            [
                'name' => 'Dojo Surya Kencana Kediri',
                'city' => 'Kota Kediri',
                'manager_name' => 'Sensei Tri Laksono',
                'phone' => '0812-3456-7898',
                'email' => 'surya.kediri@perkemi.id',
                'address' => 'Jl. Dhoho No. 64, Kota Kediri',
                'status' => 'pending',
            ],
            [
                'name' => 'Dojo Pandawa Madiun',
                'city' => 'Kota Madiun',
                'manager_name' => 'Sensei Eko Prasetyo',
                'phone' => '0812-3456-7899',
                'email' => 'pandawa.madiun@perkemi.id',
                'address' => 'Jl. Pahlawan No. 12, Kota Madiun',
                'status' => 'verified',
            ],
        ];

        foreach ($contingents as $c) {
            $user = User::firstOrCreate(
                ['email' => $c['email']],
                [
                    'name' => $c['manager_name'],
                    'password' => Hash::make('password'),
                ]
            );

            $user->syncRoles(['kontingen']);

            Contingent::firstOrCreate(
                ['event_id' => $primaryEvent->id, 'name' => $c['name']],
                [
                    'user_id' => $user->id,
                    'city' => $c['city'],
                    'manager_name' => $c['manager_name'],
                    'phone' => $c['phone'],
                    'email' => $c['email'],
                    'address' => $c['address'],
                    'status' => $c['status'],
                ]
            );
        }
    }
}
