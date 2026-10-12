<?php

namespace Database\Factories;

use App\Models\RandoriScore;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RandoriScore>
 */
class RandoriScoreFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'aka_breakdown' => ['mujoken' => 0, 'ippon' => 1, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0],
            'shiro_breakdown' => ['mujoken' => 0, 'ippon' => 0, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0],
            'aka_total' => 15,
            'shiro_total' => 5,
            'winner_corner' => 'aka',
            'status' => 'verified',
            'verified_at' => now(),
        ];
    }
}
