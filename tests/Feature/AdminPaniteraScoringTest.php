<?php

use App\Events\PaniteraMatchStateUpdated;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\Role;
use App\Models\Technique;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use App\Models\User;
use App\Services\Panitera\EmbuResultService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event as EventFacade;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createPaniteraEvent(string $name): Event
{
    return Event::create([
        'name' => $name,
        'slug' => str($name)->slug()->toString(),
        'tenant_subdomain' => str($name)->slug()->toString(),
        'venue' => 'GOR Panitera',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);
}

/** @return array{0: EventMatchCategory, 1: TournamentDrawing} */
function createPaniteraCategory(Event $event, string $name, string $type, string $format): array
{
    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => $name,
        'type' => $type,
        'gender' => 'mixed',
        'capacity' => 20,
        'max_athletes_per_team' => $type === 'embu' ? 2 : 1,
        'order' => 1,
        'is_active' => true,
    ]);
    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => $format,
        'participant_count' => 4,
        'contingent_count' => 4,
        'generated_at' => now(),
    ]);

    return [$category, $drawing];
}

function createPaniteraUser(Event $event): User
{
    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    return $user;
}

test('an assigned clerk sees only the selected event dashboard', function () {
    $event = createPaniteraEvent('Event Panitera Utama');
    $otherEvent = createPaniteraEvent('Event Panitera Lain');
    $user = createPaniteraUser($event);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/Dashboard')
            ->where('activeEvent.id', $event->id)
            ->has('events', 1)
            ->where('events.0.id', $event->id)
        );

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$otherEvent->id}")
        ->assertNotFound();
});

test('the Panitera dashboard separates Embu and Randori match tables', function () {
    $event = createPaniteraEvent('Event Tabel Panitera');
    $user = createPaniteraUser($event);
    [$embuCategory, $embuDrawing] = createPaniteraCategory($event, 'Embu Putra', 'embu', 'embu_direct_final');
    [$randoriCategory, $randoriDrawing] = createPaniteraCategory($event, 'Randori Putra', 'randori', 'single_elimination');
    $embuMatch = TournamentMatch::create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Embu A',
    ]);
    $randoriMatch = TournamentMatch::create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'phase' => 'upper',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'metadata' => ['placeholder' => false],
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/Dashboard')
            ->has('embuMatches', 1)
            ->where('embuMatches.0.id', $embuMatch->id)
            ->has('randoriMatches', 1)
            ->where('randoriMatches.0.id', $randoriMatch->id)
        );
});

test('an assigned clerk opens one scoped match detail', function () {
    $event = createPaniteraEvent('Event Detail Panitera');
    $otherEvent = createPaniteraEvent('Event Detail Lain');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Detail', 'embu', 'embu_direct_final');
    [$otherCategory, $otherDrawing] = createPaniteraCategory($otherEvent, 'Embu Detail Lain', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Detail',
    ]);
    $otherMatch = TournamentMatch::create([
        'tournament_drawing_id' => $otherDrawing->id,
        'event_id' => $otherEvent->id,
        'event_match_category_id' => $otherCategory->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Event Lain',
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/MatchDetail')
            ->where('activeEvent.id', $event->id)
            ->where('match.id', $match->id)
            ->where('match.category_type', 'embu')
        );

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/matches/{$otherMatch->id}?event_id={$event->id}")
        ->assertNotFound();
});

test('randori match detail provides the saved breakdown for inline editing', function () {
    $event = createPaniteraEvent('Event Detail Randori');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Detail', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'call_status' => 'participants_called',
        'metadata' => ['placeholder' => false],
    ]);
    $signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    $signatures = array_fill_keys(['arbitrase', 'field_coordinator', 'referee', 'clerk', 'red_manager', 'white_manager'], $signature);
    RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'aka_breakdown' => ['mujoken' => 0, 'ippon' => 1, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0],
        'shiro_breakdown' => ['mujoken' => 0, 'ippon' => 0, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0],
        'signatures' => $signatures,
        'notes' => 'Keputusan final meja Panitera.',
        'submitted_by' => $user->id,
        'verified_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/MatchDetail')
            ->where('match.category_type', 'randori')
            ->where('match.result.aka_breakdown.ippon', 1)
            ->where('match.result.shiro_breakdown.waza_ari', 1)
            ->where('match.result.signatures.arbitrase', $signature)
            ->where('match.result.signatures.white_manager', $signature)
            ->where('match.result.notes', 'Keputusan final meja Panitera.')
        );
});

test('calling a new match releases the previous active match on the same court', function () {
    $event = createPaniteraEvent('Event Panggilan Satu Partai');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Antrean', 'embu', 'embu_direct_final');
    $firstMatch = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Pertama',
    ]);
    $secondMatch = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 2,
        'participant_label' => 'Tim Kedua',
    ]);

    foreach (['call_officials', 'call_participants', 'start'] as $action) {
        $this->actingAs($user)
            ->put("/admin/panitera/scoring/matches/{$firstMatch->id}/workflow", [
                'event_id' => $event->id,
                'action' => $action,
            ])
            ->assertRedirect(route('admin.panitera.matches.show', [
                'tournamentMatch' => $firstMatch,
                'event_id' => $event->id,
            ]));
    }

    expect($firstMatch->fresh()->status)->toBe('in_progress')
        ->and($firstMatch->fresh()->timer_status)->toBe('running');

    $this->actingAs($user)
        ->put("/admin/panitera/scoring/matches/{$secondMatch->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'call_officials',
        ])
        ->assertRedirect();

    expect($firstMatch->fresh()->status)->toBe('pending')
        ->and($firstMatch->fresh()->call_status)->toBe('waiting')
        ->and($firstMatch->fresh()->timer_status)->toBe('stopped')
        ->and($secondMatch->fresh()->status)->toBe('ready')
        ->and($secondMatch->fresh()->call_status)->toBe('officials_called');
});

test('a match cannot start before its participant is called', function () {
    $event = createPaniteraEvent('Event Validasi Panggilan');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Validasi',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Validasi', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'upper',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'metadata' => ['placeholder' => false],
    ]);

    $this->actingAs($user)
        ->from("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'start',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('action');

    expect($match->fresh()->status)->toBe('pending')
        ->and($match->fresh()->timer_status)->toBe('stopped');
});

test('pausing a match broadcasts the authoritative timer state for its court monitor', function () {
    $this->travelTo(Carbon::parse('2026-11-07 09:00:05'));

    $event = createPaniteraEvent('Event Timer Real-time');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Timer Real-time',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Timer Real-time', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Timer Real-time',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'timer_status' => 'running',
        'timer_started_at' => now()->subSeconds(5),
        'timer_started_at_ms' => now()->getTimestampMs() - 5250,
        'timer_elapsed_seconds' => 32,
        'timer_elapsed_ms' => 32400,
        'timer_version' => 7,
        'metadata' => [
            'panitera' => [
                'timer_direction' => 'down',
                'timer_duration_seconds' => 90,
            ],
        ],
    ]);
    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $this->actingAs($user)
        ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'pause',
            'timer_version' => 7,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($match->fresh()->timer_status)->toBe('paused')
        ->and($match->fresh()->timer_started_at_ms)->toBeNull()
        ->and($match->fresh()->timer_elapsed_seconds)->toBe(37)
        ->and($match->fresh()->timer_elapsed_ms)->toBe(37650)
        ->and($match->fresh()->timer_version)->toBe(8);

    EventFacade::assertDispatched(
        PaniteraMatchStateUpdated::class,
        fn (PaniteraMatchStateUpdated $broadcast): bool => $broadcast->eventId === $event->id
            && $broadcast->courtId === $court->id
            && $broadcast->matchId === $match->id
            && $broadcast->action === 'pause'
            && $broadcast->timer['status'] === 'paused'
            && $broadcast->timer['elapsed_seconds'] === 37
            && $broadcast->timer['elapsed_ms'] === 37650
            && $broadcast->timer['direction'] === 'down'
            && $broadcast->timer['duration_seconds'] === 90
            && $broadcast->timer['duration_ms'] === 90000
            && $broadcast->timer['version'] === 8
            && $broadcast->serverNowMs === now()->getTimestampMs(),
    );

    $this->actingAs($user)
        ->from("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'reset_timer',
            'timer_version' => 7,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('timer');

    expect($match->fresh()->timer_status)->toBe('paused')
        ->and($match->fresh()->timer_version)->toBe(8);
});

test('a clerk finishes an Embu match and the official duration penalty updates its score', function () {
    $this->travelTo(Carbon::parse('2026-11-07 09:02:01'));

    $event = createPaniteraEvent('Event Selesai Embu');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Selesai',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Berpasangan Putra', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Embu Selesai',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'timer_status' => 'running',
        'timer_started_at' => now()->subSeconds(121),
        'timer_elapsed_seconds' => 0,
    ]);
    $score = EmbuScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'tiebreak_round' => 0,
        'judge_scores' => [80, 81, 82, 83, 84],
        'duration_seconds' => null,
        'time_penalty' => 0,
        'middle_score' => 246,
        'final_score' => 246,
        'status' => 'ready_for_verification',
    ]);

    $this->actingAs($user)
        ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'finish',
        ])
        ->assertRedirect(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertSessionHasNoErrors();

    $finishedMatch = $match->fresh();
    $finishedScore = $score->fresh();

    expect($finishedMatch->status)->toBe('in_progress')
        ->and($finishedMatch->timer_status)->toBe('stopped')
        ->and($finishedMatch->timer_started_at)->toBeNull()
        ->and($finishedMatch->timer_elapsed_seconds)->toBe(121)
        ->and(data_get($finishedMatch->metadata, 'panitera.duration_seconds'))->toBe(121)
        ->and((float) data_get($finishedMatch->metadata, 'panitera.time_penalty'))->toBe(5.0)
        ->and(data_get($finishedMatch->metadata, 'panitera.finished_at'))->not->toBeNull()
        ->and($finishedScore->duration_seconds)->toBe(121)
        ->and((float) $finishedScore->time_penalty)->toBe(5.0)
        ->and((float) $finishedScore->middle_score)->toBe(246.0)
        ->and((float) $finishedScore->final_score)->toBe(241.0);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('match.timer.is_finished', true)
            ->where('match.timer.elapsed_seconds', 121)
            ->where('match.timer.time_penalty', 5)
            ->where('match.timer.penalty_category', 'Pasangan / Beregu')
            ->where('match.result.duration_seconds', 121)
            ->where('match.result.time_penalty', 5)
            ->where('match.result.final_score', 241)
        );
});

test('an Embu match cannot finish before its timer starts', function () {
    $event = createPaniteraEvent('Event Validasi Selesai Embu');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Validasi Selesai',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Tandoku Putra', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Atlet Tandoku',
        'status' => 'ready',
        'call_status' => 'participants_called',
        'timer_status' => 'stopped',
        'timer_elapsed_seconds' => 0,
    ]);

    $this->actingAs($user)
        ->from("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'finish',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('action');

    expect(data_get($match->fresh()->metadata, 'panitera.finished_at'))->toBeNull();
});

test('a clerk saves five submitted judge scores and sees the verified Embu result', function () {
    $this->travelTo(Carbon::parse('2026-11-07 09:03:00'));

    $event = createPaniteraEvent('Event Simpan Nilai Embu');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Simpan Nilai',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Berpasangan Putra Simpan', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Tim Nilai Lengkap',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'timer_status' => 'stopped',
        'timer_elapsed_seconds' => 121,
        'metadata' => [
            'panitera' => [
                'finished_at' => now()->toIso8601String(),
                'duration_seconds' => 121,
                'time_penalty' => 5,
            ],
        ],
    ]);
    $roles = ['chief', 'regional_1', 'regional_2', 'assistant_1', 'assistant_2'];
    $totals = [80, 81, 82, 83, 84];

    foreach ($roles as $index => $role) {
        $referee = Referee::create([
            'name' => 'Wasit Simpan '.($index + 1),
            'license_number' => 'SAVE-'.($index + 1),
            'is_active' => true,
        ]);

        EmbuJudgeScore::factory()->create([
            'event_id' => $event->id,
            'tournament_match_id' => $match->id,
            'event_court_id' => $court->id,
            'referee_id' => $referee->id,
            'judge_number' => $index + 1,
            'role' => $role,
            'total_score' => $totals[$index],
        ]);
    }

    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/matches/{$match->id}/embu-result", [
            'event_id' => $event->id,
        ])
        ->assertRedirect(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Nilai Embu berhasil disimpan, papan Wasit ditutup, dan hasil masuk ke klasemen.');

    $score = EmbuScore::query()->whereBelongsTo($match)->firstOrFail();
    $savedMatch = $match->fresh();

    expect($score->judge_scores)->toEqual([80, 81, 82, 83, 84])
        ->and($score->duration_seconds)->toBe(121)
        ->and((float) $score->middle_score)->toBe(246.0)
        ->and((float) $score->time_penalty)->toBe(5.0)
        ->and((float) $score->final_score)->toBe(241.0)
        ->and($score->status)->toBe('verified')
        ->and($score->verified_by)->toBe($user->id)
        ->and($score->verified_at)->not->toBeNull()
        ->and($savedMatch->status)->toBe('completed')
        ->and($savedMatch->call_status)->toBe('completed')
        ->and(data_get($savedMatch->metadata, 'panitera.result_saved_by'))->toBe($user->id);

    EventFacade::assertDispatched(
        PaniteraMatchStateUpdated::class,
        fn (PaniteraMatchStateUpdated $broadcast): bool => $broadcast->matchId === $match->id
            && $broadcast->action === 'save_result'
            && $broadcast->matchStatus === 'completed',
    );

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/embu-result?event_id={$event->id}&category={$category->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('preliminaryRankings.A.0.match_id', $match->id)
            ->where('preliminaryRankings.A.0.score.status', 'verified')
            ->where('preliminaryRankings.A.0.score.final_score', 241)
        );
});

test('a clerk saves the submitted judge scores without waiting for a complete panel', function () {
    $event = createPaniteraEvent('Event Simpan Nilai Embu Parsial');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Simpan Nilai Parsial',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Tandoku Putra Parsial', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Atlet Nilai Parsial',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'timer_status' => 'stopped',
        'timer_elapsed_seconds' => 90,
        'metadata' => [
            'panitera' => [
                'finished_at' => now()->toIso8601String(),
                'duration_seconds' => 90,
                'time_penalty' => 0,
            ],
        ],
    ]);

    foreach ([1 => 80, 3 => 84] as $judgeNumber => $total) {
        $referee = Referee::create([
            'name' => "Wasit Parsial {$judgeNumber}",
            'license_number' => "PARTIAL-{$judgeNumber}",
            'is_active' => true,
        ]);

        EmbuJudgeScore::factory()->create([
            'event_id' => $event->id,
            'tournament_match_id' => $match->id,
            'event_court_id' => $court->id,
            'referee_id' => $referee->id,
            'judge_number' => $judgeNumber,
            'role' => $judgeNumber === 1 ? 'chief' : 'regional_2',
            'total_score' => $total,
        ]);
    }

    $draftReferee = Referee::create([
        'name' => 'Wasit Draft Diabaikan',
        'license_number' => 'PARTIAL-DRAFT',
        'is_active' => true,
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $draftReferee->id,
        'judge_number' => 2,
        'role' => 'regional_1',
        'total_score' => 100,
        'status' => 'draft',
        'signed_at' => null,
        'submitted_at' => null,
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('match.embu_verification.submitted_judges', 2)
            ->where('match.embu_verification.minimum_judges', 1)
            ->where('match.embu_verification.can_save', true));

    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/matches/{$match->id}/embu-result", [
            'event_id' => $event->id,
        ])
        ->assertRedirect(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertSessionHasNoErrors();

    $score = EmbuScore::query()->whereBelongsTo($match)->firstOrFail();
    $savedMatch = $match->fresh();

    expect($score->judge_scores)->toEqual([80, 84])
        ->and((float) $score->middle_score)->toBe(164.0)
        ->and((float) $score->final_score)->toBe(164.0)
        ->and($savedMatch->status)->toBe('completed')
        ->and($savedMatch->call_status)->toBe('completed')
        ->and(data_get($savedMatch->metadata, 'panitera.result_judge_count'))->toBe(2)
        ->and(data_get($savedMatch->metadata, 'panitera.result_judge_numbers'))->toBe([1, 3]);

    EventFacade::assertDispatched(
        PaniteraMatchStateUpdated::class,
        fn (PaniteraMatchStateUpdated $broadcast): bool => $broadcast->matchId === $match->id
            && $broadcast->action === 'save_result'
            && $broadcast->matchStatus === 'completed',
    );
});

test('a clerk cannot save an Embu result without a completed judge score', function () {
    $event = createPaniteraEvent('Event Nilai Embu Belum Lengkap');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Nilai Belum Lengkap',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Tandoku Belum Lengkap', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Atlet Belum Lengkap',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'timer_status' => 'stopped',
        'timer_elapsed_seconds' => 90,
        'metadata' => [
            'panitera' => [
                'finished_at' => now()->toIso8601String(),
                'duration_seconds' => 90,
                'time_penalty' => 0,
            ],
        ],
    ]);

    $this->actingAs($user)
        ->from("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->post("/admin/panitera/scoring/matches/{$match->id}/embu-result", [
            'event_id' => $event->id,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors([
            'result' => 'Nilai belum dapat disimpan. Minimal satu Wasit harus mengisi 10 aspek, menandatangani, dan mengirim nilainya.',
        ]);

    expect(EmbuScore::query()->whereBelongsTo($match)->exists())->toBeFalse()
        ->and($match->fresh()->status)->toBe('in_progress');
});

test('a clerk configures a countdown and opens the event scoped court monitor', function () {
    $event = createPaniteraEvent('Event Monitor Panitera');
    $otherEvent = createPaniteraEvent('Event Monitor Lain');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Monitor 1',
        'location' => 'Arena Utama',
        'order' => 1,
        'is_active' => true,
    ]);
    $otherCourt = EventCourt::create([
        'event_id' => $otherEvent->id,
        'name' => 'Court Event Lain',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Monitor', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'upper',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah Monitor',
        'blue_label' => 'Atlet Putih Monitor',
        'metadata' => ['placeholder' => false],
    ]);

    $this->actingAs($user)
        ->from("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'configure_timer',
            'timer_direction' => 'down',
            'timer_duration_seconds' => 5,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('timer_duration_seconds');

    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $this->actingAs($user)
        ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
            'event_id' => $event->id,
            'action' => 'configure_timer',
            'timer_direction' => 'down',
            'timer_duration_seconds' => 90,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    EventFacade::assertDispatched(
        PaniteraMatchStateUpdated::class,
        fn (PaniteraMatchStateUpdated $broadcast): bool => $broadcast->eventId === $event->id
            && $broadcast->courtId === $court->id
            && $broadcast->matchId === $match->id
            && $broadcast->action === 'configure_timer'
            && $broadcast->timer['direction'] === 'down'
            && $broadcast->timer['duration_seconds'] === 90
            && $broadcast->timer['version'] === 1,
    );

    foreach (['call_officials', 'call_participants', 'start'] as $action) {
        $this->actingAs($user)
            ->put("/admin/panitera/scoring/matches/{$match->id}/workflow", [
                'event_id' => $event->id,
                'action' => $action,
            ])
            ->assertRedirect();
    }

    expect(data_get($match->fresh()->metadata, 'panitera.timer_direction'))->toBe('down')
        ->and(data_get($match->fresh()->metadata, 'panitera.timer_duration_seconds'))->toBe(90);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/monitors/{$court->id}?event_id={$event->id}&mode=timer")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/CourtMonitor')
            ->where('activeEvent.id', $event->id)
            ->where('court.id', $court->id)
            ->where('mode', 'timer')
            ->where('monitor.active_match.id', $match->id)
            ->where('monitor.active_match.timer.direction', 'down')
            ->where('monitor.active_match.timer.duration_seconds', 90)
            ->where('monitor.active_match.timer.duration_ms', 90000)
            ->where('monitor.active_match.timer.version', 4)
            ->where('monitor.server_now_ms', fn ($value): bool => is_int($value) && $value > 0)
        );

    $this->actingAs($user)
        ->getJson("/admin/panitera/scoring/monitors/{$court->id}/state?event_id={$event->id}")
        ->assertOk()
        ->assertJsonPath('active_match.id', $match->id)
        ->assertJsonPath('active_match.timer.direction', 'down')
        ->assertJsonPath('active_match.timer.duration_ms', 90000)
        ->assertJsonPath('active_match.timer.version', 4)
        ->assertJsonPath('progress.total', 1);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/monitors/{$otherCourt->id}?event_id={$event->id}")
        ->assertNotFound();
});

test('the court monitor shows the registered Embu athletes and techniques', function () {
    $event = createPaniteraEvent('Event Monitor Peserta Embu');
    $user = createPaniteraUser($event);
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court Embu',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Pasangan Monitor', 'embu', 'embu_direct_final');
    $contingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Monitor',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Monitor',
        'phone' => '081234567891',
    ]);
    $athletes = collect(['Kenshi Monitor Satu', 'Kenshi Monitor Dua'])
        ->map(fn (string $name): Athlete => Athlete::query()->create([
            'contingent_id' => $contingent->id,
            'name' => $name,
            'gender' => 'L',
        ]));
    $entries = $athletes->map(fn (Athlete $athlete): AthleteMatchCategoryEntry => AthleteMatchCategoryEntry::query()->create([
        'event_id' => $event->id,
        'athlete_id' => $athlete->id,
        'event_match_category_id' => $category->id,
        'team_number' => 1,
    ]));
    $technique = Technique::query()->create([
        'name' => 'Ryuoken Dai Ichi',
        'order' => 1,
        'is_active' => true,
    ]);
    EmbuTeamTechnique::query()->create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'event_match_category_id' => $category->id,
        'team_number' => 1,
        'technique_id' => $technique->id,
        'order' => 1,
    ]);
    $match = TournamentMatch::query()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_entry_id' => $entries->first()->id,
        'participant_label' => 'Kontingen Monitor · Tim 1',
        'metadata' => [
            'athlete_ids' => $athletes->pluck('id')->all(),
            'contingent_id' => $contingent->id,
            'contingent_name' => $contingent->name,
            'team_number' => 1,
        ],
        'status' => 'ready',
        'call_status' => 'participants_called',
    ]);

    $this->actingAs($user)
        ->getJson("/admin/panitera/scoring/monitors/{$court->id}/state?event_id={$event->id}")
        ->assertOk()
        ->assertJsonPath('active_match.id', $match->id)
        ->assertJsonPath('active_match.participant.kind', 'Pasangan')
        ->assertJsonPath('active_match.participant.athletes.0.name', 'Kenshi Monitor Satu')
        ->assertJsonPath('active_match.participant.athletes.1.name', 'Kenshi Monitor Dua')
        ->assertJsonPath('active_match.participant.techniques.0.name', 'Ryuoken Dai Ichi');
});

test('the Panitera dashboard reports match progress for each court', function () {
    $event = createPaniteraEvent('Event Progres Court');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Progres',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Progres Court', 'embu', 'embu_direct_final');
    TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Selesai',
        'status' => 'completed',
    ]);
    $activeMatch = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 2,
        'participant_label' => 'Tim Aktif',
        'status' => 'ready',
        'call_status' => 'officials_called',
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('courts.0.id', $court->id)
            ->where('courts.0.total_matches', 2)
            ->where('courts.0.completed_matches', 1)
            ->where('courts.0.active_match.id', $activeMatch->id)
            ->where('embuMatches.0.court_id', $court->id)
        );
});

test('a clerk assigned to multiple events can switch the Panitera event context', function () {
    $firstEvent = createPaniteraEvent('Event Panitera Pertama');
    $secondEvent = createPaniteraEvent('Event Panitera Kedua');
    $user = createPaniteraUser($firstEvent);
    $secondEvent->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    $this->actingAs($user)
        ->withSession(['tenant_event_id' => $firstEvent->id, 'tenant_event_slug' => $firstEvent->slug])
        ->post('/admin/panitera/event-context', [
            'event_id' => $secondEvent->id,
            'destination' => 'embu',
        ])
        ->assertRedirect(route('admin.panitera.embu-result.index', ['event_id' => $secondEvent->id]))
        ->assertSessionHas('tenant_event_id', $secondEvent->id);
});

test('an assigned clerk stores a verified embu trimmed score with automatic penalty', function () {
    $event = createPaniteraEvent('Event Nilai Embu');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Tandoku Putra', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A · Tim 1',
        'metadata' => ['key' => 'team-a', 'contingent_name' => 'Kontingen A'],
    ]);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/embu-result/{$match->id}", [
            'event_id' => $event->id,
            'judge_scores' => [70, 80, 82, 85, 90],
            'duration_seconds' => 50,
            'tiebreak_round' => 0,
            'return_to_match' => true,
        ])
        ->assertRedirect(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertSessionHasNoErrors();

    $score = EmbuScore::firstOrFail();
    expect((float) $score->middle_score)->toBe(247.0)
        ->and((float) $score->time_penalty)->toBe(5.0)
        ->and((float) $score->final_score)->toBe(242.0)
        ->and($score->event_id)->toBe($event->id)
        ->and($match->fresh()->status)->toBe('completed')
        ->and($match->fresh()->call_status)->toBe('completed')
        ->and($match->fresh()->timer_status)->toBe('stopped');
});

test('randori rejects a drawn score and accepts a result signed by all six parties', function () {
    $event = createPaniteraEvent('Event Hasil Randori');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Putra 55 kg', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'metadata' => [
            'red' => ['label' => 'Atlet Merah', 'athlete_ids' => ['red']],
            'blue' => ['label' => 'Atlet Putih', 'athlete_ids' => ['white']],
            'placeholder' => false,
        ],
    ]);
    $empty = ['mujoken' => 0, 'ippon' => 0, 'waza_ari' => 0, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0];
    $signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    $signatures = array_fill_keys(['arbitrase', 'field_coordinator', 'referee', 'clerk', 'red_manager', 'white_manager'], $signature);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}", [
            'event_id' => $event->id,
            'aka' => $empty,
            'shiro' => $empty,
            'signatures' => $signatures,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('score');

    $aka = [...$empty, 'ippon' => 1, 'waza_ari' => 1];
    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}", [
            'event_id' => $event->id,
            'aka' => $aka,
            'shiro' => $empty,
            'signatures' => $signatures,
            'return_to_match' => true,
        ])
        ->assertRedirect(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('randori_scores', [
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'aka_total' => 15,
        'shiro_total' => 0,
        'winner_corner' => 'aka',
    ]);

    expect(RandoriScore::query()->whereBelongsTo($match)->firstOrFail()->signatures)
        ->toMatchArray($signatures);
});

test('randori requires a digital signature from each of the six approving parties', function () {
    $event = createPaniteraEvent('Event Tanda Tangan Randori');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Putri 50 kg', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'metadata' => [
            'red' => ['label' => 'Atlet Merah', 'athlete_ids' => ['red']],
            'blue' => ['label' => 'Atlet Putih', 'athlete_ids' => ['white']],
            'placeholder' => false,
        ],
    ]);
    $empty = ['mujoken' => 0, 'ippon' => 0, 'waza_ari' => 0, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0];
    $signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    $signatures = array_fill_keys(['arbitrase', 'field_coordinator', 'referee', 'clerk', 'red_manager', 'white_manager'], $signature);
    $signatures['arbitrase'] = true;

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}", [
            'event_id' => $event->id,
            'aka' => [...$empty, 'ippon' => 1],
            'shiro' => $empty,
            'signatures' => $signatures,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors([
            'signatures.arbitrase' => 'Tanda tangan Arbitrase tidak valid.',
        ]);

    expect(RandoriScore::query()->whereBelongsTo($match)->exists())->toBeFalse();
});

test('a clerk permanently locks a saved Randori result', function () {
    $event = createPaniteraEvent('Event Kunci Nilai Randori');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Kunci Nilai', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'metadata' => ['placeholder' => false],
    ]);
    $signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    $score = RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'signatures' => array_fill_keys(RandoriScore::SignatureKeys, $signature),
        'submitted_by' => $user->id,
        'verified_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}/lock", [
            'event_id' => $event->id,
        ])
        ->assertRedirect(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Nilai Randori berhasil dikunci dan tidak dapat diubah lagi.');

    expect($score->fresh())
        ->locked_by->toBe($user->id)
        ->locked_at->not->toBeNull();
});

test('the server rejects changes to a locked Randori result', function () {
    $event = createPaniteraEvent('Event Nilai Randori Terkunci');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Nilai Terkunci', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'metadata' => ['placeholder' => false],
    ]);
    $signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    $signatures = array_fill_keys(RandoriScore::SignatureKeys, $signature);
    $score = RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'signatures' => $signatures,
        'submitted_by' => $user->id,
        'verified_by' => $user->id,
        'locked_by' => $user->id,
        'locked_at' => now(),
        'notes' => 'Nilai resmi yang sudah dikunci.',
    ]);
    $changedAka = ['mujoken' => 0, 'ippon' => 2, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0];
    $shiro = ['mujoken' => 0, 'ippon' => 0, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0];

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}", [
            'event_id' => $event->id,
            'aka' => $changedAka,
            'shiro' => $shiro,
            'signatures' => $signatures,
            'notes' => 'Mencoba mengubah nilai terkunci.',
            'return_to_match' => true,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors([
            'result' => 'Nilai Randori sudah dikunci dan tidak dapat diubah lagi.',
        ]);

    expect($score->fresh())
        ->aka_total->toBe(15)
        ->notes->toBe('Nilai resmi yang sudah dikunci.');
});

test('a clerk cannot lock a Randori result from another event', function () {
    $event = createPaniteraEvent('Event Kunci Milik Panitera');
    $otherEvent = createPaniteraEvent('Event Kunci Milik Panitera Lain');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($otherEvent, 'Randori Event Lain', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $otherEvent->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah',
        'blue_label' => 'Atlet Putih',
        'metadata' => ['placeholder' => false],
    ]);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}/lock", [
            'event_id' => $event->id,
        ])
        ->assertNotFound();
});

test('embu boundary ties block finalist generation', function () {
    $event = createPaniteraEvent('Event Seri Batas Kuota');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Beregu Campuran', 'embu', 'embu_2_pools');

    foreach ([100, 90, 80, 70, 70] as $index => $finalScore) {
        $match = TournamentMatch::create([
            'tournament_drawing_id' => $drawing->id,
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'phase' => 'preliminary',
            'round_label' => 'Penyisihan Pool A',
            'pool' => 'A',
            'match_sequence' => $index + 1,
            'participant_label' => "Tim A{$index}",
            'metadata' => ['key' => "team-a-{$index}"],
        ]);
        EmbuScore::create([
            'event_id' => $event->id,
            'tournament_match_id' => $match->id,
            'judge_scores' => [$finalScore, $finalScore, $finalScore, $finalScore, $finalScore],
            'middle_score' => $finalScore,
            'final_score' => $finalScore,
            'time_penalty' => 0,
        ]);
    }
    TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool B',
        'pool' => 'B',
        'match_sequence' => 6,
        'participant_label' => 'Tim B1',
        'metadata' => ['key' => 'team-b-1'],
    ]);

    $ties = app(EmbuResultService::class)->boundaryTies($category);

    expect($ties)->toHaveCount(1)
        ->and($ties->first()['pool'])->toBe('A')
        ->and($ties->first()['rank'])->toBe(4);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/embu-result/{$category->id}/advance-finalists", ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasErrors('category');
});

test('embu champion confirmation uses preliminary plus final scores and records two bronze winners', function () {
    $event = createPaniteraEvent('Event Juara Embu');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Berpasangan Putra', 'embu', 'embu_direct_final');

    foreach ([90, 80, 70, 60] as $index => $judgeScore) {
        foreach (['preliminary', 'final'] as $phaseIndex => $phase) {
            $match = TournamentMatch::create([
                'tournament_drawing_id' => $drawing->id,
                'event_id' => $event->id,
                'event_match_category_id' => $category->id,
                'phase' => $phase,
                'round_label' => $phase === 'final' ? 'Babak Final' : 'Babak Penyisihan',
                'pool' => $phase === 'final' ? 'F' : 'A',
                'match_sequence' => ($phaseIndex * 4) + $index + 1,
                'participant_label' => "Kontingen {$index}",
                'metadata' => [
                    'key' => "team-{$index}",
                    'contingent_name' => "Kontingen {$index}",
                    'athlete_ids' => [],
                ],
            ]);
            EmbuScore::create([
                'event_id' => $event->id,
                'tournament_match_id' => $match->id,
                'judge_scores' => array_fill(0, 5, $judgeScore),
                'middle_score' => $judgeScore * 3,
                'final_score' => $judgeScore * 3,
                'time_penalty' => 0,
            ]);
        }
    }

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/embu-result/{$category->id}/confirm-champions", ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(TournamentResult::whereBelongsTo($event)->where('match_category', $category->name)->count())->toBe(4)
        ->and(TournamentResult::whereBelongsTo($event)->whereIn('rank', [3, 4])->count())->toBe(2)
        ->and(TournamentResult::whereBelongsTo($event)->where('rank', 4)->firstOrFail()->rank->label())->toBe('Perunggu Bersama (Juara 3)');
});
