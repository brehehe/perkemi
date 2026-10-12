<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RefereeAttendance>
 */
class RefereeAttendanceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $event = Event::query()->create([
            'name' => fake()->unique()->sentence(3),
            'slug' => fake()->unique()->slug(),
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
        ]);
        $referee = Referee::query()->create([
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'is_active' => true,
        ]);

        return [
            'event_id' => $event->id,
            'referee_id' => $referee->id,
            'attendance_date' => now()->toDateString(),
            'is_present' => true,
            'checked_in_at' => now(),
            'method' => 'qr',
        ];
    }
}
