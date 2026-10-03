<?php

namespace Database\Seeders;

use App\Models\Contingent;
use App\Models\TournamentResult;
use Illuminate\Database\Seeder;

class TournamentResultSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contingents = Contingent::all();

        if ($contingents->isEmpty()) {
            return;
        }

        $results = [
            // Emas (Rank 1)
            ['c_idx' => 0, 'rank' => 1, 'category' => 'Embu Berpasangan Kyu I Putra'],
            ['c_idx' => 0, 'rank' => 1, 'category' => 'Randori Dewasa 65kg Putra'],
            ['c_idx' => 0, 'rank' => 1, 'category' => 'Embu Tunggal Dan I Putra'],
            ['c_idx' => 1, 'rank' => 1, 'category' => 'Embu Beregu Campuran'],
            ['c_idx' => 1, 'rank' => 1, 'category' => 'Randori Dewasa 60kg Putra'],
            ['c_idx' => 2, 'rank' => 1, 'category' => 'Randori Remaja 50kg Putri'],
            ['c_idx' => 3, 'rank' => 1, 'category' => 'Embu Berpasangan Kyu II Putri'],
            ['c_idx' => 4, 'rank' => 1, 'category' => 'Randori Dewasa 70kg Putra'],

            // Perak (Rank 2)
            ['c_idx' => 0, 'rank' => 2, 'category' => 'Embu Berpasangan Kyu II Putra'],
            ['c_idx' => 1, 'rank' => 2, 'category' => 'Embu Berpasangan Yudansha Campuran'],
            ['c_idx' => 2, 'rank' => 2, 'category' => 'Randori Dewasa 65kg Putra'],
            ['c_idx' => 3, 'rank' => 2, 'category' => 'Randori Dewasa 55kg Putri'],
            ['c_idx' => 4, 'rank' => 2, 'category' => 'Embu Beregu Putra'],
            ['c_idx' => 5, 'rank' => 2, 'category' => 'Randori Remaja 45kg Putri'],
            ['c_idx' => 6, 'rank' => 2, 'category' => 'Randori Dewasa 60kg Putra'],

            // Perunggu (Rank 3 & 4)
            ['c_idx' => 0, 'rank' => 3, 'category' => 'Randori Dewasa 75kg Putra'],
            ['c_idx' => 1, 'rank' => 3, 'category' => 'Embu Tunggal Kyu I Putri'],
            ['c_idx' => 2, 'rank' => 3, 'category' => 'Embu Berpasangan Kyu I Putra'],
            ['c_idx' => 3, 'rank' => 3, 'category' => 'Randori Remaja 55kg Putra'],
            ['c_idx' => 4, 'rank' => 3, 'category' => 'Randori Dewasa 50kg Putri'],
            ['c_idx' => 5, 'rank' => 3, 'category' => 'Embu Berpasangan Kyu III Campuran'],
            ['c_idx' => 6, 'rank' => 3, 'category' => 'Embu Beregu Putri'],
            ['c_idx' => 7, 'rank' => 3, 'category' => 'Randori Dewasa 65kg Putra'],
            ['c_idx' => 2, 'rank' => 4, 'category' => 'Embu Berpasangan Yudansha'],
            ['c_idx' => 3, 'rank' => 4, 'category' => 'Randori Dewasa 70kg Putra'],
        ];

        foreach ($results as $item) {
            $contingent = $contingents[$item['c_idx'] % $contingents->count()];

            TournamentResult::firstOrCreate(
                [
                    'contingent_id' => $contingent->id,
                    'match_category' => $item['category'],
                    'rank' => $item['rank'],
                ],
                [
                    'contingent_name' => $contingent->name,
                ]
            );
        }
    }
}
