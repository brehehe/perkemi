<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createCategoryScheduleFixture(User $user, string $suffix = 'cat'): array
{
    $event = Event::create([
        'name' => 'Kejurda Kategori '.ucfirst($suffix),
        'slug' => 'kejurda-kategori-'.$suffix,
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'match_duration_minutes' => 10,
        'minimum_rest_minutes' => 10,
        'status' => 'open_registration',
        'is_active' => true,
    ]);
    $event->users()->attach($user, ['access_role' => Event::AccessRoleAdmin]);

    $court1 = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Tatami 1',
        'order' => 1,
        'is_active' => true,
    ]);
    $court2 = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Tatami 2',
        'order' => 2,
        'is_active' => true,
    ]);

    $session = Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-11-07 08:00:00',
        'end_time' => '2026-11-07 12:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra Kelas 50 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'order' => 1,
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 4,
        'contingent_count' => 4,
        'generated_at' => now(),
    ]);

    $match1 = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court1->id,
        'rundown_id' => $session->id,
        'phase' => 'preliminary',
        'round_label' => 'Semifinal 1',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet A',
        'blue_label' => 'Atlet B',
        'scheduled_start_at' => '2026-11-07 08:00:00',
        'scheduled_end_at' => '2026-11-07 08:10:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => ['ath-1', 'ath-2']],
    ]);

    $match2 = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court1->id,
        'rundown_id' => $session->id,
        'phase' => 'preliminary',
        'round_label' => 'Semifinal 2',
        'match_sequence' => 2,
        'bracket_position' => 2,
        'red_label' => 'Atlet C',
        'blue_label' => 'Atlet D',
        'scheduled_start_at' => '2026-11-07 08:10:00',
        'scheduled_end_at' => '2026-11-07 08:20:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => ['ath-3', 'ath-4']],
    ]);

    $match3 = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court1->id,
        'rundown_id' => $session->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 3,
        'bracket_position' => 3,
        'red_label' => 'Pemenang SF 1',
        'blue_label' => 'Pemenang SF 2',
        'scheduled_start_at' => '2026-11-07 08:20:00',
        'scheduled_end_at' => '2026-11-07 08:30:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);

    return compact('event', 'court1', 'court2', 'session', 'category', 'drawing', 'match1', 'match2', 'match3');
}

test('administrator can move an entire category to another court and have schedules adjusted automatically', function () {
    $user = User::factory()->create();
    $fixture = createCategoryScheduleFixture($user, 'auto');

    // Existing match on Court 2 at 08:00 - 08:20 (20 min or two 10m matches)
    $otherCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Randori Dewasa 60kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'order' => 2,
        'is_active' => true,
    ]);
    $otherDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $otherCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
        'contingent_count' => 2,
        'generated_at' => now(),
    ]);
    $court2ExistingMatch = TournamentMatch::create([
        'tournament_drawing_id' => $otherDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $otherCategory->id,
        'event_court_id' => $fixture['court2']->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Dewasa A',
        'blue_label' => 'Dewasa B',
        'scheduled_start_at' => '2026-11-07 08:00:00',
        'scheduled_end_at' => '2026-11-07 08:10:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => ['ath-99']],
    ]);

    $this->actingAs($user)
        ->post("/admin/pertandingan/jadwal/categories/{$fixture['category']->id}/move-court", [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $fixture['court2']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    // All 3 matches of fixture category should now be on Court 2, starting after 08:10
    expect($fixture['match1']->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 08:10')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 08:20')
        ->and($fixture['match2']->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 08:20')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 08:30')
        ->and($fixture['match3']->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 08:30')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 08:40');

    // Court 2's existing match was NOT disturbed
    expect($court2ExistingMatch->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 08:00')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 08:10');
});

test('administrator can move a category starting at a specific time slot on the target court', function () {
    $user = User::factory()->create();
    $fixture = createCategoryScheduleFixture($user, 'slot');

    $this->actingAs($user)
        ->post("/admin/pertandingan/jadwal/categories/{$fixture['category']->id}/move-court", [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $fixture['court2']->id,
            'target_rundown_id' => $fixture['session']->id,
            'target_start_time' => '09:30',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($fixture['match1']->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 09:30')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 09:40')
        ->and($fixture['match2']->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 09:40')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 09:50')
        ->and($fixture['match3']->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 09:50')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 10:00');
});

test('cannot move category if all its matches are already completed', function () {
    $user = User::factory()->create();
    $fixture = createCategoryScheduleFixture($user, 'completed');

    $fixture['match1']->update(['status' => 'completed']);
    $fixture['match2']->update(['status' => 'completed']);
    $fixture['match3']->update(['status' => 'completed']);

    $this->actingAs($user)
        ->post("/admin/pertandingan/jadwal/categories/{$fixture['category']->id}/move-court", [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $fixture['court2']->id,
        ])
        ->assertSessionHasErrors('category');
});

test('category move with placement_mode append places category after the latest match on court', function () {
    $user = User::factory()->create();
    $fixture = createCategoryScheduleFixture($user, 'append');

    $otherCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Randori Dewasa 65kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'order' => 2,
        'is_active' => true,
    ]);
    $otherDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $otherCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
        'contingent_count' => 2,
        'generated_at' => now(),
    ]);
    TournamentMatch::create([
        'tournament_drawing_id' => $otherDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $otherCategory->id,
        'event_court_id' => $fixture['court2']->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Dewasa A',
        'blue_label' => 'Dewasa B',
        'scheduled_start_at' => '2026-11-07 10:00:00',
        'scheduled_end_at' => '2026-11-07 10:10:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => ['ath-99']],
    ]);

    $this->actingAs($user)
        ->post("/admin/pertandingan/jadwal/categories/{$fixture['category']->id}/move-court", [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $fixture['court2']->id,
            'placement_mode' => 'append',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($fixture['match1']->fresh())
        ->event_court_id->toBe($fixture['court2']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 10:10')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 10:20');
});

test('unauthorized user cannot move category court schedule', function () {
    $user = User::factory()->create();
    $fixture = createCategoryScheduleFixture($user, 'unauthorized');
    $otherUser = User::factory()->create();

    $this->actingAs($otherUser)
        ->post("/admin/pertandingan/jadwal/categories/{$fixture['category']->id}/move-court", [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $fixture['court2']->id,
        ])
        ->assertForbidden();
});
