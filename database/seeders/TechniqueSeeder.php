<?php

namespace Database\Seeders;

use App\Models\Technique;
use Illuminate\Database\Seeder;

class TechniqueSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'TENCHIKEN DAISAN',
            'Harai uke geri ren han ko',
            'SODE DORI',
            'tsubame gaeshi',
            'tsuki ten san',
            'GIWAKEN DAICHI',
        ] as $index => $name) {
            Technique::firstOrCreate(['name' => $name], [
                'category' => 'Embu',
                'order' => $index + 1,
                'is_active' => true,
            ]);
        }
    }
}
