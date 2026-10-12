<?php

namespace Database\Factories;

use App\Models\RefereeCourtAssignmentHistory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<RefereeCourtAssignmentHistory>
 */
class RefereeCourtAssignmentHistoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'event_id' => fake()->uuid(),
            'event_court_id' => fake()->uuid(),
            'referee_id' => fake()->uuid(),
            'changed_by_user_id' => null,
            'batch_id' => (string) Str::uuid(),
            'action' => RefereeCourtAssignmentHistory::ActionAssigned,
            'role' => 'chief',
            'occurred_at' => now(),
        ];
    }
}
