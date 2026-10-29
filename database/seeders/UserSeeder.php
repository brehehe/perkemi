<?php

namespace Database\Seeders;

use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
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

        $events = Event::all();
        if ($events->isNotEmpty()) {
            foreach ($events as $event) {
                // Attach Panitera
                $panitera = User::where('email', 'panitera@smart-perkemi.id')->first();
                if ($panitera) {
                    $event->users()->syncWithoutDetaching([$panitera->id => ['access_role' => Event::AccessRoleStaff]]);
                    $clerk = Clerk::firstOrCreate(
                        ['email' => $panitera->email],
                        ['name' => $panitera->name, 'phone' => $panitera->phone ?? '081234567890', 'is_active' => true]
                    );
                    $event->clerks()->syncWithoutDetaching([$clerk->id => ['role' => 'clerk']]);
                    $court = $event->courts()->first();
                    if ($court) {
                        EventCourtAssignment::firstOrCreate(
                            ['event_court_id' => $court->id, 'staff_type' => 'clerk', 'staff_id' => $clerk->id],
                            ['role' => 'clerk']
                        );
                    }
                }

                // Attach Wasit
                $wasit = User::where('email', 'wasit@smart-perkemi.id')->first();
                if ($wasit) {
                    $event->users()->syncWithoutDetaching([$wasit->id => ['access_role' => Event::AccessRoleStaff]]);
                    $referee = Referee::firstOrCreate(
                        ['email' => $wasit->email],
                        [
                            'user_id' => $wasit->id,
                            'name' => $wasit->name,
                            'phone' => '081234567891',
                            'license_number' => 'PB-WST-001',
                            'certification_level' => 'Nasional A',
                            'dan_grade' => 'IV Dan',
                            'region' => 'Jawa Timur',
                            'is_active' => true,
                        ]
                    );
                    $event->referees()->syncWithoutDetaching([$referee->id => ['role' => 'chief']]);
                }

                // Attach other operational staff
                foreach (['pendaftaran@smart-perkemi.id', 'pertandingan@smart-perkemi.id', 'arbitrase@smart-perkemi.id'] as $staffEmail) {
                    $staffUser = User::where('email', $staffEmail)->first();
                    if ($staffUser) {
                        $event->users()->syncWithoutDetaching([$staffUser->id => ['access_role' => Event::AccessRoleStaff]]);
                    }
                }
            }
        }
    }
}
