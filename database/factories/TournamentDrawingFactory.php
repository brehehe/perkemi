<?php

namespace Database\Factories;

use App\Models\TournamentDrawing;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TournamentDrawing>
 */
class TournamentDrawingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'status' => 'generated',
            'bracket_type' => fake()->randomElement(['single_elimination', 'double_elimination', 'embu_direct_final']),
            'participant_count' => fake()->numberBetween(3, 16),
            'contingent_count' => fake()->numberBetween(3, 8),
            'skip_reason' => null,
            'generated_at' => now(),
            'published_at' => null,
        ];
    }
}
