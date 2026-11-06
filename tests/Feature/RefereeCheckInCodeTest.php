<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
use App\Models\RefereeCheckInCode;
use App\Models\User;
use App\Services\Referee\RefereeCheckInCodeService;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('RefereeCheckInCodeService generates unique 6-digit codes and signed URLs for event and court roles', function () {
    $service = app(RefereeCheckInCodeService::class);

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'city' => 'Ngawi',
        'venue' => 'SMKN 1 Geneng',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $expiresAt = now()->addDays(7);

    // 1. Issue Event Check-in
    $eventData = $service->issueEventCheckIn($event, $expiresAt);
    expect($eventData['code'])->toBeString()->toHaveLength(6)
        ->and($eventData['url'])->toContain('wasit/check-in/event/'.$event->id)
        ->and($eventData['url'])->toContain('code='.$eventData['code']);

    // 2. Issue Court Role Check-in (Chief)
    $chiefData = $service->issueCourtCheckIn($event, $court, 'chief', $expiresAt);
    expect($chiefData['code'])->toBeString()->toHaveLength(6)
        ->and($chiefData['code'])->not->toBe($eventData['code'])
        ->and($chiefData['url'])->toContain('wasit/check-in/event/'.$event->id.'/court/'.$court->id.'/chief')
        ->and($chiefData['url'])->toContain('code='.$chiefData['code']);

    // 3. Issue Court Role Check-in (Regional 1)
    $reg1Data = $service->issueCourtCheckIn($event, $court, 'regional_1', $expiresAt);
    expect($reg1Data['code'])->toBeString()->toHaveLength(6)
        ->and($reg1Data['code'])->not->toBe($chiefData['code'])
        ->and($reg1Data['url'])->toContain('code='.$reg1Data['code']);

    // 4. Stable code on re-issue
    $reissuedEventData = $service->issueEventCheckIn($event, $expiresAt);
    expect($reissuedEventData['code'])->toBe($eventData['code']);

    $reissuedChiefData = $service->issueCourtCheckIn($event, $court, 'chief', $expiresAt);
    expect($reissuedChiefData['code'])->toBe($chiefData['code']);
});

test('POST /wasit/code resolves 6-digit code and redirects to signed URL', function () {
    $service = app(RefereeCheckInCodeService::class);

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'city' => 'Ngawi',
        'venue' => 'SMKN 1 Geneng',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $eventData = $service->issueEventCheckIn($event, now()->addDay());

    // Hit POST /wasit/code
    $response = $this->post('/wasit/code', [
        'code' => $eventData['code'],
    ]);

    $response->assertRedirect($eventData['url']);
});

test('POST /wasit/code returns JSON target_url when requested via JSON', function () {
    $service = app(RefereeCheckInCodeService::class);

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'city' => 'Ngawi',
        'venue' => 'SMKN 1 Geneng',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $courtData = $service->issueCourtCheckIn($event, $court, 'chief', now()->addDay());

    $response = $this->postJson('/wasit/code', [
        'code' => $courtData['code'],
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'target_url' => $courtData['url'],
            'type' => RefereeCheckInCode::TypeCourt,
            'role' => 'chief',
        ]);
});

test('POST /wasit/code returns error when code is invalid or not found', function () {
    $response = $this->postJson('/wasit/code', [
        'code' => '999999',
    ]);

    $response->assertNotFound()
        ->assertJsonStructure(['message']);

    $responseWeb = $this->from('/wasit')->post('/wasit/code', [
        'code' => '999999',
    ]);

    $responseWeb->assertRedirect('/wasit')
        ->assertSessionHas('error');
});

test('GET /wasit/code/{code} directly redirects to signed check-in URL', function () {
    $service = app(RefereeCheckInCodeService::class);

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'city' => 'Ngawi',
        'venue' => 'SMKN 1 Geneng',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $eventData = $service->issueEventCheckIn($event, now()->addDay());

    $response = $this->get('/wasit/code/'.$eventData['code']);
    $response->assertRedirect($eventData['url']);
});

test('Admin Event Referees view receives eventCheckInCode and court check_in_code', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'city' => 'Ngawi',
        'venue' => 'SMKN 1 Geneng',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $referee = Referee::query()->create([
        'name' => 'Sensei Hartono',
        'dan_grade' => 'IV DAN',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);
    $event->referees()->attach($referee->id, ['role' => 'judge']);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'role' => 'chief',
        'staff_id' => $referee->id,
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.pertandingan.wasit.index', ['event_id' => $event->id]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/EventReferees')
            ->has('eventCheckInCode')
            ->where('eventCheckInCode', fn ($code) => strlen((string) $code) === 6)
            ->has('courts.0.panel.0.check_in_code')
            ->where('courts.0.panel.0.check_in_code', fn ($code) => strlen((string) $code) === 6)
        );
});
