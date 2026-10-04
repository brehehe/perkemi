<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('all registration and tournament menus keep an explicitly selected concurrent event', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $firstEvent = Event::create([
        'name' => 'Event Bersamaan Surabaya',
        'slug' => 'event-bersamaan-surabaya',
        'venue' => 'GOR Surabaya',
        'city' => 'Surabaya',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'status' => 'open_registration',
        'is_active' => true,
    ]);
    $selectedEvent = Event::create([
        'name' => 'Event Bersamaan Malang',
        'slug' => 'event-bersamaan-malang',
        'venue' => 'GOR Malang',
        'city' => 'Malang',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'status' => 'ongoing',
        'is_active' => true,
    ]);

    $firstContingent = Contingent::create([
        'event_id' => $firstEvent->id,
        'user_id' => $admin->id,
        'name' => 'Kontingen Surabaya',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Surabaya',
        'phone' => '081111111111',
    ]);
    $selectedContingent = Contingent::create([
        'event_id' => $selectedEvent->id,
        'user_id' => $admin->id,
        'name' => 'Kontingen Malang',
        'city' => 'Malang',
        'manager_name' => 'Manajer Malang',
        'phone' => '082222222222',
    ]);

    Registration::create([
        'event_id' => $firstEvent->id,
        'contingent_id' => $firstContingent->id,
        'registration_number' => 'REG-SBY-001',
    ]);
    $selectedRegistration = Registration::create([
        'event_id' => $selectedEvent->id,
        'contingent_id' => $selectedContingent->id,
        'registration_number' => 'REG-MLG-001',
    ]);

    Athlete::create([
        'contingent_id' => $firstContingent->id,
        'name' => 'Atlet Surabaya',
        'gender' => 'male',
    ]);
    $selectedAthlete = Athlete::create([
        'contingent_id' => $selectedContingent->id,
        'name' => 'Atlet Malang',
        'gender' => 'female',
    ]);

    EventMatchCategory::create([
        'event_id' => $firstEvent->id,
        'name' => 'Embu Surabaya',
        'type' => 'embu',
        'gender' => 'mixed',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $selectedCategory = EventMatchCategory::create([
        'event_id' => $selectedEvent->id,
        'name' => 'Randori Malang',
        'type' => 'randori',
        'gender' => 'female',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);

    $query = '?event_id='.$selectedEvent->id;

    $this->actingAs($admin)->get('/admin/pendaftaran/registrasi'.$query)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registration/Index')
            ->where('activeEvent.id', $selectedEvent->id)
            ->has('eventOptions', 2)
            ->has('registrations.data', 1)
            ->where('registrations.data.0.id', $selectedRegistration->id));

    $this->get('/admin/pendaftaran/nomor-pertandingan'.$query)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registration/MatchGroups')
            ->where('activeEvent.id', $selectedEvent->id)
            ->has('eventOptions', 2)
            ->has('registrations', 1)
            ->where('registration.id', $selectedRegistration->id)
            ->has('categories', 1)
            ->where('categories.0.id', $selectedCategory->id));

    $this->get('/admin/pendaftaran/verifikasi'.$query)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registration/Verification')
            ->where('activeEvent.id', $selectedEvent->id)
            ->has('eventOptions', 2)
            ->has('athletes.data', 1)
            ->where('athletes.data.0.id', $selectedAthlete->id)
            ->has('matchCategories', 1)
            ->where('matchCategories.0.id', $selectedCategory->id));

    $this->get('/admin/pertandingan/drawing'.$query)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Drawing')
            ->where('activeEvent.id', $selectedEvent->id)
            ->has('events', 2)
            ->has('categories', 1)
            ->where('categories.0.id', $selectedCategory->id));

    $this->get('/admin/pertandingan/merge'.$query)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Merge')
            ->where('activeEvent.id', $selectedEvent->id)
            ->has('events', 2)
            ->has('categories', 1)
            ->where('categories.0.id', $selectedCategory->id));

    $this->get('/admin/master/event/detail'.$query)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Event/Detail')
            ->where('event.id', $selectedEvent->id)
            ->has('allEvents', 2));
});
