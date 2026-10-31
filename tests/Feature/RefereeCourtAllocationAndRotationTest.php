<?php

use App\Actions\Admin\Tournament\GenerateRefereeCourtPanelsAction;
use App\Enums\RefereeCourtRole;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('tournament coordinator can allocate referees across courts balancing cities and dan grades', function () {
    $event = Event::query()->create([
        'name' => 'Kejurda Kempo Jatim 2026',
        'slug' => 'kejurda-kempo-jatim-2026',
        'venue' => 'GOR Surabaya',
        'city' => 'Surabaya',
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

    // Roster 14 wasit (8 IV DAN, 6 III DAN) dengan variasi kota mirip POPDA
    $sampleData = [
        ['name' => 'Wasit Sby 1', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Surabaya'],
        ['name' => 'Wasit Sby 2', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Surabaya'],
        ['name' => 'Wasit Sby 3', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Surabaya'],
        ['name' => 'Wasit Sby 4', 'dan' => 'III DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Surabaya'],
        ['name' => 'Wasit Mlg 1', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Malang'],
        ['name' => 'Wasit Mlg 2', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Malang'],
        ['name' => 'Wasit Mlg 3', 'dan' => 'III DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Malang'],
        ['name' => 'Wasit Jbg 1', 'dan' => 'III DAN', 'cert' => 'Wasit Daerah', 'city' => 'Jombang'],
        ['name' => 'Wasit Jbg 2', 'dan' => 'III DAN', 'cert' => 'Wasit Daerah', 'city' => 'Jombang'],
        ['name' => 'Wasit Tbn 1', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Tuban'],
        ['name' => 'Wasit Bjn 1', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Bojonegoro'],
        ['name' => 'Wasit Psr 1', 'dan' => 'IV DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kota Pasuruan'],
        ['name' => 'Wasit KabMlg', 'dan' => 'III DAN', 'cert' => 'Wasit Daerah', 'city' => 'Kabupaten Malang'],
        ['name' => 'Wasit Bkl 1', 'dan' => 'III DAN', 'cert' => 'Wasit Daerah', 'city' => 'Bangkalan'],
    ];

    foreach ($sampleData as $idx => $item) {
        $referee = Referee::query()->create([
            'name' => $item['name'],
            'license_number' => "REF-{$idx}",
            'dan_grade' => $item['dan'],
            'certification_level' => $item['cert'],
            'region' => $item['city'],
            'is_active' => true,
        ]);
        $event->referees()->attach($referee->id, ['role' => 'referee']);
        RefereeAttendance::query()->create([
            'event_id' => $event->id,
            'referee_id' => $referee->id,
            'attendance_date' => now()->toDateString(),
            'is_present' => true,
        ]);
    }

    $action = app(GenerateRefereeCourtPanelsAction::class);
    $totalAssigned = $action->allocateCourts($event, null);

    expect($totalAssigned)->toBe(14);

    $court1Assignments = EventCourtAssignment::where('event_court_id', $court1->id)->where('staff_type', 'referee')->get();
    $court2Assignments = EventCourtAssignment::where('event_court_id', $court2->id)->where('staff_type', 'referee')->get();

    expect($court1Assignments)->toHaveCount(7)
        ->and($court2Assignments)->toHaveCount(7);

    // Verifikasi masing-masing court memiliki 5 wasit bertugas dan 2 cadangan
    expect($court1Assignments->where('role', '!=', 'reserve'))->toHaveCount(5)
        ->and($court1Assignments->where('role', 'reserve'))->toHaveCount(2)
        ->and($court2Assignments->where('role', '!=', 'reserve'))->toHaveCount(5)
        ->and($court2Assignments->where('role', 'reserve'))->toHaveCount(2);

    // Verifikasi Wasit Utama di Court 1 & Court 2 adalah IV DAN+
    $court1Chief = Referee::find($court1Assignments->firstWhere('role', RefereeCourtRole::Chief->value)->staff_id);
    $court2Chief = Referee::find($court2Assignments->firstWhere('role', RefereeCourtRole::Chief->value)->staff_id);

    expect(GenerateRefereeCourtPanelsAction::isChiefQualified($court1Chief))->toBeTrue()
        ->and(GenerateRefereeCourtPanelsAction::isChiefQualified($court2Chief))->toBeTrue();

    // Verifikasi saringan kota: dalam 5 wasit bertugas, tidak ada kota yang melebihi 2 orang
    $activeRefs1 = Referee::whereIn('id', $court1Assignments->where('role', '!=', 'reserve')->pluck('staff_id'))->get();
    $cityCounts1 = $activeRefs1->groupBy(fn ($r) => mb_strtoupper($r->region))->map->count();
    foreach ($cityCounts1 as $city => $count) {
        expect($count)->toBeLessThanOrEqual(2);
    }
});

test('court coordinator can rotate court panel for next match', function () {
    $event = Event::query()->create([
        'name' => 'POPDA XV',
        'slug' => 'popda-xv',
        'venue' => 'GOR Surabaya',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'is_active' => true,
    ]);

    $referees = collect();
    $cities = ['Kota Surabaya', 'Kota Surabaya', 'Kota Malang', 'Kota Malang', 'Jombang', 'Bojonegoro', 'Bangkalan'];
    $dans = ['IV DAN', 'IV DAN', 'IV DAN', 'III DAN', 'III DAN', 'IV DAN', 'III DAN'];

    foreach ($cities as $idx => $city) {
        $ref = Referee::query()->create([
            'name' => "Wasit {$idx}",
            'license_number' => "LIC-{$idx}",
            'dan_grade' => $dans[$idx],
            'certification_level' => 'Wasit Daerah',
            'region' => $city,
            'is_active' => true,
        ]);
        $event->referees()->attach($ref->id, ['role' => 'referee']);
        RefereeAttendance::query()->create([
            'event_id' => $event->id,
            'referee_id' => $ref->id,
            'attendance_date' => now()->toDateString(),
            'is_present' => true,
        ]);
        $referees->push($ref);
    }

    $action = app(GenerateRefereeCourtPanelsAction::class);
    $action->allocateCourts($event, null);

    $initialAssignments = EventCourtAssignment::where('event_court_id', $court->id)->get();
    $initialChiefId = $initialAssignments->firstWhere('role', RefereeCourtRole::Chief->value)->staff_id;

    // Lakukan rotasi
    $action->rotateCourtPanel($court, null);

    $rotatedAssignments = EventCourtAssignment::where('event_court_id', $court->id)->get();
    $newChiefId = $rotatedAssignments->firstWhere('role', RefereeCourtRole::Chief->value)->staff_id;

    expect($rotatedAssignments)->toHaveCount(7);
    expect($rotatedAssignments->where('role', '!=', 'reserve'))->toHaveCount(5);
    expect($rotatedAssignments->where('role', 'reserve'))->toHaveCount(2);

    // Wasit Utama baru tetap IV DAN+
    $newChief = Referee::find($newChiefId);
    expect(GenerateRefereeCourtPanelsAction::isChiefQualified($newChief))->toBeTrue();
});
