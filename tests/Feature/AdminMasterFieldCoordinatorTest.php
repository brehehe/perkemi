<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can manage master field coordinator data', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/admin/master/field-coordinator', ['name' => 'Andi Pratama', 'coordinator_number' => 'KOR-001', 'region' => 'Jawa Timur', 'is_active' => true])->assertRedirect();
    $coordinator = FieldCoordinator::query()->firstOrFail();
    $this->assertDatabaseHas('field_coordinators', ['id' => $coordinator->id, 'coordinator_number' => 'KOR-001']);
    $this->actingAs($user)->get('/admin/master/field-coordinator')->assertInertia(fn (Assert $page) => $page->component('Admin/Master/FieldCoordinator/Index')->has('fieldCoordinators.data', 1));
});

test('admin can assign a field coordinator to an event', function () {
    $user = User::factory()->create();
    Role::findOrCreate('Koordinator Lapangan', 'web');
    $coordinatorLogin = User::factory()->create(['email' => 'andi.koordinator@example.test']);
    $coordinatorLogin->assignRole('Koordinator Lapangan');
    $coordinator = FieldCoordinator::create(['name' => 'Andi Pratama', 'email' => $coordinatorLogin->email, 'is_active' => true]);
    $event = Event::create(['name' => 'Kejurda Koordinator 2026', 'slug' => 'kejurda-koordinator-2026', 'venue' => 'GOR Kertajaya', 'city' => 'Surabaya', 'start_date' => '2026-10-01', 'end_date' => '2026-10-03']);
    $this->actingAs($user)->post("/admin/master/event/{$event->id}/field-coordinator", ['field_coordinator_id' => $coordinator->id, 'assignment_area' => 'court'])->assertRedirect();
    $this->assertDatabaseHas('event_field_coordinator', ['event_id' => $event->id, 'field_coordinator_id' => $coordinator->id, 'assignment_area' => 'court']);
    $this->assertDatabaseHas('event_user', ['event_id' => $event->id, 'user_id' => $coordinatorLogin->id, 'access_role' => Event::AccessRoleStaff]);
});

test('admin can update event field coordinator and sync user account', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('Koordinator Lapangan', 'web');

    $event = Event::create([
        'name' => 'Kejurda Update Coordinator 2026',
        'slug' => 'kejurda-update-coord-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $coordinator = FieldCoordinator::create([
        'name' => 'Sensei Doni',
        'coordinator_number' => 'KOR-100',
        'region' => 'Jawa Timur',
        'phone' => '081234567890',
        'email' => 'doni.initial@perkemi.test',
        'is_active' => true,
    ]);

    $event->fieldCoordinators()->attach($coordinator->id, ['assignment_area' => 'court']);

    $response = $this->actingAs($admin)->put("/admin/master/event/{$event->id}/field-coordinator/{$coordinator->id}", [
        'name' => 'Sensei Doni Pratama',
        'coordinator_number' => 'KOR-101',
        'region' => 'Jawa Timur & Bali',
        'phone' => '081299998888',
        'email' => 'doni.updated@perkemi.test',
        'password' => 'newPassword123!',
        'password_confirmation' => 'newPassword123!',
        'assignment_area' => 'chief',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('field_coordinators', [
        'id' => $coordinator->id,
        'name' => 'Sensei Doni Pratama',
        'coordinator_number' => 'KOR-101',
        'email' => 'doni.updated@perkemi.test',
    ]);

    $this->assertDatabaseHas('event_field_coordinator', [
        'event_id' => $event->id,
        'field_coordinator_id' => $coordinator->id,
        'assignment_area' => 'chief',
    ]);

    $createdUser = User::query()->where('email', 'doni.updated@perkemi.test')->first();
    expect($createdUser)->not->toBeNull();
    expect($createdUser->hasRole('Koordinator Lapangan'))->toBeTrue();
    $this->assertDatabaseHas('event_user', [
        'event_id' => $event->id,
        'user_id' => $createdUser->id,
        'access_role' => Event::AccessRoleStaff,
    ]);
});

test('admin can transfer referee to field coordinator and optionally detach source', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('Wasit', 'web');
    Role::findOrCreate('Koordinator Lapangan', 'web');

    $event = Event::create([
        'name' => 'Kejurda Transfer Referee 2026',
        'slug' => 'kejurda-transfer-referee-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $refereeUser = User::factory()->create(['email' => 'wasit.budi@perkemi.test']);
    $refereeUser->assignRole('Wasit');

    $referee = Referee::create([
        'user_id' => $refereeUser->id,
        'name' => 'Budi Santoso',
        'license_number' => 'LIC-777',
        'dan_grade' => 'III DAN',
        'region' => 'Jawa Tengah',
        'phone' => '081233334444',
        'email' => 'wasit.budi@perkemi.test',
        'is_active' => true,
    ]);

    $event->referees()->attach($referee->id, ['role' => 'chief']);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'court_number' => 1,
        'name' => 'Court 1',
        'is_active' => true,
    ]);

    EventCourtAssignment::create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => 'chief',
    ]);

    // Transfer with detach_source = true
    $response = $this->actingAs($admin)->post("/admin/master/event/{$event->id}/referee/{$referee->id}/transfer-to-coordinator", [
        'assignment_area' => 'court',
        'detach_source' => true,
    ]);

    $response->assertRedirect();

    // Check referee detached from event and court assignment deleted
    $this->assertDatabaseMissing('event_referee', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
    ]);
    $this->assertDatabaseMissing('event_court_assignments', [
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
    ]);

    // Check coordinator created and assigned
    $coordinator = FieldCoordinator::query()->where('email', 'wasit.budi@perkemi.test')->first();
    expect($coordinator)->not->toBeNull();
    expect($coordinator->name)->toBe('Budi Santoso');
    $this->assertDatabaseHas('event_field_coordinator', [
        'event_id' => $event->id,
        'field_coordinator_id' => $coordinator->id,
        'assignment_area' => 'court',
    ]);

    // User should have Koordinator Lapangan role
    $refereeUser->refresh();
    expect($refereeUser->hasRole('Koordinator Lapangan'))->toBeTrue();
    $this->assertDatabaseHas('event_user', [
        'event_id' => $event->id,
        'user_id' => $refereeUser->id,
        'access_role' => Event::AccessRoleStaff,
    ]);
});

test('admin can transfer field coordinator to referee and optionally detach source', function () {
    $admin = User::factory()->create();
    Role::findOrCreate('Wasit', 'web');
    Role::findOrCreate('Koordinator Lapangan', 'web');

    $event = Event::create([
        'name' => 'Kejurda Transfer Coord 2026',
        'slug' => 'kejurda-transfer-coord-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $coordUser = User::factory()->create(['email' => 'coord.dewi@perkemi.test']);
    $coordUser->assignRole('Koordinator Lapangan');

    $coordinator = FieldCoordinator::create([
        'name' => 'Dewi Lestari',
        'coordinator_number' => 'KOR-888',
        'region' => 'DKI Jakarta',
        'phone' => '081255556666',
        'email' => 'coord.dewi@perkemi.test',
        'is_active' => true,
    ]);

    $event->fieldCoordinators()->attach($coordinator->id, ['assignment_area' => 'court']);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'court_number' => 2,
        'name' => 'Court 2',
        'is_active' => true,
    ]);

    EventCourtAssignment::create([
        'event_court_id' => $court->id,
        'staff_type' => 'field_coordinator',
        'staff_id' => $coordinator->id,
        'role' => 'court',
    ]);

    // Transfer with detach_source = true
    $response = $this->actingAs($admin)->post("/admin/master/event/{$event->id}/field-coordinator/{$coordinator->id}/transfer-to-referee", [
        'role' => 'referee',
        'dan_grade' => 'II DAN',
        'certification_level' => 'Wasit Daerah',
        'license_number' => 'LIC-DEWI-01',
        'detach_source' => true,
    ]);

    $response->assertRedirect();

    // Check coordinator detached from event and court assignment deleted
    $this->assertDatabaseMissing('event_field_coordinator', [
        'event_id' => $event->id,
        'field_coordinator_id' => $coordinator->id,
    ]);
    $this->assertDatabaseMissing('event_court_assignments', [
        'event_court_id' => $court->id,
        'staff_type' => 'field_coordinator',
        'staff_id' => $coordinator->id,
    ]);

    // Check referee created and assigned
    $referee = Referee::query()->where('email', 'coord.dewi@perkemi.test')->first();
    expect($referee)->not->toBeNull();
    expect($referee->name)->toBe('Dewi Lestari');
    expect($referee->dan_grade)->toBe('II DAN');
    expect($referee->license_number)->toBe('LIC-DEWI-01');

    $this->assertDatabaseHas('event_referee', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'role' => 'referee',
    ]);

    // User should have Wasit role
    $coordUser->refresh();
    expect($coordUser->hasRole('Wasit'))->toBeTrue();
    $this->assertDatabaseHas('event_user', [
        'event_id' => $event->id,
        'user_id' => $coordUser->id,
        'access_role' => Event::AccessRoleStaff,
    ]);
});
