<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Tournament\TournamentScheduleConflictDetector;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('detector identifies exact time clashes and tight rest gaps for the same athlete', function () {
    $event = Event::create([
        'name' => 'Kejurda Perkemi 2026',
        'slug' => 'kejurda-perkemi-2026',
        'venue' => 'GOR Pertandingan',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $court1 = EventCourt::create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    $court2 = EventCourt::create(['event_id' => $event->id, 'name' => 'Court 2', 'order' => 2, 'is_active' => true]);

    $rundown = Rundown::create([
        'event_id' => $event->id,
        'name' => 'Sesi Pagi',
        'type' => 'match',
        'date' => '2026-11-07 08:30:00',
        'end_time' => '2026-11-07 12:00:00',
        'is_match_session' => true,
        'order' => 1,
    ]);

    $cat1 = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa 60kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'is_active' => true,
    ]);

    $cat2 = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Tandoku Dewasa',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'is_active' => true,
    ]);

    $drawing1 = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $cat1->id,
        'bracket_type' => 'single_elimination',
        'status' => 'published',
    ]);

    $drawing2 = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $cat2->id,
        'bracket_type' => 'pool_system',
        'status' => 'published',
    ]);

    $user = User::factory()->create();
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Surabaya',
        'city' => 'Kota Surabaya',
        'manager_name' => 'Sensei Budi',
        'phone' => '081234567890',
    ]);

    $athleteA = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Budi Santoso',
        'gender' => 'male',
    ]);

    $athleteB = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Agus Pratama',
        'gender' => 'male',
    ]);

    // Match 1 on Court 1 at 09:00 - 09:07
    $match1 = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing1->id,
        'event_match_category_id' => $cat1->id,
        'event_court_id' => $court1->id,
        'rundown_id' => $rundown->id,
        'phase' => 'preliminary',
        'match_sequence' => 1,
        'round_label' => 'Babak 1',
        'red_label' => $athleteA->name,
        'blue_label' => $athleteB->name,
        'scheduled_start_at' => Carbon::parse('2026-11-07 09:00:00'),
        'scheduled_end_at' => Carbon::parse('2026-11-07 09:07:00'),
        'is_bye' => false,
        'status' => 'pending',
        'metadata' => [
            'red' => [
                'athlete_ids' => [$athleteA->id],
                'label' => $athleteA->name,
                'contingent_name' => $contingent->name,
            ],
            'blue' => [
                'athlete_ids' => [$athleteB->id],
                'label' => $athleteB->name,
                'contingent_name' => $contingent->name,
            ],
            'athlete_ids' => [$athleteA->id, $athleteB->id],
        ],
    ]);

    // Match 2 on Court 2 at EXACT SAME TIME: 09:00 - 09:07 (Same Athlete A)
    $match2 = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing2->id,
        'event_match_category_id' => $cat2->id,
        'event_court_id' => $court2->id,
        'rundown_id' => $rundown->id,
        'phase' => 'preliminary',
        'match_sequence' => 2,
        'round_label' => 'Pool A',
        'participant_label' => 'Surabaya · Tim 1',
        'scheduled_start_at' => Carbon::parse('2026-11-07 09:00:00'),
        'scheduled_end_at' => Carbon::parse('2026-11-07 09:07:00'),
        'is_bye' => false,
        'status' => 'pending',
        'metadata' => [
            'contingent_name' => $contingent->name,
            'members' => [$athleteA->name],
            'athlete_ids' => [$athleteA->id],
        ],
    ]);

    // Match 3 on Court 1 at 09:20 - 09:27 (20 minutes gap, tight rest)
    $match3 = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing2->id,
        'event_match_category_id' => $cat2->id,
        'event_court_id' => $court1->id,
        'rundown_id' => $rundown->id,
        'phase' => 'preliminary',
        'match_sequence' => 3,
        'round_label' => 'Pool A',
        'participant_label' => 'Surabaya · Tim 1',
        'scheduled_start_at' => Carbon::parse('2026-11-07 09:20:00'),
        'scheduled_end_at' => Carbon::parse('2026-11-07 09:27:00'),
        'is_bye' => false,
        'status' => 'pending',
        'metadata' => [
            'contingent_name' => $contingent->name,
            'members' => [$athleteB->name],
            'athlete_ids' => [$athleteB->id],
        ],
    ]);

    $detector = app(TournamentScheduleConflictDetector::class);
    $result = $detector->detectAndAnnotate(collect([$match1, $match2, $match3]));

    expect($result['summary']['has_clashes'])->toBeTrue();
    expect($result['summary']['exact_clashes_count'])->toBe(2);
    expect($result['summary']['tight_clashes_count'])->toBe(1);

    $annotated1 = $result['matches']->firstWhere('id', $match1->id);
    $annotated2 = $result['matches']->firstWhere('id', $match2->id);
    $annotated3 = $result['matches']->firstWhere('id', $match3->id);

    // Match 1 and 2 must be exact clashes (MERAH)
    expect($annotated1['clash_type'])->toBe('exact');
    expect($annotated2['clash_type'])->toBe('exact');
    expect($annotated1['clash_summary'])->toContain('Bentrok jam sama');

    // Match 3 must be tight clash with Match 1 (KUNING)
    expect($annotated3['clash_type'])->toBe('tight');
    expect($annotated3['clash_summary'])->toContain('Jeda mepet');

    // Names and contingents must be populated
    expect($annotated1['red_athlete'])->toBe('Budi Santoso');
    expect($annotated1['red_contingent'])->toBe('Kontingen Surabaya');
    expect($annotated2['contingent_name'])->toBe('Kontingen Surabaya');
    expect($annotated2['athlete_names'])->toContain('Budi Santoso');
});

test('drawing and schedule pages provide conflictSummary and athlete info in Inertia view', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Event Jadwal Bentrok',
        'slug' => 'event-jadwal-bentrok',
        'venue' => 'GOR Drawing',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.pertandingan.drawing', ['event_id' => $event->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Drawing')
            ->has('eventSchedule')
            ->has('scheduleConflictSummary'));

    $this->actingAs($admin)
        ->get(route('admin.pertandingan.schedule', ['event_id' => $event->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Schedule')
            ->has('matches')
            ->has('conflictSummary'));
});
