<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Permissions list
        $permissions = [
            'view dashboard',
            'manage registrations',
            'verify registrations',
            'manage matches',
            'drawing matches',
            'score matches',
            'manage referees',
            'view reports',
            'export reports',
            'manage master data',
            'manage users',
            'contingent portal',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Roles definition
        $roles = [
            'Super Admin' => $permissions,
            'Admin' => [
                'view dashboard',
                'manage registrations',
                'verify registrations',
                'manage matches',
                'drawing matches',
                'manage referees',
                'view reports',
                'export reports',
                'manage master data',
            ],
            'Penanggung Jawab Event' => [
                'view dashboard',
                'manage registrations',
                'verify registrations',
                'manage matches',
                'drawing matches',
                'manage referees',
                'view reports',
                'export reports',
                'manage master data',
            ],
            'Pendaftaran' => [
                'view dashboard',
                'manage registrations',
                'verify registrations',
                'view reports',
            ],
            'Pertandingan' => [
                'view dashboard',
                'manage matches',
                'drawing matches',
                'view reports',
            ],
            'Koordinator Lapangan' => [
                'view dashboard',
                'manage matches',
                'score matches',
                'view reports',
            ],
            'Arbitrase' => [
                'view dashboard',
                'manage referees',
                'view reports',
                'export reports',
            ],
            'Perwasitan' => [
                'view dashboard',
                'manage referees',
                'score matches',
                'view reports',
            ],
            'Wasit' => [
                'score matches',
                'view reports',
            ],
            'Panitera' => [
                'score matches',
                'manage matches',
            ],
            'Court' => [
                'score matches',
            ],
            'kontingen' => [
                'contingent portal',
            ],
            'Contingent' => [
                'contingent portal',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $role->syncPermissions($rolePermissions);
        }
    }
}
