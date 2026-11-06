<?php

use App\Models\Athlete;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createTournamentScheduleFixture(User $user, string $suffix = 'utama'): array
{
    $event = Event::create([
        'name' => 'Kejurda Jadwal '.ucfirst($suffix),
        'slug' => 'kejurda-jadwal-'.$suffix,
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

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);
    $session = Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-11-07 08:00:00',
        'end_time' => '2026-11-07 10:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);
    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 55 kg',
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
        'participant_count' => 8,
        'contingent_count' => 8,
        'generated_at' => now(),
    ]);
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'rundown_id' => $session->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Biru',
        'scheduled_start_at' => '2026-11-07 08:00:00',
        'scheduled_end_at' => '2026-11-07 08:10:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);

    return compact('event', 'court', 'session', 'category', 'drawing', 'match');
}

test('event administrator can open the per-event schedule board', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user);

    $this->actingAs($user)
        ->get('/admin/pertandingan/jadwal?event_id='.$fixture['event']->id)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Schedule')
            ->where('activeEvent.id', $fixture['event']->id)
            ->where('canManageSchedule', true)
            ->has('courts', 1)
            ->where('courts.0.id', $fixture['court']->id)
            ->has('sessions', 1)
            ->where('sessions.0.id', $fixture['session']->id)
            ->has('matches', 1)
            ->where('matches.0.id', $fixture['match']->id)
            ->where('matches.0.category_name', 'Randori Putra Kelas 55 kg'));
});

test('event administrator can move one match to an empty slot without moving another match', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'pindah');
    $secondCourt = EventCourt::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);
    $secondMatch = TournamentMatch::create([
        'tournament_drawing_id' => $fixture['drawing']->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $fixture['category']->id,
        'event_court_id' => $fixture['court']->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 2,
        'bracket_position' => 1,
        'red_label' => 'Pemenang Partai #1',
        'blue_label' => 'Atlet Finalis',
        'scheduled_start_at' => '2026-11-07 08:30:00',
        'scheduled_end_at' => '2026-11-07 08:40:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);

    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$fixture['match']->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $secondCourt->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:10',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Partai berhasil dipindahkan. Partai lainnya tidak berubah.');

    expect($fixture['match']->fresh())
        ->event_court_id->toBe($secondCourt->id)
        ->rundown_id->toBe($fixture['session']->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 08:10')
        ->scheduled_end_at->format('Y-m-d H:i')->toBe('2026-11-07 08:20')
        ->and($secondMatch->fresh()->event_court_id)->toBe($fixture['court']->id)
        ->and($secondMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:30')
        ->and($secondMatch->fresh()->scheduled_end_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:40');
});

test('event administrator can swap two individual matches without changing other matches', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'tukar');
    $secondCourt = EventCourt::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);
    $sourceCategorySecondMatch = TournamentMatch::create([
        'tournament_drawing_id' => $fixture['drawing']->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $fixture['category']->id,
        'event_court_id' => $fixture['court']->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 2,
        'bracket_position' => 1,
        'red_label' => 'Pemenang Partai #1',
        'blue_label' => 'Atlet Finalis',
        'scheduled_start_at' => '2026-11-07 08:30:00',
        'scheduled_end_at' => '2026-11-07 08:40:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);
    $otherCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Randori Putri Kelas 55 kg',
        'type' => 'randori',
        'gender' => 'female',
        'capacity' => 16,
        'order' => 2,
        'is_active' => true,
    ]);
    $otherDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $otherCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 8,
        'contingent_count' => 8,
        'generated_at' => now(),
    ]);
    $targetMatch = TournamentMatch::create([
        'tournament_drawing_id' => $otherDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $otherCategory->id,
        'event_court_id' => $secondCourt->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet Putri Merah',
        'blue_label' => 'Atlet Putri Biru',
        'scheduled_start_at' => '2026-11-07 08:10:00',
        'scheduled_end_at' => '2026-11-07 08:20:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);
    $targetCategorySecondMatch = TournamentMatch::create([
        'tournament_drawing_id' => $otherDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $otherCategory->id,
        'event_court_id' => $secondCourt->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 2,
        'bracket_position' => 1,
        'red_label' => 'Pemenang Partai #1',
        'blue_label' => 'Atlet Putri Finalis',
        'scheduled_start_at' => '2026-11-07 08:40:00',
        'scheduled_end_at' => '2026-11-07 08:50:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);
    $chainedCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Randori Putri Kelas 60 kg',
        'type' => 'randori',
        'gender' => 'female',
        'capacity' => 16,
        'order' => 3,
        'is_active' => true,
    ]);
    $chainedDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $chainedCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 8,
        'contingent_count' => 8,
        'generated_at' => now(),
    ]);
    $chainedMatch = TournamentMatch::create([
        'tournament_drawing_id' => $chainedDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $chainedCategory->id,
        'event_court_id' => $secondCourt->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet Putri 60 Merah',
        'blue_label' => 'Atlet Putri 60 Biru',
        'scheduled_start_at' => '2026-11-07 08:30:00',
        'scheduled_end_at' => '2026-11-07 08:40:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);

    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$fixture['match']->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $secondCourt->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:10',
            'swap_with_match_id' => $targetMatch->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Dua partai berhasil ditukar. Partai lainnya tidak berubah.');

    expect($fixture['match']->fresh())
        ->event_court_id->toBe($secondCourt->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-11-07 08:10')
        ->and($sourceCategorySecondMatch->fresh()->event_court_id)->toBe($fixture['court']->id)
        ->and($sourceCategorySecondMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:30')
        ->and($targetMatch->fresh()->event_court_id)->toBe($fixture['court']->id)
        ->and($targetMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:00')
        ->and($targetCategorySecondMatch->fresh()->event_court_id)->toBe($secondCourt->id)
        ->and($targetCategorySecondMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:40')
        ->and($chainedMatch->fresh()->event_court_id)->toBe($secondCourt->id)
        ->and($chainedMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:30');
});

test('individual swap keeps adjacent matches in their original slots', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'tanpa-cascade');
    $secondCourt = EventCourt::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);
    $sourceSecondMatch = TournamentMatch::create([
        'tournament_drawing_id' => $fixture['drawing']->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $fixture['category']->id,
        'event_court_id' => $fixture['court']->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 2,
        'bracket_position' => 1,
        'red_label' => 'Pemenang Partai #1',
        'blue_label' => 'Atlet Finalis',
        'scheduled_start_at' => '2026-11-07 08:10:00',
        'scheduled_end_at' => '2026-11-07 08:20:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);
    $targetCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Randori Putri Kelas 55 kg',
        'type' => 'randori',
        'gender' => 'female',
        'capacity' => 16,
        'order' => 2,
        'is_active' => true,
    ]);
    $targetDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $targetCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
        'contingent_count' => 2,
        'generated_at' => now(),
    ]);
    $targetMatch = TournamentMatch::create([
        'tournament_drawing_id' => $targetDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $targetCategory->id,
        'event_court_id' => $secondCourt->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet Putri Merah',
        'blue_label' => 'Atlet Putri Biru',
        'scheduled_start_at' => '2026-11-07 08:00:00',
        'scheduled_end_at' => '2026-11-07 08:10:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);
    $blockingCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Randori Putri Kelas 60 kg',
        'type' => 'randori',
        'gender' => 'female',
        'capacity' => 16,
        'order' => 3,
        'is_active' => true,
    ]);
    $blockingDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $blockingCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
        'contingent_count' => 2,
        'generated_at' => now(),
    ]);
    $blockingMatch = TournamentMatch::create([
        'tournament_drawing_id' => $blockingDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $blockingCategory->id,
        'event_court_id' => $secondCourt->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet Putri 60 Merah',
        'blue_label' => 'Atlet Putri 60 Biru',
        'scheduled_start_at' => '2026-11-07 08:10:00',
        'scheduled_end_at' => '2026-11-07 08:20:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);

    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$fixture['match']->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $secondCourt->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:00',
            'swap_with_match_id' => $targetMatch->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Dua partai berhasil ditukar. Partai lainnya tidak berubah.');

    expect($fixture['match']->fresh()->event_court_id)->toBe($secondCourt->id)
        ->and($fixture['match']->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:00')
        ->and($sourceSecondMatch->fresh()->event_court_id)->toBe($fixture['court']->id)
        ->and($sourceSecondMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:10')
        ->and($targetMatch->fresh()->event_court_id)->toBe($fixture['court']->id)
        ->and($targetMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:00')
        ->and($blockingMatch->fresh()->event_court_id)->toBe($secondCourt->id)
        ->and($blockingMatch->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-11-07 08:10');
});

test('schedule download returns a valid event-scoped xlsx workbook', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'excel');

    $response = $this->actingAs($user)
        ->get('/admin/pertandingan/jadwal/export?event_id='.$fixture['event']->id)
        ->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    expect($response->headers->get('content-disposition'))
        ->toContain('attachment;')
        ->toContain('.xlsx');

    $temporaryFile = tempnam(sys_get_temp_dir(), 'schedule-test-');
    file_put_contents($temporaryFile, $response->getContent());
    $archive = new ZipArchive;

    expect($archive->open($temporaryFile))->toBeTrue();

    $worksheet = $archive->getFromName('xl/worksheets/sheet1.xml');
    $archive->close();
    unlink($temporaryFile);

    expect($worksheet)
        ->toContain('Jadwal Pertandingan')
        ->toContain('Kejurda Jadwal Excel')
        ->toContain('Randori Putra Kelas 55 kg')
        ->toContain('Atlet Merah vs Atlet Biru');
});

test('event staff cannot download another events schedule', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $user = User::factory()->create();
    createTournamentScheduleFixture($user, 'milik-staf');
    $otherEvent = Event::create([
        'name' => 'Event Bukan Milik Staf',
        'slug' => 'event-bukan-milik-staf',
        'tenant_subdomain' => 'event-bukan-milik-staf',
        'venue' => 'GOR Event Lain',
        'city' => 'Malang',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-02',
        'status' => 'open_registration',
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get('http://event-bukan-milik-staf.localhost/admin/pertandingan/jadwal/export?event_id='.$otherEvent->id)
        ->assertForbidden();
});

test('admin can unschedule a match back to unscheduled pool', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'lepas-jadwal');

    $this->actingAs($user)
        ->delete('/admin/pertandingan/jadwal/matches/'.$fixture['match']->id.'?event_id='.$fixture['event']->id)
        ->assertRedirect()
        ->assertSessionHas('success', "Partai #{$fixture['match']->match_sequence} ({$fixture['match']->round_label}) berhasil dilepas dari jadwal dan dikembalikan ke antrean.");

    $freshMatch = $fixture['match']->fresh();
    expect($freshMatch->scheduled_start_at)->toBeNull()
        ->and($freshMatch->scheduled_end_at)->toBeNull()
        ->and($freshMatch->event_court_id)->toBeNull()
        ->and($freshMatch->rundown_id)->toBeNull();
});

test('on match day, admin can reschedule upcoming matches even when drawing is published without affecting scores', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'hari-h-reschedule');

    // Simulate Hari-H: drawing is published
    $fixture['drawing']->update(['status' => 'published']);

    $newCourt = EventCourt::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);

    // Reschedule to Court 2 at 08:00
    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$fixture['match']->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $newCourt->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:00',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Partai berhasil dipindahkan. Partai lainnya tidak berubah.');

    expect($fixture['match']->fresh()->event_court_id)->toBe($newCourt->id)
        ->and($fixture['match']->fresh()->scheduled_start_at->format('H:i'))->toBe('08:00');
});

test('completed matches cannot be rescheduled to preserve match score integrity', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'completed-match-locked');

    $fixture['match']->update(['status' => 'completed']);

    $newCourt = EventCourt::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$fixture['match']->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $newCourt->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:00',
        ])
        ->assertSessionHasErrors(['schedule']);

    expect($fixture['match']->fresh()->event_court_id)->toBe($fixture['court']->id);
});

test('admin can swap two matches within the same category without sequence order violation', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'same-category-swap');

    // Create match #1 at 08:00 and match #2 at 08:10 in the same round/phase
    $fixture['match']->update([
        'scheduled_start_at' => '2026-11-07 08:00:00',
        'scheduled_end_at' => '2026-11-07 08:10:00',
        'round_label' => 'Final',
        'phase' => 'final',
        'match_sequence' => 1,
    ]);

    $match2 = TournamentMatch::create([
        'tournament_drawing_id' => $fixture['drawing']->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $fixture['category']->id,
        'event_court_id' => $fixture['court']->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 2,
        'bracket_position' => 2,
        'red_label' => 'Atlet Merah 2',
        'blue_label' => 'Atlet Biru 2',
        'scheduled_start_at' => '2026-11-07 08:10:00',
        'scheduled_end_at' => '2026-11-07 08:20:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);

    // Swap Match 2 (08:10) with Match 1 (08:00)
    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$match2->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $fixture['court']->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:00',
            'swap_with_match_id' => $fixture['match']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Dua partai berhasil ditukar. Partai lainnya tidak berubah.');

    expect($match2->fresh()->scheduled_start_at->format('H:i'))->toBe('08:00')
        ->and($fixture['match']->fresh()->scheduled_start_at->format('H:i'))->toBe('08:10');
});

test('admin can export match schedule as pdf directly', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'pdf-export');

    // Direct visit downloads PDF
    $response = $this->actingAs($user)
        ->get('/admin/pertandingan/jadwal/pdf?event_id='.$fixture['event']->id);

    $response->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect($response->headers->get('content-disposition'))->toContain('attachment; filename=Jadwal_Pertandingan_');

    // With ?format=html renders web HTML view
    $this->actingAs($user)
        ->get('/admin/pertandingan/jadwal/pdf?event_id='.$fixture['event']->id.'&format=html')
        ->assertOk()
        ->assertViewIs('reports.tournament-schedule-matches')
        ->assertViewHas('matches');

    // With ?stream=1 streams inline PDF
    $streamResponse = $this->actingAs($user)
        ->get('/admin/pertandingan/jadwal/pdf?event_id='.$fixture['event']->id.'&stream=1');

    $streamResponse->assertOk()
        ->assertHeader('content-type', 'application/pdf');
    expect($streamResponse->headers->get('content-disposition'))->toContain('inline; filename=Jadwal_Pertandingan_');
});

test('admin can trigger automatic match schedule generation from schedule page', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'generate-sched');

    $this->actingAs($user)
        ->post('/admin/pertandingan/jadwal/generate', [
            'event_id' => $fixture['event']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');
});

test('user with role Pertandingan can access schedule, drawing, and generate schedule without 403', function () {
    Role::firstOrCreate(['name' => 'Pertandingan', 'guard_name' => 'web']);
    $pertandinganUser = User::factory()->create();
    $pertandinganUser->assignRole('Pertandingan');

    $fixture = createTournamentScheduleFixture($pertandinganUser, 'role-pertandingan');

    $this->actingAs($pertandinganUser)
        ->get('/admin/pertandingan/jadwal?event_id='.$fixture['event']->id)
        ->assertOk();

    $this->actingAs($pertandinganUser)
        ->get('/admin/pertandingan/drawing?event_id='.$fixture['event']->id)
        ->assertOk();

    $this->actingAs($pertandinganUser)
        ->post('/admin/pertandingan/jadwal/generate', [
            'event_id' => $fixture['event']->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');
});

test('admin can move matches freely without embu before randori validation blocking', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'embu-randori-move');

    // Fixture category is randori. Let's schedule it at 08:00 - 08:10 on Court 1
    $fixture['match']->update([
        'scheduled_start_at' => '2026-11-07 08:00:00',
        'scheduled_end_at' => '2026-11-07 08:10:00',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
    ]);

    // Create an Embu category and match on Court 1 scheduled at 08:10 - 08:20
    $embuCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Embu Tandoku Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 16,
        'order' => 2,
        'is_active' => true,
    ]);
    $embuDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $embuCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
    ]);
    $embuMatch = TournamentMatch::create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $embuCategory->id,
        'event_court_id' => $fixture['court']->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'preliminary',
        'round_label' => 'Pool A',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet Embu 1',
        'scheduled_start_at' => '2026-11-07 08:10:00',
        'scheduled_end_at' => '2026-11-07 08:20:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => []],
    ]);

    // Move Embu match to 08:30 (which is after Randori match at 08:00).
    // Previously, this threw "Seluruh pertandingan Embu harus selesai sebelum Randori dimulai."
    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$embuMatch->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $fixture['court']->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:30',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    expect($embuMatch->fresh()->scheduled_start_at->format('H:i'))->toBe('08:30');
});

test('admin can move or swap matches without 15-minute rest validation blocking manual adjustments', function () {
    $user = User::factory()->create();
    $fixture = createTournamentScheduleFixture($user, 'athlete-rest-move');
    $athleteId = (string) Str::uuid();

    // Match 1: Randori at 08:00 - 08:10 on Court 1 with Athlete
    $fixture['match']->update([
        'scheduled_start_at' => '2026-11-07 08:00:00',
        'scheduled_end_at' => '2026-11-07 08:10:00',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'metadata' => ['athlete_ids' => [$athleteId]],
    ]);

    // Create a second court
    $court2 = EventCourt::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);

    // Match 2: Embu on Court 2 at 08:30 - 08:40 with the SAME Athlete
    $embuCategory = EventMatchCategory::create([
        'event_id' => $fixture['event']->id,
        'name' => 'Embu Tandoku Putri',
        'type' => 'embu',
        'gender' => 'female',
        'capacity' => 16,
        'order' => 2,
        'is_active' => true,
    ]);
    $embuDrawing = TournamentDrawing::create([
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $embuCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
    ]);
    $embuMatch = TournamentMatch::create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $fixture['event']->id,
        'event_match_category_id' => $embuCategory->id,
        'event_court_id' => $court2->id,
        'rundown_id' => $fixture['session']->id,
        'phase' => 'preliminary',
        'round_label' => 'Pool A',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'red_label' => 'Atlet Embu 1',
        'scheduled_start_at' => '2026-11-07 08:30:00',
        'scheduled_end_at' => '2026-11-07 08:40:00',
        'status' => 'pending',
        'is_bye' => false,
        'metadata' => ['athlete_ids' => [$athleteId]],
    ]);

    // Move Match 2 to 08:20 on Court 2 (only 10 minutes after Match 1 ends at 08:10, less than 15 mins rest).
    // Previously, this threw "Atlet memerlukan jeda minimal 15 menit dari partai lainnya."
    $this->actingAs($user)
        ->put('/admin/pertandingan/jadwal/matches/'.$embuMatch->id, [
            'event_id' => $fixture['event']->id,
            'event_court_id' => $court2->id,
            'rundown_id' => $fixture['session']->id,
            'start_time' => '08:20',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    expect($embuMatch->fresh()->scheduled_start_at->format('H:i'))->toBe('08:20');
});
