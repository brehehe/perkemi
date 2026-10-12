<?php

namespace Database\Factories;

use App\Models\EmbuScore;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmbuScore>
 */
class EmbuScoreFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tiebreak_round' => 0,
            'judge_scores' => [80, 81, 82, 83, 84],
            'duration_seconds' => 100,
            'time_penalty' => 0,
            'middle_score' => 246,
            'final_score' => 246,
            'status' => 'verified',
            'verified_at' => now(),
        ];
    }
}
