<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class,
            UserSeeder::class,
            EventSeeder::class,
            ContingentSeeder::class,
            AthleteSeeder::class,
            OfficialSeeder::class,
            RegistrationSeeder::class,
            TournamentResultSeeder::class,
            RundownSeeder::class,
            EventSettingsSeeder::class,
            KyuSeeder::class,
            TechniqueSeeder::class,
            RegistrationDemoSeeder::class,
            TournamentDrawingDummySeeder::class,
        ]);
    }
}
