<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\Referee;
use App\Models\RefereeCourtAttendance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RefereeCourtAttendance>
 */
class RefereeCourtAttendanceFactory extends Factory
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
        $court = EventCourt::query()->create([
            'event_id' => $event->id,
            'name' => 'Court '.fake()->unique()->numberBetween(1, 999),
            'order' => 1,
            'is_active' => true,
        ]);
        $referee = Referee::query()->create([
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'is_active' => true,
        ]);

        return [
            'event_id' => $event->id,
            'event_court_id' => $court->id,
            'referee_id' => $referee->id,
            'attendance_date' => now()->toDateString(),
            'checked_in_at' => now(),
            'method' => 'qr',
        ];
    }
}
