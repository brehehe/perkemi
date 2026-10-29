<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Role;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
});

test('admin can toggle training mode for an event', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Wilayah Simulasi 2026',
        'slug' => 'kejuaraan-wilayah-simulasi-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'is_active' => true,
        'is_training_mode' => false,
    ]);

    // Enable training mode
    $response = $this->actingAs($admin)
        ->post(route('admin.simulation.toggle', ['event_id' => $event->id]), [
            'enabled' => true,
        ]);

    $response->assertSessionHas('success');
    expect($event->fresh()->is_training_mode)->toBeTrue();

    // Disable training mode
    $response2 = $this->actingAs($admin)
        ->post(route('admin.simulation.toggle', ['event_id' => $event->id]), [
            'enabled' => false,
        ]);

    $response2->assertSessionHas('success');
    expect($event->fresh()->is_training_mode)->toBeFalse();
});

test('admin can seed realistic simulation matches in training mode', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Wilayah Simulasi 2026',
        'slug' => 'kejuaraan-wilayah-simulasi-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'is_active' => true,
        'is_training_mode' => true,
    ]);

    EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Tatami 1',
        'court_number' => 1,
        'is_active' => true,
    ]);

    EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra Kelas A',
        'type' => 'randori',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)
        ->post(route('admin.simulation.seed', ['event_id' => $event->id]));

    $response->assertSessionHas('success');

    $simulatedMatch = TournamentMatch::query()
        ->where('event_id', $event->id)
        ->where('metadata->is_simulated', true)
        ->first();

    expect($simulatedMatch)->not->toBeNull()
        ->and($simulatedMatch->status)->toBe('in_progress');
});

test('admin can reset all simulation data without residue', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Wilayah Simulasi 2026',
        'slug' => 'kejuaraan-wilayah-simulasi-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'is_active' => true,
        'is_training_mode' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Tatami 1',
        'court_number' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra Kelas A',
        'type' => 'randori',
        'gender' => 'male',
        'is_active' => true,
    ]);

    // Seed simulation match first
    $this->actingAs($admin)
        ->post(route('admin.simulation.seed', ['event_id' => $event->id]));

    expect(TournamentMatch::where('event_id', $event->id)->count())->toBeGreaterThan(0);

    // Now reset simulation data
    $response = $this->actingAs($admin)
        ->post(route('admin.simulation.reset', ['event_id' => $event->id]));

    $response->assertSessionHas('success');

    // Confirm no matches remain in the event
    expect(TournamentMatch::where('event_id', $event->id)->count())->toBe(0);
});
