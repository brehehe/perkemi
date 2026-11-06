<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\RefereeCheckInCode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RefereeCheckInCode>
 */
class RefereeCheckInCodeFactory extends Factory
{
    protected $model = RefereeCheckInCode::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => (string) fake()->unique()->numberBetween(100000, 999999),
            'type' => RefereeCheckInCode::TypeEvent,
            'event_id' => Event::factory(),
            'event_court_id' => null,
            'role' => null,
            'target_url' => fake()->url(),
            'expires_at' => now()->addDay(),
        ];
    }
}
