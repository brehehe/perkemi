<?php

use App\Actions\Admin\Tournament\GenerateRefereeCourtPanelsAction;
use App\Enums\RefereeCourtRole;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('seed real popda referees command cleans dummy staff and creates 19 real officials', function () {
    $event = Event::query()->create([
        'name' => 'POPDA XV Test',
        'slug' => 'popda-xv-test',
        'venue' => 'GOR Kendedes',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-04',
        'is_active' => true,
    ]);

    foreach (range(1, 2) as $num) {
        EventCourt::query()->create([
            'event_id' => $event->id,
            'name' => "Court {$num}",
            'order' => $num,
            'is_active' => true,
        ]);
    }

    $this->artisan('perkemi:seed-real-referees', [
        'event' => $event->id,
        '--generate-panels' => true,
    ])
        ->assertSuccessful();

    // Verify User accounts created
    expect(User::where('email', 'm.djamhuri.djauhari@smart-perkemi.id')->exists())->toBeTrue()
        ->and(User::where('email', 'dr.ihyan.amri@smart-perkemi.id')->exists())->toBeTrue()
        ->and(User::where('email', 'anik.yussetyowati@smart-perkemi.id')->exists())->toBeTrue();

    // Verify 14 event referees from popda.csv (8 Wasit Utama + 6 Wasit)
    expect($event->referees()->count())->toBe(14);

    // Verify court allocation: 2 courts x 5 active positions = 10, plus 4 in reserve pool = 14 total
    $assignments = EventCourtAssignment::whereIn('event_court_id', $event->courts->modelKeys())->get();
    expect($assignments)->toHaveCount(14);
    expect($assignments->where('role', '!=', 'reserve'))->toHaveCount(10);
    expect($assignments->where('role', 'reserve'))->toHaveCount(4);

    // Check Wasit Utama qualifications: must be IV DAN+
    $chiefAssignments = $assignments->where('role', RefereeCourtRole::Chief->value);
    expect($chiefAssignments)->toHaveCount(2);

    foreach ($chiefAssignments as $assignment) {
        $referee = Referee::find($assignment->staff_id);
        expect(GenerateRefereeCourtPanelsAction::isChiefQualified($referee))->toBeTrue();
    }
});
