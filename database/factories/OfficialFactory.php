<?php

namespace Database\Factories;

use App\Models\Contingent;
use App\Models\Official;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Official>
 */
class OfficialFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Official::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $roles = [
            'Manajer Tim',
            'Pelatih Kepala',
            'Pelatih',
            'Asisten Pelatih',
            'Ofisial Tim',
            'Tim Medis',
        ];

        return [
            'contingent_id' => Contingent::factory(),
            'name' => fake()->name(),
            'role' => fake()->randomElement($roles),
            'gender' => fake()->randomElement(['male', 'female']),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'id_card_number' => fake()->numerify('35#############'),
            'notes' => fake()->sentence(),
        ];
    }
}
