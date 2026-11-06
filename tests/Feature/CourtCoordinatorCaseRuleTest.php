<?php

use App\Models\Clerk;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\EventMatchCategory;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAssignmentHistory;
use App\Models\RefereeCourtAttendance;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('admin can assign, move, and reset court coordinator across courts', function () {
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

    $coord1 = FieldCoordinator::query()->create([
        'name' => 'Daud Tatengkeng',
        'coordinator_number' => '69.1.13.03.99.002',
        'email' => 'daud@smart-perkemi.id',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    $coord2 = FieldCoordinator::query()->create([
        'name' => 'Sugiono',
        'coordinator_number' => '70.1.13.01.04.002',
        'email' => 'sugiono@smart-perkemi.id',
        'region' => 'Malang',
        'is_active' => true,
    ]);

    // 1. Assign Daud to Court 1
    $response = $this->actingAs($admin)
        ->post(route('admin.pertandingan.wasit.courts.coordinator.update', ['eventCourt' => $court1->id]), [
            'coordinator_id' => $coord1->id,
            'event_id' => $event->id,
        ]);

    $response->assertSessionHasNoErrors();
    expect(EventCourtAssignment::query()
        ->where('event_court_id', $court1->id)
        ->where('staff_type', 'field_coordinator')
        ->where('staff_id', $coord1->id)
        ->where('role', 'court_coordinator')
        ->exists()
    )->toBeTrue();

    // 2. Reassign / Move Daud from Court 1 to Court 2
    $response = $this->actingAs($admin)
        ->post(route('admin.pertandingan.wasit.courts.coordinator.update', ['eventCourt' => $court2->id]), [
            'coordinator_id' => $coord1->id,
            'event_id' => $event->id,
        ]);

    $response->assertSessionHasNoErrors();
    // Removed from Court 1
    expect(EventCourtAssignment::query()
        ->where('event_court_id', $court1->id)
        ->where('staff_id', $coord1->id)
        ->exists()
    )->toBeFalse();
    // Now assigned to Court 2
    expect(EventCourtAssignment::query()
        ->where('event_court_id', $court2->id)
        ->where('staff_id', $coord1->id)
        ->exists()
    )->toBeTrue();

    // 3. Reset coordinator on Court 2
    $response = $this->actingAs($admin)
        ->delete(route('admin.pertandingan.wasit.courts.coordinator.reset', ['eventCourt' => $court2->id]), [
            'event_id' => $event->id,
        ]);

    $response->assertSessionHasNoErrors();
    expect(EventCourtAssignment::query()
        ->where('event_court_id', $court2->id)
        ->where('staff_type', 'field_coordinator')
        ->exists()
    )->toBeFalse();

    // 4. Auto-generate coordinator distribution across active courts
    $response = $this->actingAs($admin)
        ->post(route('admin.pertandingan.wasit.courts.coordinators.generate'), [
            'event_id' => $event->id,
        ]);

    $response->assertSessionHasNoErrors();
    expect(EventCourtAssignment::query()->where('event_court_id', $court1->id)->where('staff_type', 'field_coordinator')->exists())->toBeTrue();
    expect(EventCourtAssignment::query()->where('event_court_id', $court2->id)->where('staff_type', 'field_coordinator')->exists())->toBeTrue();
});

test('court coordinator login via NIK redirects to court coordinator panel', function () {
    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $coord = FieldCoordinator::query()->create([
        'name' => 'Daud Tatengkeng',
        'coordinator_number' => '69.1.13.03.99.002',
        'email' => 'daud.tatengkeng@smart-perkemi.id',
        'is_active' => true,
    ]);
    $event->fieldCoordinators()->attach($coord->id);

    $user = User::factory()->create([
        'name' => 'Daud Tatengkeng',
        'email' => 'daud.tatengkeng@smart-perkemi.id',
        'nik_perkemi' => '69.1.13.03.99.002',
    ]);
    $user->assignRole('Koordinator Lapangan');
    $user->assignRole('Court');

    $response = $this->post(route('login.nik'), [
        'nik' => '69.1.13.03.99.002',
    ]);

    $response->assertRedirect(route('admin.koordinator-court.index', ['event_id' => $event->id]));
    $this->assertAuthenticatedAs($user);
});

test('court coordinator can generate, rotate, and reset court panel without losing match scores', function () {
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

    $coord = FieldCoordinator::query()->create([
        'name' => 'Daud Tatengkeng',
        'coordinator_number' => '69.1.13.03.99.002',
        'email' => 'daud.tatengkeng@smart-perkemi.id',
        'is_active' => true,
    ]);
    $event->fieldCoordinators()->attach($coord->id);

    $user = User::factory()->create([
        'name' => 'Daud Tatengkeng',
        'email' => 'daud.tatengkeng@smart-perkemi.id',
        'nik_perkemi' => '69.1.13.03.99.002',
    ]);
    $user->assignRole('Koordinator Lapangan');
    $user->assignRole('Court');

    // Assign to Court 1
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'field_coordinator',
        'staff_id' => $coord->id,
        'role' => 'court_coordinator',
    ]);

    // Create 7 present referees (at least one IV DAN)
    $referees = collect();
    for ($i = 1; $i <= 7; $i++) {
        $ref = Referee::query()->create([
            'name' => "Wasit Jatim {$i}",
            'dan_grade' => $i === 1 ? 'IV DAN' : 'III DAN',
            'certification_level' => 'Wasit Daerah',
            'region' => "Kota {$i}",
            'license_number' => "LIC-00{$i}",
            'is_active' => true,
        ]);
        $event->referees()->attach($ref->id);

        RefereeAttendance::query()->create([
            'event_id' => $event->id,
            'referee_id' => $ref->id,
            'attendance_date' => now()->toDateString(),
            'is_present' => true,
        ]);

        $referees->push($ref);
    }

    // 1. Generate panel on Court 1
    $response = $this->actingAs($user)
        ->post(route('admin.koordinator-court.generate', ['eventCourt' => $court1->id]), [
            'event_id' => $event->id,
        ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $response->assertSessionHasNoErrors();

    // Check active panel assignments
    $activeAssignments = EventCourtAssignment::query()
        ->where('event_court_id', $court1->id)
        ->where('staff_type', 'referee')
        ->get();

    expect($activeAssignments->count())->toBeGreaterThanOrEqual(5);

    // Verify duty history was recorded
    $firstAssigned = $activeAssignments->first();
    $dutyHistoryCount = RefereeCourtAssignmentHistory::query()
        ->where('referee_id', $firstAssigned->staff_id)
        ->where('event_court_id', $court1->id)
        ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
        ->count();
    expect($dutyHistoryCount)->toBe(1);

    // Create a match and submit scores by this referee
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court1->id,
        'match_sequence' => 1,
        'round_label' => 'Babak Final',
        'phase' => 'final',
        'status' => 'completed',
    ]);

    $judgeScore = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'event_court_id' => $court1->id,
        'tournament_match_id' => $match->id,
        'referee_id' => $firstAssigned->staff_id,
        'total_score' => 265,
    ]);

    // 2. Reset Court Panel
    $resetResponse = $this->actingAs($user)
        ->delete(route('admin.koordinator-court.panel.reset', ['eventCourt' => $court1->id]), [
            'event_id' => $event->id,
        ]);

    $resetResponse->assertSessionHasNoErrors();

    // Active court assignments cleared
    expect(EventCourtAssignment::query()
        ->where('event_court_id', $court1->id)
        ->where('staff_type', 'referee')
        ->count()
    )->toBe(0);

    // CRITICAL: The judge scores in embu_judge_scores MUST NOT be deleted!
    expect(EmbuJudgeScore::query()->whereKey($judgeScore->id)->exists())->toBeTrue();
    expect(EmbuJudgeScore::query()->find($judgeScore->id)->total_score)->toEqual(265);

    // 3. Generate second time (referee duty count increases to 2x)
    $this->actingAs($user)
        ->post(route('admin.koordinator-court.generate', ['eventCourt' => $court1->id]), [
            'event_id' => $event->id,
        ]);

    $dutyHistoryCountAfterSecondGen = RefereeCourtAssignmentHistory::query()
        ->where('referee_id', $firstAssigned->staff_id)
        ->where('event_court_id', $court1->id)
        ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
        ->count();
    expect($dutyHistoryCountAfterSecondGen)->toBe(2);
});

test('court coordinator is scoped to assigned court while admin can view all courts', function () {
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

    $coord = FieldCoordinator::query()->create([
        'name' => 'Daud Tatengkeng',
        'coordinator_number' => '69.1.13.03.99.002',
        'email' => 'daud.tatengkeng@smart-perkemi.id',
        'is_active' => true,
    ]);
    $event->fieldCoordinators()->attach($coord->id);

    $user = User::factory()->create([
        'name' => 'Daud Tatengkeng',
        'email' => 'daud.tatengkeng@smart-perkemi.id',
        'nik_perkemi' => '69.1.13.03.99.002',
    ]);
    $user->assignRole('Koordinator Lapangan');
    $user->assignRole('Court');

    // Assign Daud to Court 1
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'field_coordinator',
        'staff_id' => $coord->id,
        'role' => 'court_coordinator',
    ]);

    // 1. Koordinator Court accesses index: selectedCourtId must be Court 1
    $response = $this->actingAs($user)
        ->get(route('admin.koordinator-court.index', [
            'event_id' => $event->id,
            'court_id' => $court2->id, // Try to request Court 2
        ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Arbitration/CourtCoordinator')
        ->where('selectedCourtId', $court1->id) // Strictly locked to Court 1
        ->where('isSupervisor', false)
    );

    // 2. Admin accesses index: can freely view Court 2
    $adminResponse = $this->actingAs($admin)
        ->get(route('admin.koordinator-court.index', [
            'event_id' => $event->id,
            'court_id' => $court2->id,
        ]));

    $adminResponse->assertOk();
    $adminResponse->assertInertia(fn ($page) => $page
        ->component('Admin/Arbitration/CourtCoordinator')
        ->where('selectedCourtId', $court2->id) // Supervisor selects Court 2
        ->where('isSupervisor', true)
    );
});

test('court coordinator index renders matches with participants correctly without relation error', function () {
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

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 50 kg',
        'type' => 'randori',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
    ]);

    TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court1->id,
        'match_sequence' => 1,
        'round_label' => 'Babak Penyisihan',
        'phase' => 'elimination',
        'status' => 'ready',
        'red_label' => 'Atlet Dummy 07-001',
        'blue_label' => 'Atlet Dummy 07-002',
        'scheduled_start_at' => now(),
    ]);

    $response = $this->actingAs($admin)->get(route('admin.koordinator-court.index', [
        'event_id' => $event->id,
        'court_id' => $court1->id,
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Arbitration/CourtCoordinator')
        ->has('categories', 1)
        ->where('categories.0.matches.0.aka_name', 'Atlet Dummy 07-001')
        ->where('categories.0.matches.0.shiro_name', 'Atlet Dummy 07-002')
    );
});

test('referees can be swapped between active panel and reserve with attendance reset while retaining past match scores', function () {
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

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Arena Utama',
        'order' => 1,
        'is_active' => true,
    ]);

    $ref1 = Referee::query()->create([
        'name' => 'Wasit Utama Lawas',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-01',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    $refReserve = Referee::query()->create([
        'name' => 'Wasit Cadangan Naik',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-02',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Malang',
        'is_active' => true,
    ]);

    // Assignments
    $assignChief = EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $ref1->id,
        'role' => 'chief',
    ]);

    $assignReserve = EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $refReserve->id,
        'role' => 'reserve',
    ]);

    // Ref 1 has checked in today
    RefereeCourtAttendance::query()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'referee_id' => $ref1->id,
        'attendance_date' => now()->toDateString(),
        'checked_in_at' => now(),
    ]);

    // Ref 1 scored a past match
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Pasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'match_sequence' => 1,
        'round_label' => 'Final',
        'phase' => 'final',
        'status' => 'completed',
    ]);

    $pastScore = EmbuJudgeScore::query()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $ref1->id,
        'judge_number' => 1,
        'role' => 'chief',
        'aspect_scores' => ['kihon' => 90, 'kousei' => 92],
        'total_score' => 275.50,
        'status' => 'submitted',
    ]);

    // Perform SWAP between Ref 1 (chief) and Ref Reserve (reserve)
    $response = $this->actingAs($admin)->post(
        route('admin.koordinator-court.swap', ['eventCourt' => $court->id]),
        [
            'event_id' => $event->id,
            'source_referee_id' => $refReserve->id,
            'target_referee_id' => $ref1->id,
        ]
    );

    $response->assertSessionHasNoErrors();
    $response->assertSessionHas('success');

    // 1. Roles are swapped
    $assignChief->refresh();
    $assignReserve->refresh();
    expect($assignChief->role)->toBe('reserve');
    expect($assignReserve->role)->toBe('chief');

    // 2. Attendance is reset for both referees (must scan QR in their new role)
    expect(RefereeCourtAttendance::query()
        ->where('event_court_id', $court->id)
        ->whereIn('referee_id', [$ref1->id, $refReserve->id])
        ->exists()
    )->toBeFalse();

    // 3. Past match score remains intact (never deleted or modified)
    $pastScore->refresh();
    expect($pastScore->total_score)->toBe('275.50');
    expect($pastScore->referee_id)->toBe($ref1->id);
    expect($pastScore->status)->toBe('submitted');

    // 4. Histories recorded
    expect(RefereeCourtAssignmentHistory::query()
        ->where('event_court_id', $court->id)
        ->where('referee_id', $refReserve->id)
        ->where('role', 'chief')
        ->exists()
    )->toBeTrue();
});

test('referee swap is rejected if non-IV DAN referee is placed as chief while qualified referees exist according to SOP Wasit 3.3', function () {
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

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    // Chief: IV DAN (qualified)
    $chiefRef = Referee::query()->create([
        'name' => 'Sensei IV DAN',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-DAN-4',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    // Assistant: III DAN (not qualified for Chief)
    $assistantRef = Referee::query()->create([
        'name' => 'Wasit Muda III DAN',
        'dan_grade' => 'III DAN',
        'certification_level' => 'Wasit Daerah',
        'license_number' => 'W-DAN-3',
        'region' => 'Malang',
        'is_active' => true,
    ]);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $chiefRef->id,
        'role' => 'chief',
    ]);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $assistantRef->id,
        'role' => 'assistant_1',
    ]);

    // Attempt to swap Assistant (III DAN) into Chief role
    $response = $this->actingAs($admin)->post(
        route('admin.koordinator-court.swap', ['eventCourt' => $court->id]),
        [
            'event_id' => $event->id,
            'source_referee_id' => $assistantRef->id,
            'target_referee_id' => $chiefRef->id,
        ]
    );

    $response->assertSessionHasErrors('swap');
    $errors = session('errors')->get('swap');
    expect($errors[0])->toContain('belum memenuhi kualifikasi Wasit Utama (minimal IV DAN atau Wasit Nasional)');

    // Verify roles did NOT change
    expect(EventCourtAssignment::query()->where('staff_id', $chiefRef->id)->value('role'))->toBe('chief');
    expect(EventCourtAssignment::query()->where('staff_id', $assistantRef->id)->value('role'))->toBe('assistant_1');
});

test('referee swap is rejected if more than 2 referees from same city would serve concurrently on tatami according to SOP Wasit 3.3', function () {
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

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    // Tatami already has 2 referees from Surabaya: W1 and W2
    $w1 = Referee::query()->create([
        'name' => 'Wasit SBY 1',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-SBY-1',
        'region' => 'Kota Surabaya',
        'is_active' => true,
    ]);
    $w2 = Referee::query()->create([
        'name' => 'Wasit SBY 2',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-SBY-2',
        'region' => 'Kota Surabaya',
        'is_active' => true,
    ]);
    $w3 = Referee::query()->create([
        'name' => 'Wasit MLG',
        'dan_grade' => 'III DAN',
        'license_number' => 'W-MLG-1',
        'region' => 'Kota Malang',
        'is_active' => true,
    ]);
    $w4 = Referee::query()->create([
        'name' => 'Wasit KDR',
        'dan_grade' => 'III DAN',
        'license_number' => 'W-KDR-1',
        'region' => 'Kota Kediri',
        'is_active' => true,
    ]);
    $w5 = Referee::query()->create([
        'name' => 'Wasit JBG',
        'dan_grade' => 'III DAN',
        'license_number' => 'W-JBG-1',
        'region' => 'Kabupaten Jombang',
        'is_active' => true,
    ]);

    // Reserve also from Surabaya!
    $reserveSby = Referee::query()->create([
        'name' => 'Wasit Cadangan SBY 3',
        'dan_grade' => 'III DAN',
        'license_number' => 'W-SBY-3',
        'region' => 'Kota Surabaya',
        'is_active' => true,
    ]);

    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $w1->id, 'role' => 'chief']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $w2->id, 'role' => 'regional_1']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $w3->id, 'role' => 'regional_2']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $w4->id, 'role' => 'assistant_1']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $w5->id, 'role' => 'assistant_2']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $reserveSby->id, 'role' => 'reserve']);

    // Attempt to swap Reserve SBY into Tatami (swapping with W3 Malang)
    // This would make Surabaya have 3 referees on tatami (w1, w2, reserveSby)!
    $response = $this->actingAs($admin)->post(
        route('admin.koordinator-court.swap', ['eventCourt' => $court->id]),
        [
            'event_id' => $event->id,
            'source_referee_id' => $reserveSby->id,
            'target_referee_id' => $w3->id,
        ]
    );

    $response->assertSessionHasErrors('swap');
    $errors = session('errors')->get('swap');
    expect($errors[0])->toContain('maksimal hanya boleh 2 wasit dari daerah yang sama');
    expect($errors[0])->toContain('KOTA SURABAYA: 3 orang');

    // Verify assignments did NOT change
    expect(EventCourtAssignment::query()->where('staff_id', $reserveSby->id)->value('role'))->toBe('reserve');
    expect(EventCourtAssignment::query()->where('staff_id', $w3->id)->value('role'))->toBe('regional_2');
});

test('referee swap is rejected if referee is inactive according to SOP Wasit 3.1', function () {
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

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $activeRef = Referee::query()->create([
        'name' => 'Wasit Aktif',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-AKTIF-1',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    $inactiveRef = Referee::query()->create([
        'name' => 'Wasit Sakit / Nonaktif',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-NONAKTIF-1',
        'region' => 'Malang',
        'is_active' => false,
    ]);

    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $activeRef->id, 'role' => 'chief']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $inactiveRef->id, 'role' => 'reserve']);

    $response = $this->actingAs($admin)->post(
        route('admin.koordinator-court.swap', ['eventCourt' => $court->id]),
        [
            'event_id' => $event->id,
            'source_referee_id' => $inactiveRef->id,
            'target_referee_id' => $activeRef->id,
        ]
    );

    $response->assertSessionHasErrors('swap');
    $errors = session('errors')->get('swap');
    expect($errors[0])->toContain('berstatus tidak aktif sehingga tidak dapat ditugaskan di arena');
});

test('court coordinator duty count can be reset using soft delete', function () {
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

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $ref = Referee::query()->create([
        'name' => 'Wasit Jam Terbang Test',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-JT-01',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    // Create 3 assignment histories
    for ($i = 0; $i < 3; $i++) {
        RefereeCourtAssignmentHistory::query()->create([
            'event_id' => $event->id,
            'event_court_id' => $court->id,
            'referee_id' => $ref->id,
            'batch_id' => (string) Str::uuid(),
            'action' => RefereeCourtAssignmentHistory::ActionAssigned,
            'role' => 'chief',
            'occurred_at' => now(),
        ]);
    }

    expect(RefereeCourtAssignmentHistory::query()
        ->where('event_id', $event->id)
        ->where('event_court_id', $court->id)
        ->where('referee_id', $ref->id)
        ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
        ->count()
    )->toBe(3);

    // Perform reset duty count
    $response = $this->actingAs($admin)->post(
        route('admin.koordinator-court.duty.reset', ['eventCourt' => $court->id]),
        [
            'event_id' => $event->id,
            'scope' => 'court',
        ]
    );

    $response->assertSessionHasNoErrors();
    $response->assertSessionHas('success');

    // Active count is now 0 (due to SoftDeletes)
    expect(RefereeCourtAssignmentHistory::query()
        ->where('event_id', $event->id)
        ->where('event_court_id', $court->id)
        ->where('referee_id', $ref->id)
        ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
        ->count()
    )->toBe(0);

    // Records are preserved with soft delete
    expect(RefereeCourtAssignmentHistory::withTrashed()
        ->where('event_id', $event->id)
        ->where('event_court_id', $court->id)
        ->where('referee_id', $ref->id)
        ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
        ->count()
    )->toBe(3);
});

test('reset draft bagan performs full soft delete on drawings, matches, scores, and tournament results', function () {
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

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Pasangan',
        'type' => 'embu',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'completed',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'match_sequence' => 1,
        'round_label' => 'Final',
        'phase' => 'final',
        'status' => 'completed',
    ]);

    $ref = Referee::query()->create([
        'name' => 'Wasit Penilai',
        'dan_grade' => 'IV DAN',
        'license_number' => 'W-SCORE-01',
        'certification_level' => 'Wasit Nasional',
        'region' => 'Surabaya',
        'is_active' => true,
    ]);

    $judgeScore = EmbuJudgeScore::query()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $ref->id,
        'judge_number' => 1,
        'role' => 'chief',
        'aspect_scores' => ['kihon' => 90],
        'total_score' => 270.00,
        'status' => 'submitted',
    ]);

    $embuScore = EmbuScore::query()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'tiebreak_round' => 0,
        'judge_scores' => [270],
        'middle_score' => 270.00,
        'final_score' => 270.00,
        'status' => 'verified',
    ]);

    $result = TournamentResult::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'contingent_name' => 'Kota Surabaya',
        'rank' => 1,
        'match_category' => 'Embu Pasangan',
    ]);

    // Send DELETE request to reset draft bagan
    $response = $this->actingAs($admin)->delete(route('admin.pertandingan.drawing.reset'), [
        'event_id' => $event->id,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertSessionHas('success');

    // 1. Drawing is soft-deleted
    expect(TournamentDrawing::query()->where('id', $drawing->id)->exists())->toBeFalse();
    expect(TournamentDrawing::withTrashed()->where('id', $drawing->id)->exists())->toBeTrue();

    // 2. Match is soft-deleted
    expect(TournamentMatch::query()->where('id', $match->id)->exists())->toBeFalse();
    expect(TournamentMatch::withTrashed()->where('id', $match->id)->exists())->toBeTrue();

    // 3. Scores are soft-deleted
    expect(EmbuJudgeScore::query()->where('id', $judgeScore->id)->exists())->toBeFalse();
    expect(EmbuJudgeScore::withTrashed()->where('id', $judgeScore->id)->exists())->toBeTrue();
    expect(EmbuScore::query()->where('id', $embuScore->id)->exists())->toBeFalse();
    expect(EmbuScore::withTrashed()->where('id', $embuScore->id)->exists())->toBeTrue();

    // 4. Tournament results (juara) are soft-deleted
    expect(TournamentResult::query()->where('id', $result->id)->exists())->toBeFalse();
    expect(TournamentResult::withTrashed()->where('id', $result->id)->exists())->toBeTrue();
});

test('old url admin/arbitrase/court-coordinator redirects to new url admin/koordinator-court', function () {
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

    $response = $this->actingAs($admin)->get("/admin/arbitrase/court-coordinator?event_id={$event->id}");

    $response->assertRedirect(route('admin.koordinator-court.index', ['event_id' => $event->id]));
});

test('court coordinator index renders successfully when user is not assigned to any court', function () {
    $user = User::factory()->create();
    $user->assignRole('Court');

    $event = Event::query()->create([
        'name' => 'POPDA XV Jatim 2026',
        'slug' => 'popda-xv-jatim-2026',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get(route('admin.koordinator-court.index', ['event_id' => $event->id]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Arbitration/CourtCoordinator')
        ->where('isAssigned', false)
        ->where('reserves', [])
        ->where('panel', [])
    );
});

test('panitera can access court coordinator at admin/panitera scoped to assigned court', function () {
    $user = User::factory()->create(['email' => 'panitera1@smart-perkemi.id']);
    $user->assignRole('Panitera');

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

    $clerk = Clerk::query()->create([
        'name' => $user->name,
        'email' => $user->email,
        'is_active' => true,
    ]);
    $event->clerks()->attach($clerk, ['role' => 'scorer']);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'clerk',
        'staff_id' => $clerk->id,
        'role' => 'scorer',
    ]);

    $response = $this->actingAs($user)->get(route('admin.panitera.index', ['event_id' => $event->id]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Arbitration/CourtCoordinator')
        ->where('baseUrl', '/admin/panitera')
        ->where('isPanitera', true)
        ->where('canSwitchCourt', false)
        ->where('selectedCourtId', $court1->id)
        ->has('courts', 1)
        ->where('courts.0.id', $court1->id)
    );
});

test('panitera without specific court assignment has access to all courts at admin/panitera', function () {
    $user = User::factory()->create(['email' => 'panitera-roaming@smart-perkemi.id']);
    $user->assignRole('Panitera');

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

    $response = $this->actingAs($user)->get(route('admin.panitera.index', ['event_id' => $event->id]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Arbitration/CourtCoordinator')
        ->where('baseUrl', '/admin/panitera')
        ->where('isPanitera', true)
        ->where('canSwitchCourt', true)
        ->has('courts', 2)
    );
});

test('panitera cannot operate court outside assigned court', function () {
    $user = User::factory()->create(['email' => 'panitera-restricted@smart-perkemi.id']);
    $user->assignRole('Panitera');

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

    $clerk = Clerk::query()->create([
        'name' => $user->name,
        'email' => $user->email,
        'is_active' => true,
    ]);
    $event->clerks()->attach($clerk, ['role' => 'scorer']);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court1->id,
        'staff_type' => 'clerk',
        'staff_id' => $clerk->id,
        'role' => 'scorer',
    ]);

    // Try to reset duty on Court 2 which panitera is NOT assigned to
    $response = $this->actingAs($user)->post(route('admin.panitera.courts.duty.reset', [
        'eventCourt' => $court2->id,
        'event_id' => $event->id,
    ]));

    $response->assertForbidden();
});

test('court panel generation alternates IV DAN and III DAN referees according to Pak Budi rules', function () {
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

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Arena Utama',
        'order' => 1,
        'is_active' => true,
    ]);

    // Create 4 IV DAN referees and 3 III DAN referees
    for ($i = 1; $i <= 4; $i++) {
        $ref = Referee::query()->create([
            'name' => "Wasit Senior IV DAN {$i}",
            'dan_grade' => 'IV DAN',
            'certification_level' => 'Wasit Daerah',
            'region' => "Kota {$i}",
            'is_active' => true,
        ]);
        $event->referees()->attach($ref);
        RefereeAttendance::query()->create([
            'event_id' => $event->id,
            'referee_id' => $ref->id,
            'attendance_date' => now()->toDateString(),
            'is_present' => true,
        ]);
    }

    for ($i = 1; $i <= 3; $i++) {
        $ref = Referee::query()->create([
            'name' => "Wasit Muda III DAN {$i}",
            'dan_grade' => 'III DAN',
            'certification_level' => 'Wasit Daerah',
            'region' => "Daerah {$i}",
            'is_active' => true,
        ]);
        $event->referees()->attach($ref);
        RefereeAttendance::query()->create([
            'event_id' => $event->id,
            'referee_id' => $ref->id,
            'attendance_date' => now()->toDateString(),
            'is_present' => true,
        ]);
    }

    // Generate court panel
    $response = $this->actingAs($admin)->post(route('admin.koordinator-court.generate', [
        'eventCourt' => $court->id,
        'event_id' => $event->id,
    ]));

    $response->assertSessionHas('success');

    $assignments = EventCourtAssignment::query()
        ->where('event_court_id', $court->id)
        ->where('staff_type', 'referee')
        ->get();

    // 1. Wasit Utama must be IV DAN
    $chiefId = $assignments->firstWhere('role', 'chief')?->staff_id;
    expect($chiefId)->not->toBeNull();
    $chiefRef = Referee::find($chiefId);
    expect($chiefRef->dan_grade)->toBe('IV DAN');

    // 2. Wasit Pembantu 1 & 2 must be IV DAN
    $reg1Id = $assignments->firstWhere('role', 'regional_1')?->staff_id;
    $reg2Id = $assignments->firstWhere('role', 'regional_2')?->staff_id;
    expect(Referee::find($reg1Id)->dan_grade)->toBe('IV DAN');
    expect(Referee::find($reg2Id)->dan_grade)->toBe('IV DAN');

    // 3. Wasit Pembantu 3 & 4 must be III DAN
    $asst1Id = $assignments->firstWhere('role', 'assistant_1')?->staff_id;
    $asst2Id = $assignments->firstWhere('role', 'assistant_2')?->staff_id;
    expect(Referee::find($asst1Id)->dan_grade)->toBe('III DAN');
    expect(Referee::find($asst2Id)->dan_grade)->toBe('III DAN');

    // Total active: 3 IV DAN + 2 III DAN
    $activeStaffIds = [$chiefId, $reg1Id, $reg2Id, $asst1Id, $asst2Id];
    $activeRefs = Referee::whereIn('id', $activeStaffIds)->get();
    expect($activeRefs->where('dan_grade', 'IV DAN')->count())->toBe(3);
    expect($activeRefs->where('dan_grade', 'III DAN')->count())->toBe(2);
});
