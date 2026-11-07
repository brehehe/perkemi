<?php

use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('panitera and admin can view court monitor in match mode with embu and randori data', function () {
    $role = Role::findOrCreate('Super Admin', 'web');
    $user = User::factory()->create([
        'name' => 'Admin Test',
        'email' => 'admin@test.id',
    ]);
    $user->assignRole($role);

    $event = Event::query()->create([
        'name' => 'Event Monitor Test',
        'slug' => 'event-monitor-test',
        'city' => 'Surabaya',
        'venue' => 'GOR Kertajaya',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'location' => 'Tatami Utama',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Tandoku Remaja',
        'type' => 'embu',
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 1,
        'phase' => 'preliminary',
        'round_level' => 1,
        'round_label' => 'Babak Penyisihan',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'is_bye' => false,
    ]);

    $response = $this->actingAs($user)
        ->get(route('admin.panitera.monitors.show', [
            'eventCourt' => $court->id,
            'event_id' => $event->id,
            'mode' => 'match',
        ]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Panitera/CourtMonitor')
        ->where('mode', 'match')
        ->where('monitor.active_match.id', $match->id)
        ->has('monitor.active_match.judge_scores')
        ->has('monitor.active_match.var_stream_url')
    );
});

test('court monitor in result mode shows live judge scores without panitera saving result', function () {
    $role = Role::findOrCreate('Super Admin', 'web');
    $user = User::factory()->create([
        'name' => 'Admin Test',
        'email' => 'admin2@test.id',
    ]);
    $user->assignRole($role);

    $event = Event::query()->create([
        'name' => 'Event Monitor Test',
        'slug' => 'event-monitor-test-2',
        'city' => 'Surabaya',
        'venue' => 'GOR Kertajaya',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'location' => 'Tatami Utama',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Tandoku Remaja',
        'type' => 'embu',
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 1,
        'phase' => 'preliminary',
        'round_level' => 1,
        'round_label' => 'Babak Penyisihan',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'is_bye' => false,
    ]);

    $referee1 = Referee::query()->create([
        'name' => 'Juri 1 Test',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $referee2 = Referee::query()->create([
        'name' => 'Juri 2 Test',
        'gender' => 'female',
        'is_active' => true,
    ]);

    // Create live judge scores from 2 judges
    EmbuJudgeScore::query()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee1->id,
        'judge_number' => 1,
        'role' => 'chief',
        'aspect_scores' => ['k1' => 9, 'k2' => 9, 'k3' => 9, 'k4' => 9, 'k5' => 9, 'k6' => 8, 'p1' => 9, 'p2' => 9, 'p3' => 9, 'p4' => 8.5],
        'total_score' => 88.5,
        'technique_subtotal' => 53.0,
        'expression_subtotal' => 35.5,
        'completed_items' => 10,
        'status' => 'submitted',
    ]);

    EmbuJudgeScore::query()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee2->id,
        'judge_number' => 2,
        'role' => 'regional_one',
        'aspect_scores' => ['k1' => 9, 'k2' => 9, 'k3' => 9, 'k4' => 9, 'k5' => 9, 'k6' => 8.5, 'p1' => 9, 'p2' => 9, 'p3' => 9, 'p4' => 8.5],
        'total_score' => 89.0,
        'technique_subtotal' => 53.5,
        'expression_subtotal' => 35.5,
        'completed_items' => 10,
        'status' => 'submitted',
    ]);

    $response = $this->actingAs($user)
        ->get(route('admin.panitera.monitors.show', [
            'eventCourt' => $court->id,
            'event_id' => $event->id,
            'mode' => 'result',
        ]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Panitera/CourtMonitor')
        ->where('mode', 'result')
        ->where('monitor.category_recap.matches.0.embu_result.is_live', true)
        ->where('monitor.category_recap.matches.0.embu_result.judge_scores.0', 88.5)
        ->where('monitor.category_recap.matches.0.embu_result.judge_scores.1', 89)
    );

    // Also verify /state JSON endpoint used by Reverb
    $stateResponse = $this->actingAs($user)
        ->get(route('admin.panitera.monitors.state', [
            'eventCourt' => $court->id,
            'event_id' => $event->id,
        ]));

    $stateResponse->assertOk();
    $stateResponse->assertJsonPath('category_recap.matches.0.embu_result.is_live', true);
    $stateResponse->assertJsonPath('category_recap.matches.0.embu_result.judge_scores.0', 88.5);
    $stateResponse->assertJsonPath('category_recap.matches.0.embu_result.judge_scores.1', 89);
});

test('court monitor in match mode marks is_result_saved as false until panitera saves embu score', function () {
    $role = Role::findOrCreate('Super Admin', 'web');
    $user = User::factory()->create([
        'name' => 'Admin Panitera',
        'email' => 'admin_panitera@test.id',
    ]);
    $user->assignRole($role);

    $event = Event::query()->create([
        'name' => 'Event Monitor Test 2',
        'slug' => 'event-monitor-test-2',
        'city' => 'Malang',
        'venue' => 'GOR Ken Arok',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 2',
        'location' => 'Tatami 2',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Beregu Dewasa',
        'type' => 'embu',
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 1,
        'phase' => 'final',
        'round_level' => 1,
        'round_label' => 'Babak Final',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'is_bye' => false,
        'metadata' => [
            'label' => 'Kontingen Kota Malang',
        ],
    ]);

    // Before save (judge score exists or draft embu score exists), monitor should report is_result_saved = false
    EmbuScore::query()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'tiebreak_round' => 0,
        'judge_scores' => [90.0, 92.0, 91.0, 89.0, 93.0],
        'duration_seconds' => null,
        'time_penalty' => 0,
        'violation_penalty' => 0,
        'total_penalty' => 0,
        'middle_score' => 273.0,
        'final_score' => 273.0,
        'status' => 'ready_for_verification',
        'verified_at' => null,
        'verified_by' => null,
    ]);

    $responseBeforeSave = $this->actingAs($user)
        ->get(route('admin.panitera.monitors.show', [
            'eventCourt' => $court->id,
            'event_id' => $event->id,
            'mode' => 'match',
        ]));

    $responseBeforeSave->assertOk();
    $responseBeforeSave->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Panitera/CourtMonitor')
        ->where('mode', 'match')
        ->where('monitor.active_match.is_result_saved', false)
        ->where('monitor.active_match.result.is_saved', false)
    );

    // After Panitera verifies and saves Embu score
    EmbuScore::query()
        ->where('tournament_match_id', $match->id)
        ->update([
            'duration_seconds' => 118,
            'status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $user->id,
        ]);

    $responseAfterSave = $this->actingAs($user)
        ->get(route('admin.panitera.monitors.show', [
            'eventCourt' => $court->id,
            'event_id' => $event->id,
            'mode' => 'match',
        ]));

    $responseAfterSave->assertOk();
    $responseAfterSave->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Panitera/CourtMonitor')
        ->where('mode', 'match')
        ->where('monitor.active_match.is_result_saved', true)
        ->where('monitor.active_match.result.is_saved', true)
        ->where('monitor.active_match.result.final_score', 273)
    );
});
