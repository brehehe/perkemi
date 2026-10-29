<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
