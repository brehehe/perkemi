<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('event court has default var url based on its order', function () {
    $event = Event::create([
        'name' => 'Event VAR Test',
        'slug' => 'event-var-test',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court1 = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $court2 = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);

    expect($court1->var_url)->toBe('https://var.smart-perkemi.id/kempo/demo/live_stream.html')
        ->and($court2->var_url)->toBe('https://var.smart-perkemi.id/kempo/demo/live_stream.html')
        ->and($court1->raw_var_url)->toBeNull();
});

test('panitera or admin can update and customize court var url', function () {
    $event = Event::create([
        'name' => 'Event VAR Update',
        'slug' => 'event-var-update',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Arena Utama',
        'order' => 1,
        'is_active' => true,
    ]);

    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    $response = $this->actingAs($user)
        ->put("/admin/panitera/scoring/courts/{$court->id}/var-url", [
            'event_id' => $event->id,
            'var_url' => 'https://custom-var.domain.id/stream/court-1',
        ]);

    $response->assertSessionHasNoErrors();
    $court->refresh();

    expect($court->raw_var_url)->toBe('https://custom-var.domain.id/stream/court-1')
        ->and($court->var_url)->toBe('https://custom-var.domain.id/stream/court-1');
});

test('panitera can reset custom var url back to null/default', function () {
    $event = Event::create([
        'name' => 'Event VAR Reset',
        'slug' => 'event-var-reset',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 2',
        'order' => 2,
        'var_url' => 'https://custom-stream.org/live',
        'is_active' => true,
    ]);

    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    $response = $this->actingAs($user)
        ->put("/admin/panitera/scoring/courts/{$court->id}/var-url", [
            'event_id' => $event->id,
            'var_url' => '',
        ]);

    $response->assertSessionHasNoErrors();
    $court->refresh();

    expect($court->raw_var_url)->toBeNull()
        ->and($court->var_url)->toBe('https://var.smart-perkemi.id/kempo/demo/live_stream.html');
});

test('court var url can be updated even without explicit event_id in payload', function () {
    $event = Event::create([
        'name' => 'Event VAR No Param',
        'slug' => 'event-var-no-param',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Tanpa Event Param',
        'order' => 1,
        'is_active' => true,
    ]);

    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    $response = $this->actingAs($user)
        ->putJson("/admin/panitera/scoring/courts/{$court->id}/var-url", [
            'var_url' => 'https://stream.example.com/court-live',
        ]);

    $response->assertOk();
    expect($response->json('success'))->toBeTrue();
    $court->refresh();
    expect($court->raw_var_url)->toBe('https://stream.example.com/court-live');
});

test('panitera can toggle is_var_enabled on and off', function () {
    $event = Event::create([
        'name' => 'Event VAR Toggle',
        'slug' => 'event-var-toggle',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
        'is_var_enabled' => true,
    ]);

    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    // Turn OFF VAR
    $response = $this->actingAs($user)
        ->putJson("/admin/panitera/scoring/courts/{$court->id}/var-url", [
            'event_id' => $event->id,
            'is_var_enabled' => false,
        ]);

    $response->assertOk();
    expect($response->json('is_var_enabled'))->toBeFalse();
    $court->refresh();
    expect($court->is_var_enabled)->toBeFalse();

    // Turn ON VAR again
    $response = $this->actingAs($user)
        ->putJson("/admin/panitera/scoring/courts/{$court->id}/var-url", [
            'event_id' => $event->id,
            'is_var_enabled' => true,
        ]);

    $response->assertOk();
    expect($response->json('is_var_enabled'))->toBeTrue();
    $court->refresh();
    expect($court->is_var_enabled)->toBeTrue();
});
