<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Super Administrator Perkemi',
                'email' => 'admin@smart-perkemi.id',
                'password' => 'password',
                'role' => 'Super Admin',
            ],
            [
                'name' => 'Panitia Pendaftaran',
                'email' => 'pendaftaran@smart-perkemi.id',
                'password' => 'password',
                'role' => 'Pendaftaran',
            ],
            [
                'name' => 'Koordinator Pertandingan',
                'email' => 'pertandingan@smart-perkemi.id',
                'password' => 'password',
                'role' => 'Pertandingan',
            ],
            [
                'name' => 'Dewan Arbitrase Nasional',
                'email' => 'arbitrase@smart-perkemi.id',
                'password' => 'password',
                'role' => 'Arbitrase',
            ],
            [
                'name' => 'Sensei Wasit Utama',
                'email' => 'wasit@smart-perkemi.id',
                'password' => 'password',
                'role' => 'Wasit',
            ],
            [
                'name' => 'Petugas Panitera & Scoring',
                'email' => 'panitera@smart-perkemi.id',
                'password' => 'password',
                'role' => 'Panitera',
            ],
        ];

        foreach ($users as $u) {
            $user = User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make($u['password']),
                ]
            );

            $user->syncRoles([$u['role']]);
        }
    }
}
