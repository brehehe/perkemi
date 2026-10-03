<?php

use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can manage master referee data', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/admin/master/referee', [
        'name' => 'Sensei Budi Santoso',
        'gender' => 'male',
        'dan_grade' => 'Dan IV',
        'license_number' => 'WASIT-001',
        'certification_level' => 'Wasit Nasional A',
        'region' => 'Jawa Timur',
        'phone' => '08123456789',
        'is_active' => true,
    ])->assertRedirect();

    $referee = Referee::query()->firstOrFail();

    $this->assertDatabaseHas('referees', ['id' => $referee->id, 'license_number' => 'WASIT-001']);

    $this->actingAs($user)->get('/admin/master/referee')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Referee/Index')
            ->has('referees.data', 1)
            ->where('referees.data.0.name', 'Sensei Budi Santoso')
        );

    $this->actingAs($user)->put("/admin/master/referee/{$referee->id}", [
        'name' => 'Sensei Budi Santoso, M.Pd.',
        'gender' => 'male',
        'dan_grade' => 'Dan IV',
        'license_number' => 'WASIT-001',
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('referees', ['id' => $referee->id, 'name' => 'Sensei Budi Santoso, M.Pd.']);
});

test('admin can assign a referee to an event', function () {
    $user = User::factory()->create();
    $referee = Referee::create(['name' => 'Sensei Ani', 'gender' => 'female', 'is_active' => true]);
    $event = Event::create(['name' => 'Kejurda Wasit 2026', 'slug' => 'kejurda-wasit-2026', 'venue' => 'GOR Kertajaya', 'city' => 'Surabaya', 'start_date' => '2026-10-01', 'end_date' => '2026-10-03']);

    $this->actingAs($user)->post("/admin/master/event/{$event->id}/referee", ['referee_id' => $referee->id, 'role' => 'chief'])->assertRedirect();

    $this->assertDatabaseHas('event_referee', ['event_id' => $event->id, 'referee_id' => $referee->id, 'role' => 'chief']);

    $this->actingAs($user)->get("/admin/master/event/{$event->id}/detail")
        ->assertInertia(fn (Assert $page) => $page->where('eventReferees.0.name', 'Sensei Ani')->where('eventReferees.0.role', 'chief'));
});

test('admin can add a new referee directly from an event', function () {
    $user = User::factory()->create();
    $event = Event::create(['name' => 'Kejurda Wasit Cepat 2026', 'slug' => 'kejurda-wasit-cepat-2026', 'venue' => 'GOR Kertajaya', 'city' => 'Surabaya', 'start_date' => '2026-10-01', 'end_date' => '2026-10-03']);

    $this->actingAs($user)->post("/admin/master/event/{$event->id}/referee", [
        'create_new' => true,
        'name' => 'Sensei Citra',
        'dan_grade' => 'Dan III',
        'license_number' => 'WASIT-CEPAT-001',
        'region' => 'Jawa Tengah',
        'phone' => '081234567890',
        'role' => 'judge',
    ])->assertRedirect();

    $referee = Referee::query()->firstOrFail();

    $this->assertDatabaseHas('event_referee', ['event_id' => $event->id, 'referee_id' => $referee->id, 'role' => 'judge']);
});

test('tenant arbitration page shows only referees assigned to its event', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Arbitrase 2026',
        'slug' => 'kejurda-arbitrase-2026',
        'tenant_subdomain' => 'kejurda-arbitrase-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Arbitrase Lain 2026',
        'slug' => 'kejurda-arbitrase-lain-2026',
        'tenant_subdomain' => 'kejurda-arbitrase-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);

    $tenantReferee = Referee::create([
        'name' => 'Sensei Wasit Tenant',
        'gender' => 'female',
        'certification_level' => 'Wasit Nasional A',
        'is_active' => true,
    ]);
    $otherReferee = Referee::create([
        'name' => 'Sensei Wasit Lain',
        'gender' => 'male',
        'certification_level' => 'Wasit Nasional B',
        'is_active' => true,
    ]);
    $event->referees()->attach($tenantReferee, ['role' => 'chief']);
    $otherEvent->referees()->attach($otherReferee, ['role' => 'judge']);

    $this->actingAs($user)
        ->get('http://kejurda-arbitrase-2026.localhost/admin/arbitrase/wasit')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Referee')
            ->where('activeEvent.id', $event->id)
            ->has('referees', 1)
            ->where('referees.0.id', $tenantReferee->id)
            ->where('referees.0.role', 'chief')
            ->where('stats.total_referees', 1)
            ->where('stats.national_a', 1)
            ->where('canManageEventReferees', false)
        );
});

test('tenant assignment page uses courts and event staff from its event', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Penugasan 2026',
        'slug' => 'kejurda-penugasan-2026',
        'tenant_subdomain' => 'kejurda-penugasan-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Penugasan Lain 2026',
        'slug' => 'kejurda-penugasan-lain-2026',
        'tenant_subdomain' => 'kejurda-penugasan-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Tatami Utama',
        'location' => 'Gedung A',
        'order' => 1,
        'is_active' => true,
    ]);
    EventCourt::create([
        'event_id' => $otherEvent->id,
        'name' => 'Tatami Event Lain',
        'order' => 1,
        'is_active' => true,
    ]);
    $chief = Referee::create(['name' => 'Sensei Chief Tenant', 'gender' => 'male', 'dan_grade' => 'Dan IV', 'is_active' => true]);
    $judge = Referee::create(['name' => 'Sensei Judge Tenant', 'gender' => 'female', 'is_active' => true]);
    $clerk = Clerk::create(['name' => 'Panitera Tenant', 'is_active' => true]);
    $coordinator = FieldCoordinator::create(['name' => 'Koordinator Tenant', 'is_active' => true]);
    $event->referees()->attach($chief, ['role' => 'chief']);
    $event->referees()->attach($judge, ['role' => 'judge']);
    $event->clerks()->attach($clerk, ['role' => 'timekeeper']);
    $event->fieldCoordinators()->attach($coordinator, ['assignment_area' => 'Tatami Utama']);
    EventCourtAssignment::create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $chief->id, 'role' => 'chief']);
    EventCourtAssignment::create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $judge->id, 'role' => 'judge']);
    EventCourtAssignment::create(['event_court_id' => $court->id, 'staff_type' => 'clerk', 'staff_id' => $clerk->id, 'role' => 'timekeeper']);
    EventCourtAssignment::create(['event_court_id' => $court->id, 'staff_type' => 'field_coordinator', 'staff_id' => $coordinator->id, 'role' => 'koordinator']);

    $this->actingAs($user)
        ->get('http://kejurda-penugasan-2026.localhost/admin/arbitrase/penugasan')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Assignment')
            ->where('activeEvent.id', $event->id)
            ->has('tatamis', 1)
            ->where('tatamis.0.id', $court->id)
            ->where('tatamis.0.chief_referee', 'Sensei Chief Tenant')
            ->where('tatamis.0.judges.0', 'Judge: Sensei Judge Tenant')
            ->where('tatamis.0.clerks.0', 'Timekeeper: Panitera Tenant')
            ->where('tatamis.0.field_coordinators.0', 'Koordinator: Koordinator Tenant')
            ->where('canManageEventStaff', false)
        );
});
