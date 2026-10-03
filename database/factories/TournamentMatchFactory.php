<?php

namespace Database\Factories;

use App\Models\TournamentMatch;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TournamentMatch>
 */
class TournamentMatchFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'phase' => 'preliminary',
            'round_label' => 'Babak 1',
            'pool' => null,
            'match_sequence' => fake()->unique()->numberBetween(1, 1000),
            'bracket_position' => fake()->numberBetween(1, 32),
            'red_label' => fake()->name(),
            'blue_label' => fake()->name(),
            'status' => 'pending',
            'is_bye' => false,
            'metadata' => [],
        ];
    }
}
