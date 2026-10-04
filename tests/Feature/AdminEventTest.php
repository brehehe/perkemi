<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin master event index page can be rendered with complete props', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurnas Shorinji Kempo Antar Kota 2026',
        'slug' => 'kejurnas-shorinji-kempo-surabaya-2026',
        'edition' => 'Piala Walikota Surabaya Ke-X',
        'venue' => 'GOR Gelora Pancasila',
        'city' => 'Kota Surabaya',
        'start_date' => '2026-10-24',
        'end_date' => '2026-10-26',
        'fee_per_athlete' => 150000,
        'status' => 'open_registration',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get('/admin/master/event');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Master/Event/Index')
        ->has('events.data', 1)
        ->has('stats')
        ->where('stats.total_events', 1)
        ->where('stats.active_events', 1)
        ->has('activeEvent')
        ->where('activeEvent.name', 'Kejurnas Shorinji Kempo Antar Kota 2026')
        ->has('filters')
    );
});

test('admin can create a concurrent active event with the same dates', function () {
    $user = User::factory()->create();

    $existingEvent = Event::create([
        'name' => 'Event Aktif Bersamaan',
        'slug' => 'event-aktif-bersamaan',
        'venue' => 'GOR Pembanding',
        'city' => 'Kabupaten Malang',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'status' => 'open_registration',
        'is_active' => true,
    ]);

    $payload = [
        'name' => 'Kejurda Shorinji Kempo Malang 2026',
        'edition' => 'Piala Bupati Malang',
        'venue' => 'GOR Kanjuruhan',
        'city' => 'Kabupaten Malang',
        'province' => 'Jawa Timur',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'registration_start' => '2026-09-01',
        'registration_end' => '2026-10-30',
        'fee_per_athlete' => 125000,
        'fee_per_contingent' => 200000,
        'status' => 'open_registration',
        'is_active' => true,
        'organizer' => 'Pengkab Perkemi Malang',
        'contact_person' => 'Sensei Budi',
        'contact_phone' => '08123456789',
        'description' => 'Kejuaraan daerah se-Jawa Timur.',
    ];

    $response = $this->actingAs($user)->post('/admin/master/event', $payload);

    $response->assertRedirect(route('admin.master.event.index'));

    $this->assertDatabaseHas('events', [
        'name' => 'Kejurda Shorinji Kempo Malang 2026',
        'slug' => 'kejurda-shorinji-kempo-malang-2026',
        'city' => 'Kabupaten Malang',
        'is_active' => true,
    ]);
    expect($existingEvent->fresh()->is_active)->toBeTrue();
});

test('admin can create a free event and submitted fees are normalized to zero', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/admin/master/event', [
        'name' => 'Festival Kempo Gratis 2026',
        'venue' => 'GOR Merdeka',
        'city' => 'Malang',
        'start_date' => '2026-12-10',
        'end_date' => '2026-12-11',
        'is_paid' => false,
        'fee_per_athlete' => 150000,
        'fee_per_contingent' => 250000,
        'status' => 'open_registration',
        'is_active' => false,
    ]);

    $response->assertRedirect(route('admin.master.event.index'));
    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('events', [
        'name' => 'Festival Kempo Gratis 2026',
        'is_paid' => false,
        'fee_per_athlete' => 0,
        'fee_per_contingent' => 0,
    ]);
});

test('admin can update an existing event', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Event Awal',
        'slug' => 'event-awal',
        'venue' => 'GOR A',
        'city' => 'Kota A',
        'start_date' => '2026-05-01',
        'end_date' => '2026-05-03',
        'fee_per_athlete' => 100000,
        'status' => 'draft',
        'is_active' => false,
    ]);

    $payload = [
        'name' => 'Event Diperbarui',
        'venue' => 'GOR Baru',
        'city' => 'Kota Baru',
        'start_date' => '2026-06-01',
        'end_date' => '2026-06-03',
        'fee_per_athlete' => 150000,
        'status' => 'open_registration',
        'is_active' => false,
    ];

    $response = $this->actingAs($user)->put("/admin/master/event/{$event->id}", $payload);

    $response->assertRedirect(route('admin.master.event.index'));

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'name' => 'Event Diperbarui',
        'venue' => 'GOR Baru',
        'status' => 'open_registration',
    ]);
});

test('admin can activate an event without deactivating another event on the same dates', function () {
    $user = User::factory()->create();

    $event1 = Event::create([
        'name' => 'Event 1',
        'slug' => 'event-1',
        'venue' => 'GOR 1',
        'city' => 'Kota 1',
        'start_date' => '2026-05-01',
        'end_date' => '2026-05-03',
        'fee_per_athlete' => 100000,
        'status' => 'completed',
        'is_active' => true,
    ]);

    $event2 = Event::create([
        'name' => 'Event 2',
        'slug' => 'event-2',
        'venue' => 'GOR 2',
        'city' => 'Kota 2',
        'start_date' => '2026-05-01',
        'end_date' => '2026-05-03',
        'fee_per_athlete' => 150000,
        'status' => 'open_registration',
        'is_active' => false,
    ]);

    $response = $this->actingAs($user)->post("/admin/master/event/{$event2->id}/activate");

    $response->assertRedirect(route('admin.master.event.index'));

    expect($event1->fresh()->is_active)->toBeTrue();
    expect($event2->fresh()->is_active)->toBeTrue();
});

test('admin can soft delete an event', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Event Hapus',
        'slug' => 'event-hapus',
        'venue' => 'GOR Hapus',
        'city' => 'Kota Hapus',
        'start_date' => '2026-05-01',
        'end_date' => '2026-05-03',
        'fee_per_athlete' => 100000,
        'status' => 'draft',
        'is_active' => false,
    ]);

    $response = $this->actingAs($user)->delete("/admin/master/event/{$event->id}");

    $response->assertRedirect(route('admin.master.event.index'));

    $this->assertSoftDeleted('events', [
        'id' => $event->id,
    ]);
});
