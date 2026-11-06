<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAssignmentHistory;
use App\Models\RefereeCourtAttendance;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('admin can swap two referees across courts and resets court check-in', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court1 = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $court2 = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);

    $referee1 = Referee::query()->create([
        'name' => 'Sensei Hartono',
        'dan_grade' => 'IV DAN',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    $referee2 = Referee::query()->create([
        'name' => 'Senpai Budi',
        'dan_grade' => 'III DAN',
        'certification_level' => 'Wasit Daerah',
        'region' => 'Malang',
        'is_active' => true,
    ]);

    // Present today
    RefereeAttendance::query()->create([
        'referee_id' => $referee1->id,
        'event_id' => $event->id,
        'attendance_date' => '2026-11-07',
        'is_present' => true,
    ]);

    RefereeAttendance::query()->create([
        'referee_id' => $referee2->id,
        'event_id' => $event->id,
        'attendance_date' => '2026-11-07',
        'is_present' => true,
    ]);

    // Assignments: referee1 is regional_1 on Court 1, referee2 is regional_1 on Court 2
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $referee1->id,
        'role' => 'regional_1',
    ]);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court2->id,
        'staff_type' => 'referee',
        'staff_id' => $referee2->id,
        'role' => 'regional_1',
    ]);

    // Referee 1 had already scanned QR for Court 1
    RefereeCourtAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee1->id,
        'event_court_id' => $court1->id,
        'attendance_date' => '2026-11-07',
        'checked_in_at' => now(),
    ]);

    $response = $this->actingAs($admin)->post('/admin/pertandingan/wasit/swap', [
        'event_id' => $event->id,
        'source_referee_id' => $referee1->id,
        'target_referee_id' => $referee2->id,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    // Check positions swapped
    $assign1 = EventCourtAssignment::where('staff_id', $referee1->id)->first();
    $assign2 = EventCourtAssignment::where('staff_id', $referee2->id)->first();

    expect($assign1->event_court_id)->toBe($court2->id);
    expect($assign2->event_court_id)->toBe($court1->id);

    // Court check-in must be reset for both
    expect(RefereeCourtAttendance::where('referee_id', $referee1->id)->where('event_court_id', $court1->id)->count())->toBe(0);
    expect(RefereeCourtAttendance::where('referee_id', $referee2->id)->where('event_court_id', $court2->id)->count())->toBe(0);

    // Audit trail recorded
    expect(RefereeCourtAssignmentHistory::where('referee_id', $referee1->id)->count())->toBeGreaterThan(0);
});

test('swap is rejected if III DAN is placed as Wasit Utama (chief)', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court1 = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $chief = Referee::query()->create([
        'name' => 'Sensei Bambang',
        'dan_grade' => 'IV DAN',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    $junior = Referee::query()->create([
        'name' => 'Senpai Junior',
        'dan_grade' => 'III DAN',
        'certification_level' => 'Wasit Daerah',
        'region' => 'Malang',
        'is_active' => true,
    ]);

    RefereeAttendance::query()->create([
        'referee_id' => $chief->id,
        'event_id' => $event->id,
        'attendance_date' => '2026-11-07',
        'is_present' => true,
    ]);

    RefereeAttendance::query()->create([
        'referee_id' => $junior->id,
        'event_id' => $event->id,
        'attendance_date' => '2026-11-07',
        'is_present' => true,
    ]);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $chief->id,
        'role' => 'chief',
    ]);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $junior->id,
        'role' => 'reserve',
    ]);

    $response = $this->actingAs($admin)->post('/admin/pertandingan/wasit/swap', [
        'event_id' => $event->id,
        'source_referee_id' => $junior->id,
        'target_court_id' => $court1->id,
        'target_role' => 'chief',
    ]);

    $response->assertSessionHasErrors('swap');
});

test('admin can move active panel referee to reserve pool', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court1 = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $ref = Referee::query()->create([
        'name' => 'Senpai Riko',
        'dan_grade' => 'III DAN',
        'certification_level' => 'Wasit Daerah',
        'region' => 'Kediri',
        'is_active' => true,
    ]);

    RefereeAttendance::query()->create([
        'referee_id' => $ref->id,
        'event_id' => $event->id,
        'attendance_date' => '2026-11-07',
        'is_present' => true,
    ]);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $ref->id,
        'role' => 'regional_1',
    ]);

    $response = $this->actingAs($admin)->post('/admin/pertandingan/wasit/swap', [
        'event_id' => $event->id,
        'source_referee_id' => $ref->id,
        'target_court_id' => $court1->id,
        'target_role' => 'reserve',
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $assign = EventCourtAssignment::where('staff_id', $ref->id)->first();
    expect($assign->role)->toBe('reserve');
});

test('swap is rejected if more than 2 referees from the same region are on tatami', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court1 = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $refSurabaya1 = Referee::query()->create([
        'name' => 'Wasit Sby 1',
        'dan_grade' => 'IV DAN',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);
    $refSurabaya2 = Referee::query()->create([
        'name' => 'Wasit Sby 2',
        'dan_grade' => 'III DAN',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);
    $refSurabaya3 = Referee::query()->create([
        'name' => 'Wasit Sby 3',
        'dan_grade' => 'III DAN',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    foreach ([$refSurabaya1, $refSurabaya2, $refSurabaya3] as $r) {
        RefereeAttendance::query()->create([
            'referee_id' => $r->id,
            'event_id' => $event->id,
            'attendance_date' => '2026-11-07',
            'is_present' => true,
        ]);
    }

    // Two Surabaya referees already in active tatami roles on Court 1
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $refSurabaya1->id,
        'role' => 'chief',
    ]);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $refSurabaya2->id,
        'role' => 'regional_1',
    ]);
    // Third Surabaya referee in reserve
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $refSurabaya3->id,
        'role' => 'reserve',
    ]);

    // Attempting to move the 3rd Surabaya referee into regional_2 on Court 1 (would create 3 Surabaya on tatami)
    $response = $this->actingAs($admin)->post('/admin/pertandingan/wasit/swap', [
        'event_id' => $event->id,
        'source_referee_id' => $refSurabaya3->id,
        'target_court_id' => $court1->id,
        'target_role' => 'regional_2',
    ]);

    $response->assertSessionHasErrors('swap');
});

test('admin can reset attendance for a referee', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026-reset',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
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
        'name' => 'Sensei Hartono Reset',
        'dan_grade' => 'IV DAN',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    $event->referees()->attach($referee);

    $date = '2026-11-07';

    RefereeAttendance::query()->create([
        'referee_id' => $referee->id,
        'event_id' => $event->id,
        'attendance_date' => $date,
        'is_present' => true,
        'checked_in_at' => now(),
    ]);

    RefereeCourtAttendance::query()->create([
        'referee_id' => $referee->id,
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'attendance_date' => $date,
        'checked_in_at' => now(),
    ]);

    expect(RefereeAttendance::query()->whereBelongsTo($referee)->whereDate('attendance_date', $date)->exists())->toBeTrue()
        ->and(RefereeCourtAttendance::query()->whereBelongsTo($referee)->whereDate('attendance_date', $date)->exists())->toBeTrue();

    $response = $this->actingAs($admin)->delete("/admin/pertandingan/wasit/{$referee->id}/attendance", [
        'event_id' => $event->id,
        'attendance_date' => $date,
    ]);

    $response->assertRedirect()
        ->assertSessionHas('success');

    expect(RefereeAttendance::query()->whereBelongsTo($referee)->whereDate('attendance_date', $date)->exists())->toBeFalse()
        ->and(RefereeCourtAttendance::query()->whereBelongsTo($referee)->whereDate('attendance_date', $date)->exists())->toBeFalse();
});
