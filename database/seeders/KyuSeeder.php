<?php

namespace Database\Seeders;

use App\Models\Kyu;
use Illuminate\Database\Seeder;

class KyuSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'Kyu 8', 'Kyu 7', 'Kyu 6', 'Kyu 5', 'Kyu 4', 'Kyu 3', 'Kyu 2', 'Kyu 1',
            'Dan I', 'Dan 1', 'Dan II', 'Dan III', 'Dan IV', 'Dan V',
        ] as $index => $name) {
            Kyu::firstOrCreate(['name' => $name], [
                'order' => $index < 9 ? $index + 1 : ($index === 9 ? 9 : $index),
                'is_active' => true,
            ]);
        }
    }
}
