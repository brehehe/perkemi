<?php

use App\Enums\EventStatus;
use App\Models\Contingent;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guest can access public event landing page via slug', function () {
    $event = Event::create([
        'name' => 'Kejurda Shorinji Kempo Jatim 2026',
        'slug' => 'kejurda-shorinji-kempo-jatim-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'status' => EventStatus::OpenRegistration,
        'is_active' => true,
    ]);

    $ageCat = EventAgeCategory::create([
        'event_id' => $event->id,
        'name' => 'Remaja A',
        'min_age' => 11,
        'max_age' => 13,
        'fee' => 500000,
        'order' => 1,
        'is_active' => true,
    ]);

    EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'location' => 'Tatami Utama',
        'order' => 1,
        'is_active' => true,
    ]);

    EventMatchCategory::create([
        'event_id' => $event->id,
        'age_category_id' => $ageCat->id,
        'name' => 'Randori Putra Remaja A 50kg',
        'type' => 'randori',
        'gender' => 'male',
        'order' => 1,
        'is_active' => true,
    ]);

    Rundown::create([
        'event_id' => $event->id,
        'name' => 'Upacara Pembukaan',
        'type' => 'ceremony',
        'date' => '2026-10-01 08:00:00',
        'order' => 1,
    ]);

    $this->get('/event/kejurda-shorinji-kempo-jatim-2026')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Event/Show')
            ->where('event.slug', 'kejurda-shorinji-kempo-jatim-2026')
            ->where('event.name', 'Kejurda Shorinji Kempo Jatim 2026')
            ->has('ageCategories', 1)
            ->has('courts', 1)
            ->has('matchCategories', 1)
            ->has('rundowns', 1)
        );
});

test('public event page exposes only its own referees schedules champions scores and Randori brackets', function () {
    $event = Event::create([
        'name' => 'Event Publik Lengkap',
        'slug' => 'event-publik-lengkap',
        'venue' => 'GOR Publik',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'status' => EventStatus::Ongoing,
        'is_active' => true,
    ]);
    $otherEvent = Event::create([
        'name' => 'Event Publik Lain',
        'slug' => 'event-publik-lain',
        'venue' => 'GOR Lain',
        'city' => 'Malang',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-03',
        'status' => EventStatus::Ongoing,
        'is_active' => true,
    ]);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court Publik', 'order' => 1, 'is_active' => true]);
    $referee = Referee::create(['name' => 'Wasit Publik', 'gender' => 'male', 'certification_level' => 'Nasional A', 'is_active' => true]);
    $event->referees()->attach($referee, ['role' => 'chief']);

    $embuCategory = EventMatchCategory::create(['event_id' => $event->id, 'name' => 'Embu Publik', 'type' => 'embu', 'gender' => 'mixed', 'order' => 1, 'is_active' => true]);
    $embuDrawing = TournamentDrawing::create(['event_id' => $event->id, 'event_match_category_id' => $embuCategory->id, 'status' => 'published', 'bracket_type' => 'embu_pool', 'participant_count' => 4, 'contingent_count' => 4]);
    $embuMatch = TournamentMatch::create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen Publik · Tim 1',
        'scheduled_start_at' => '2026-11-01 08:00:00',
        'status' => 'completed',
    ]);
    EmbuScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'judge_scores' => [80, 81, 82, 83, 84],
        'middle_score' => 246,
        'final_score' => 246,
        'status' => 'verified',
        'verified_at' => now(),
    ]);
    TournamentResult::create([
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'participant_key' => 'embu-public-team-1',
        'contingent_name' => 'Kontingen Publik',
        'rank' => 1,
        'match_category' => 'Embu',
    ]);

    $randoriCategory = EventMatchCategory::create(['event_id' => $event->id, 'name' => 'Randori Publik', 'type' => 'randori', 'gender' => 'male', 'order' => 2, 'is_active' => true]);
    $randoriDrawing = TournamentDrawing::create(['event_id' => $event->id, 'event_match_category_id' => $randoriCategory->id, 'status' => 'published', 'bracket_type' => 'double_elimination', 'participant_count' => 4, 'contingent_count' => 4]);
    $randoriMatch = TournamentMatch::create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'upper',
        'round_label' => 'Upper Bracket',
        'match_sequence' => 2,
        'red_label' => 'Atlet AKA',
        'blue_label' => 'Atlet SHIRO',
        'scheduled_start_at' => '2026-11-01 08:10:00',
        'status' => 'completed',
    ]);
    RandoriScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $randoriMatch->id,
        'aka_breakdown' => [],
        'shiro_breakdown' => [],
        'aka_total' => 15,
        'shiro_total' => 10,
        'winner_corner' => 'aka',
        'status' => 'verified',
    ]);
    TournamentMatch::create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'upper',
        'round_label' => 'Upper Bracket',
        'match_sequence' => 3,
        'bracket_position' => 2,
        'red_label' => 'Atlet Lolos Otomatis',
        'blue_label' => 'BYE',
        'status' => 'completed',
        'is_bye' => true,
    ]);

    Referee::create(['name' => 'Wasit Event Lain', 'gender' => 'male', 'is_active' => true])->events()->attach($otherEvent, ['role' => 'judge']);

    $this->get('/event/event-publik-lengkap')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Event/Show')
            ->has('referees', 1)
            ->where('referees.0.name', 'Wasit Publik')
            ->has('matchSchedule', 2)
            ->has('championGroups', 1)
            ->where('championGroups.0.category', 'Embu Publik')
            ->has('embuScores', 1)
            ->where('embuScores.0.final_score', 246)
            ->has('randoriBrackets', 1)
            ->where('randoriBrackets.0.category', 'Randori Publik')
            ->has('randoriBrackets.0.rounds.0.matches', 2)
            ->where('randoriBrackets.0.rounds.0.matches.0.winner', 'aka')
            ->where('randoriBrackets.0.rounds.0.matches.1.is_bye', true)
            ->where('randoriBrackets.0.rounds.0.matches.1.shiro', 'BYE'));
});

test('draft event is not accessible by public guests', function () {
    Event::create([
        'name' => 'Kejurda Rahasia 2026',
        'slug' => 'kejurda-rahasia-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'status' => EventStatus::Draft,
        'is_active' => false,
    ]);

    $this->get('/event/kejurda-rahasia-2026')->assertNotFound();
});

test('admin can access public view of draft event', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    Event::create([
        'name' => 'Kejurda Draft Admin 2026',
        'slug' => 'kejurda-draft-admin-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'status' => EventStatus::Draft,
        'is_active' => false,
    ]);

    $this->actingAs($admin)
        ->get('/event/kejurda-draft-admin-2026')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Event/Show')
            ->where('canManage', true)
            ->where('canAccessDashboard', true)
        );
});

test('an authenticated contingent owner sees the dashboard action on their event landing page', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Kontingen 2026',
        'slug' => 'kejurda-kontingen-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'status' => EventStatus::OpenRegistration,
        'is_active' => true,
    ]);
    Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Event',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Event',
        'phone' => '081234567890',
    ]);

    $this->actingAs($user)
        ->get('/event/kejurda-kontingen-2026')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Event/Show')
            ->where('canManage', false)
            ->where('canAccessDashboard', true)
            ->where('auth.user.id', $user->id)
        );
});

test('guest can register contingent specifically for an event via slug', function () {
    $event = Event::create([
        'name' => 'Kejurda Pendaftaran 2026',
        'slug' => 'kejurda-pendaftaran-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'status' => EventStatus::OpenRegistration,
        'is_active' => true,
    ]);

    $this->get('/event/kejurda-pendaftaran-2026/register')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Register')
            ->where('event.slug', 'kejurda-pendaftaran-2026')
        );

    $response = $this->post('/event/kejurda-pendaftaran-2026/register', [
        'name' => 'Sensei Doni',
        'email' => 'doni.dojo@example.com',
        'contingent_name' => 'Dojo Doni Surabaya',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Doni',
        'phone' => '081234567899',
        'address' => 'Jl. Kertajaya No. 10',
    ]);

    $response->assertRedirect('/login');

    $this->assertDatabaseHas('contingents', [
        'event_id' => $event->id,
        'name' => 'Dojo Doni Surabaya',
    ]);
    $this->assertDatabaseHas('registrations', [
        'event_id' => $event->id,
        'status' => 'pending',
    ]);
});

test('event staff can enter tenant context via slug and scope dashboard', function () {
    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Tenant Slug 2026',
        'slug' => 'kejurda-tenant-slug-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $event->users()->attach($eventUser, ['access_role' => 'staff']);

    // Entering via slug admin sets session and redirects to dashboard
    $this->actingAs($eventUser)
        ->get('/event/kejurda-tenant-slug-2026/admin')
        ->assertRedirect('/admin/dashboard')
        ->assertSessionHas('tenant_event_id', $event->id);

    // Visiting dashboard in that session scopes tenant to the event
    $this->actingAs($eventUser)
        ->withSession(['tenant_event_id' => $event->id])
        ->get('/admin/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('tenant.event.id', $event->id)
            ->where('tenant.event.slug', 'kejurda-tenant-slug-2026')
        );

    // Exiting tenant clears session
    $this->actingAs($eventUser)
        ->withSession(['tenant_event_id' => $event->id])
        ->post('/admin/tenant/exit')
        ->assertRedirect('/admin/master/event')
        ->assertSessionMissing('tenant_event_id');
});

test('unauthorized user cannot enter event tenant via slug', function () {
    $unauthorizedUser = User::factory()->create();
    Event::create([
        'name' => 'Kejurda Tertutup 2026',
        'slug' => 'kejurda-tertutup-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $this->actingAs($unauthorizedUser)
        ->get('/event/kejurda-tertutup-2026/admin')
        ->assertForbidden();
});

test('admin can update event slug', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurda Awal',
        'slug' => 'kejurda-awal',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $this->actingAs($admin)->put("/admin/master/event/{$event->id}/general", [
        'name' => 'Kejurda Baru',
        'slug' => 'kejurda-slug-baru-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'status' => 'open_registration',
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'name' => 'Kejurda Baru',
        'slug' => 'kejurda-slug-baru-2026',
    ]);
});
