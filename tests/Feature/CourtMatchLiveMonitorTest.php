<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
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
