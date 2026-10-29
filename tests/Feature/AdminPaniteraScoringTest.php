<?php

use App\Events\EmbuPenaltiesUpdated;
use App\Events\PaniteraMatchStateUpdated;
use App\Events\RandoriScoreStateUpdated;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Clerk;
use App\Models\Contingent;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
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

function assignPaniteraUserToCourt(Event $event, User $user, EventCourt $court): Clerk
{
    $clerk = Clerk::create([
        'name' => $user->name,
        'email' => $user->email,
        'is_active' => true,
    ]);
    $event->clerks()->attach($clerk, ['role' => 'scorer']);
    EventCourtAssignment::create([
        'event_court_id' => $court->id,
        'staff_type' => 'clerk',
        'staff_id' => $clerk->id,
        'role' => 'scorer',
    ]);

    return $clerk;
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

test('an assigned Panitera can open the dashboard from the all event option', function () {
    $event = createPaniteraEvent('Event Panitera Semua');
    $user = createPaniteraUser($event);

    $this->actingAs($user)
        ->get('/admin/panitera/scoring?event_id=all')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/Dashboard')
            ->where('activeEvent.id', $event->id));
});

test('a Super Admin Panitera view resolves the all event option without tenant context', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = createPaniteraEvent('Event Panitera Semua Admin');

    $this->actingAs($admin)
        ->get('/admin/panitera/scoring?event_id=all')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/Dashboard')
            ->where('activeEvent.id', $event->id));
});

test('the Panitera dashboard combines Embu and Randori into one scheduled list', function () {
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
            ->has('matches.data', 2)
            ->where('matches.total', 2)
            ->where('matches.data', fn ($matches): bool => collect($matches)->pluck('id')->sort()->values()->all() === collect([$embuMatch->id, $randoriMatch->id])->sort()->values()->all())
        );
});

test('an assigned Panitera sees and opens only matches from the assigned court', function () {
    $event = createPaniteraEvent('Event Court Terbatas');
    $user = createPaniteraUser($event);
    $firstCourt = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);
    $secondCourt = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);
    assignPaniteraUserToCourt($event, $user, $firstCourt);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Court Terbatas', 'embu', 'embu_direct_final');
    $firstCourtMatch = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $firstCourt->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Court 1',
        'scheduled_start_at' => '2026-11-07 08:30:00',
    ]);
    $secondCourtMatch = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $secondCourt->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 2,
        'participant_label' => 'Tim Court 2',
        'scheduled_start_at' => '2026-11-07 08:40:00',
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('isCourtRestricted', true)
            ->has('courts', 1)
            ->where('courts.0.id', $firstCourt->id)
            ->where('matches.total', 1)
            ->where('matches.data.0.id', $firstCourtMatch->id)
        );

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/matches/{$secondCourtMatch->id}?event_id={$event->id}")
        ->assertNotFound();
});

test('the Panitera dashboard paginates the combined schedule and filters completion status', function () {
    $event = createPaniteraEvent('Event Filter dan Paginasi');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Paginasi',
        'order' => 1,
        'is_active' => true,
    ]);
    [$embuCategory, $embuDrawing] = createPaniteraCategory($event, 'Embu Paginasi', 'embu', 'embu_direct_final');
    [$randoriCategory, $randoriDrawing] = createPaniteraCategory($event, 'Randori Paginasi', 'randori', 'single_elimination');

    foreach (range(1, 16) as $index) {
        $isEmbu = $index % 2 === 1;
        TournamentMatch::create([
            'tournament_drawing_id' => $isEmbu ? $embuDrawing->id : $randoriDrawing->id,
            'event_id' => $event->id,
            'event_match_category_id' => $isEmbu ? $embuCategory->id : $randoriCategory->id,
            'event_court_id' => $court->id,
            'phase' => $isEmbu ? 'preliminary' : 'upper',
            'round_label' => $isEmbu ? 'Penyisihan' : 'Babak 1',
            'match_sequence' => (int) ceil($index / 2),
            'participant_label' => $isEmbu ? "Tim Embu {$index}" : null,
            'red_label' => $isEmbu ? null : "Atlet Merah {$index}",
            'blue_label' => $isEmbu ? null : "Atlet Putih {$index}",
            'scheduled_start_at' => Carbon::parse('2026-11-07 08:00:00')->addMinutes($index * 10),
            'status' => $index <= 6 ? 'completed' : 'pending',
            'metadata' => ['placeholder' => false],
        ]);
    }

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('matches.total', 16)
            ->where('matches.per_page', 15)
            ->where('matches.last_page', 2)
            ->has('matches.data', 15)
        );

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}&status=completed")
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.status', 'completed')
            ->where('matches.total', 6)
            ->has('matches.data', 6)
            ->where('matches.data', fn ($matches): bool => collect($matches)->every(fn (array $match): bool => $match['status'] === 'completed'))
        );

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}&category_type=randori")
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.category_type', 'randori')
            ->where('matches.total', 8)
            ->has('matches.data', 8)
            ->where('matches.data', fn ($matches): bool => collect($matches)->every(fn (array $match): bool => $match['category_type'] === 'randori'))
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
    $signatureNames = [
        'arbitrase' => 'Sensei Arbitrase',
        'field_coordinator' => 'Koordinator Court 1',
        'referee' => 'Wasit Lapangan A',
        'clerk' => 'Panitera Court 1',
        'red_manager' => 'Manajer Merah',
        'white_manager' => 'Manajer Putih',
    ];
    RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'aka_breakdown' => ['mujoken' => 0, 'ippon' => 1, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0],
        'shiro_breakdown' => ['mujoken' => 0, 'ippon' => 0, 'waza_ari' => 1, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0],
        'signatures' => $signatures,
        'signature_names' => $signatureNames,
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
            ->where('match.result.signature_names.arbitrase', 'Sensei Arbitrase')
            ->where('match.result.signature_names.white_manager', 'Manajer Putih')
            ->where('match.result.notes', 'Keputusan final meja Panitera.')
        );
});

test('the next match follows the later court schedule instead of an older unfinished match', function () {
    $event = createPaniteraEvent('Event Urutan Jadwal Panitera');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Urutan',
        'order' => 1,
        'is_active' => true,
    ]);
    [$embuCategory, $embuDrawing] = createPaniteraCategory($event, 'Embu Jadwal Lama', 'embu', 'embu_direct_final');
    [$randoriCategory, $randoriDrawing] = createPaniteraCategory($event, 'Randori Jadwal Aktif', 'randori', 'single_elimination');
    TournamentMatch::create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Lama Belum Selesai',
        'scheduled_start_at' => '2026-11-07 10:00:00',
        'status' => 'pending',
    ]);
    $currentMatch = TournamentMatch::create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'upper',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'red_label' => 'Atlet Merah Saat Ini',
        'blue_label' => 'Atlet Putih Saat Ini',
        'scheduled_start_at' => '2026-11-08 09:40:00',
        'status' => 'in_progress',
        'metadata' => ['placeholder' => false],
    ]);
    $scheduledNextMatch = TournamentMatch::create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'upper',
        'round_label' => 'Babak 1',
        'match_sequence' => 2,
        'red_label' => 'Atlet Merah Berikutnya',
        'blue_label' => 'Atlet Putih Berikutnya',
        'scheduled_start_at' => '2026-11-08 09:50:00',
        'status' => 'pending',
        'metadata' => ['placeholder' => false],
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/matches/{$currentMatch->id}?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('nextMatch.id', $scheduledNextMatch->id)
            ->where('nextMatch.category_type', 'randori')
            ->where('nextMatch.scheduled_at', '08 Nov 2026, 09:50')
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

    EventFacade::fake([PaniteraMatchStateUpdated::class]);

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

    EventFacade::assertDispatched(PaniteraMatchStateUpdated::class, fn ($broadcast): bool => $broadcast->matchId === $firstMatch->id
        && $broadcast->action === 'release' && $broadcast->timer['status'] === 'stopped' && $broadcast->timer['version'] === 4);
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
            && $broadcast->timer['direction'] === 'up'
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

test('timer direction follows the category and its run is shared with the monitor', function (string $type, string $direction) {
    $this->freezeTime();
    $event = createPaniteraEvent('Automatic Timer '.$type);
    $user = createPaniteraUser($event);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    [$category, $drawing] = createPaniteraCategory($event, 'Automatic '.$type, $type, $type === 'embu' ? 'embu_direct_final' : 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id, 'event_id' => $event->id,
        'event_match_category_id' => $category->id, 'event_court_id' => $court->id,
        'phase' => 'final', 'round_label' => 'Final', 'match_sequence' => 1,
        'status' => 'ready', 'call_status' => 'participants_called',
        'metadata' => ['panitera' => ['timer_direction' => $direction === 'up' ? 'down' : 'up']],
    ]);
    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $response = $this->actingAs($user)->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'start', 'timer_version' => 0,
    ])->assertOk()
        ->assertJsonPath('timer.direction', $direction)
        ->assertJsonPath('timer.duration_ms', 120000)
        ->assertJsonPath('timer.category_type', $type)
        ->assertJsonPath('timer.run_id', 1)
        ->assertJsonPath('timer.elapsed_ms', 0);

    $this->assertDatabaseHas('tournament_matches', [
        'id' => $match->id, 'timer_status' => 'running', 'timer_version' => 1,
    ]);
    EventFacade::assertDispatched(PaniteraMatchStateUpdated::class, fn ($broadcast): bool => $broadcast->timer === $response->json('timer'));

    $this->getJson("/admin/panitera/scoring/monitors/{$court->id}/timer?event_id={$event->id}")
        ->assertOk()->assertJsonPath('timer', $response->json('timer'));
    $this->get("/admin/panitera/scoring/matches/{$match->id}?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page->where('match.timer.direction', $direction)->where('match.timer.run_id', 1));
    $this->getJson("/admin/panitera/scoring/monitors/{$court->id}/state?event_id={$event->id}")
        ->assertOk()->assertJsonPath('active_match.timer', $response->json('timer'));
})->with([['embu', 'up'], ['randori', 'down']]);

test('an expired Randori timer starts a fresh two minute run and rejects a competing stale restart', function () {
    $this->freezeTime();
    $event = createPaniteraEvent('Randori Repeat Timer');
    $user = createPaniteraUser($event);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Repeat', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id, 'event_id' => $event->id,
        'event_match_category_id' => $category->id, 'event_court_id' => $court->id,
        'phase' => 'final', 'round_label' => 'Final', 'match_sequence' => 1,
        'status' => 'in_progress', 'call_status' => 'participants_called',
        'timer_status' => 'running', 'timer_elapsed_ms' => 30000, 'timer_elapsed_seconds' => 30,
        'timer_started_at' => now()->subSeconds(95), 'timer_started_at_ms' => now()->getTimestampMs() - 95000,
        'timer_version' => 4, 'metadata' => ['panitera' => ['timer_run_id' => 1]],
    ]);
    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $response = $this->actingAs($user)->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'start', 'timer_version' => 4,
    ])->assertOk()->assertJsonPath('timer.elapsed_ms', 0)->assertJsonPath('timer.elapsed_seconds', 0)
        ->assertJsonPath('timer.status', 'running')->assertJsonPath('timer.run_id', 5)
        ->assertJsonPath('timer.started_at_ms', now()->getTimestampMs())
        ->assertJsonPath('timer.duration_ms', 120000)->assertJsonPath('timer.is_finished', false);

    $this->assertDatabaseHas('tournament_matches', [
        'id' => $match->id, 'status' => 'in_progress', 'timer_status' => 'running',
        'timer_elapsed_ms' => 0, 'timer_elapsed_seconds' => 0, 'timer_version' => 5,
    ]);
    EventFacade::assertDispatched(PaniteraMatchStateUpdated::class, fn ($broadcast): bool => $broadcast->timer === $response->json('timer'));

    $this->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'start', 'timer_version' => 4,
    ])->assertUnprocessable()->assertJsonValidationErrors('timer');
    $this->assertDatabaseHas('tournament_matches', ['id' => $match->id, 'timer_version' => 5, 'timer_elapsed_ms' => 0]);

    $this->travel(10)->seconds();
    $this->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'pause', 'timer_version' => 5,
    ])->assertOk()->assertJsonPath('timer.elapsed_ms', 10000)->assertJsonPath('timer.run_id', 5);
    $this->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'start', 'timer_version' => 6,
    ])->assertOk()->assertJsonPath('timer.elapsed_ms', 10000)->assertJsonPath('timer.run_id', 5);
});

test('pausing after two minutes caps Randori time but preserves the full Embu duration', function (string $type, int $elapsed) {
    $this->freezeTime();
    $event = createPaniteraEvent('Time Limit '.$type);
    $user = createPaniteraUser($event);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    [$category, $drawing] = createPaniteraCategory($event, 'Time Limit '.$type, $type, $type === 'embu' ? 'embu_direct_final' : 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id, 'event_id' => $event->id,
        'event_match_category_id' => $category->id, 'event_court_id' => $court->id,
        'phase' => 'final', 'round_label' => 'Final', 'match_sequence' => 1,
        'status' => 'in_progress', 'call_status' => 'participants_called',
        'timer_status' => 'running', 'timer_started_at' => now()->subSeconds(125),
        'timer_started_at_ms' => now()->getTimestampMs() - 125000,
    ]);
    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $response = $this->actingAs($user)->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'pause', 'timer_version' => 0,
    ])->assertOk()->assertJsonPath('timer.elapsed_ms', $elapsed)
        ->assertJsonPath('timer.is_finished', false);

    $this->assertDatabaseHas('tournament_matches', [
        'id' => $match->id, 'status' => 'in_progress', 'timer_status' => 'paused', 'timer_elapsed_ms' => $elapsed,
    ]);
    EventFacade::assertDispatched(PaniteraMatchStateUpdated::class, fn ($broadcast): bool => $broadcast->timer === $response->json('timer'));
})->with([['embu', 125000], ['randori', 120000]]);

test('lightweight timer snapshots share precise state without returning scores or signatures', function () {
    $this->travelTo(Carbon::parse('2026-11-07 09:00:05.250'));
    $event = createPaniteraEvent('Snapshot Timer');
    $user = createPaniteraUser($event);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Timer', 'randori', 'double_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id, 'event_id' => $event->id,
        'event_match_category_id' => $category->id, 'event_court_id' => $court->id,
        'phase' => 'upper', 'round_label' => 'Upper Bracket', 'match_sequence' => 1,
        'status' => 'in_progress', 'call_status' => 'participants_called', 'called_at' => now(),
        'timer_status' => 'running', 'timer_started_at' => now()->subSeconds(5),
        'timer_started_at_ms' => now()->getTimestampMs() - 5250,
        'timer_elapsed_ms' => 32400, 'timer_version' => 7,
        'metadata' => ['panitera' => ['timer_direction' => 'down', 'timer_duration_seconds' => 90]],
    ]);
    $this->withServerVariables(['REQUEST_TIME_FLOAT' => (now()->getTimestampMs() - 20) / 1000]);

    foreach (["matches/{$match->id}", "monitors/{$court->id}"] as $path) {
        $this->actingAs($user)->getJson("/admin/panitera/scoring/{$path}/timer?event_id={$event->id}")
            ->assertOk()
            ->assertHeaderContains('Cache-Control', 'no-store')
            ->assertJsonPath('match_id', $match->id)
            ->assertJsonPath('event_id', $event->id)
            ->assertJsonPath('court_id', $court->id)
            ->assertJsonPath('timer.elapsed_ms', 32400)
            ->assertJsonPath('timer.started_at_ms', now()->getTimestampMs() - 5250)
            ->assertJsonPath('timer.duration_ms', 90000)
            ->assertJsonPath('timer.direction', 'down')
            ->assertJsonPath('timer.version', 7)
            ->assertJsonPath('observed_at_ms', now()->getTimestampMs())
            ->assertJsonPath('server_received_at_ms', now()->getTimestampMs() - 20)
            ->assertJsonPath('server_now_ms', now()->getTimestampMs())
            ->assertJsonMissingPaths(['result', 'staff', 'judgeProgress', 'signatures']);
    }
    expect($match->fresh()->timer_version)->toBe(7);
});

test('json timer commands return the authoritative state without redirecting the operator', function () {
    $this->travelTo(Carbon::parse('2026-11-07 09:00:05.250'));
    $event = createPaniteraEvent('JSON Timer');
    $user = createPaniteraUser($event);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court JSON', 'order' => 1]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu JSON Timer', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id, 'event_id' => $event->id,
        'event_match_category_id' => $category->id, 'event_court_id' => $court->id,
        'phase' => 'final', 'round_label' => 'Final', 'match_sequence' => 1,
        'status' => 'in_progress', 'call_status' => 'participants_called',
        'timer_status' => 'running', 'timer_started_at' => now()->subSeconds(5),
        'timer_started_at_ms' => now()->getTimestampMs() - 5250,
        'timer_elapsed_ms' => 32400, 'timer_version' => 7,
    ]);
    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $response = $this->actingAs($user)->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'pause', 'timer_version' => 7,
    ])->assertOk()->assertHeaderMissing('Location')
        ->assertJsonPath('timer.status', 'paused')->assertJsonPath('timer.elapsed_ms', 37650)->assertJsonPath('timer.version', 8);

    $this->assertDatabaseHas('tournament_matches', ['id' => $match->id, 'timer_status' => 'paused', 'timer_elapsed_ms' => 37650, 'timer_version' => 8]);
    EventFacade::assertDispatched(PaniteraMatchStateUpdated::class, fn ($event): bool => $event->timer === $response->json('timer'));

    $this->actingAs($user)->putJson("/admin/panitera/scoring/matches/{$match->id}/workflow", [
        'event_id' => $event->id, 'action' => 'reset_timer', 'timer_version' => 7,
    ])->assertUnprocessable()->assertJsonValidationErrors('timer');
    $this->assertDatabaseHas('tournament_matches', ['id' => $match->id, 'timer_status' => 'paused', 'timer_elapsed_ms' => 37650, 'timer_version' => 8]);
    EventFacade::assertDispatchedTimes(PaniteraMatchStateUpdated::class, 1);
});

test('timer snapshots are scoped to the authenticated event and assigned court', function () {
    $event = createPaniteraEvent('Timer Access');
    $otherEvent = createPaniteraEvent('Other Timer Event');
    $user = createPaniteraUser($event);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court Assigned', 'order' => 1]);
    $otherCourt = EventCourt::create(['event_id' => $event->id, 'name' => 'Court Other', 'order' => 2]);
    assignPaniteraUserToCourt($event, $user, $court);
    [$category, $drawing] = createPaniteraCategory($event, 'Timer Scoped', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id, 'event_id' => $event->id,
        'event_match_category_id' => $category->id, 'event_court_id' => $otherCourt->id,
        'phase' => 'final', 'round_label' => 'Final', 'match_sequence' => 1, 'status' => 'pending',
    ]);

    $this->getJson("/admin/panitera/scoring/monitors/{$court->id}/timer?event_id={$event->id}")->assertUnauthorized();
    $this->actingAs($user)->getJson("/admin/panitera/scoring/monitors/{$court->id}/timer?event_id={$event->id}")
        ->assertOk()->assertJsonPath('match_id', null)->assertJsonPath('timer', null);
    $this->actingAs($user)->getJson("/admin/panitera/scoring/monitors/{$otherCourt->id}/timer?event_id={$event->id}")->assertNotFound();
    $this->actingAs($user)->getJson("/admin/panitera/scoring/matches/{$match->id}/timer?event_id={$event->id}")->assertNotFound();
    $this->actingAs($user)->getJson("/admin/panitera/scoring/monitors/{$court->id}/timer?event_id={$otherEvent->id}")->assertNotFound();
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

test('a clerk records shared Embu technical penalties and immediately updates the final score', function () {
    $event = createPaniteraEvent('Event Denda Teknis Panitera');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Denda Teknis',
        'order' => 1,
        'is_active' => true,
    ]);
    assignPaniteraUserToCourt($event, $user, $court);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Beregu Putra', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Denda Teknis',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'timer_status' => 'paused',
        'timer_elapsed_seconds' => 100,
    ]);
    $referee = Referee::create([
        'name' => 'Wasit Utama Denda',
        'license_number' => 'PENALTY-CHIEF',
        'is_active' => true,
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'judge_number' => 1,
        'role' => 'chief',
        'total_score' => 80,
    ]);
    EventFacade::fake([EmbuPenaltiesUpdated::class]);

    $this->actingAs($user)
        ->put(route('admin.panitera.matches.embu-penalties.update', $match, false), [
            'event_id' => $event->id,
            'violation_penalties' => [
                'composition_count' => 1,
                'rank_mismatch' => 3,
                'group_unsynchronized' => 0,
                'group_signal' => 0,
                'group_composition_mismatch' => 0,
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Denda teknis Embu berhasil disimpan dan nilai akhir langsung diperbarui.');

    $savedMatch = $match->fresh();
    $aggregateScore = EmbuScore::query()->whereBelongsTo($match)->firstOrFail();

    expect(data_get($savedMatch->metadata, 'panitera.violation_penalties'))->toBe([
        'composition_count' => 1,
        'rank_mismatch' => 3,
    ])->and(data_get($savedMatch->metadata, 'panitera.violation_penalty_source'))->toBe('panitera')
        ->and(data_get($savedMatch->metadata, 'panitera.violation_penalty_updated_by'))->toBe($user->id)
        ->and($aggregateScore->judge_scores)->toEqual([80])
        ->and((float) $aggregateScore->middle_score)->toBe(80.0)
        ->and((float) $aggregateScore->violation_penalty)->toBe(40.0)
        ->and((float) $aggregateScore->final_score)->toBe(40.0);

    EventFacade::assertDispatched(EmbuPenaltiesUpdated::class, fn (EmbuPenaltiesUpdated $updated): bool => $updated->matchId === $match->id
        && $updated->source === 'panitera'
        && $updated->penaltyPoints === 40.0);

    $this->actingAs($user)
        ->get(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->has('match.embu_penalties.options', 5)
            ->where('match.embu_penalties.values.composition_count', 1)
            ->where('match.embu_penalties.values.rank_mismatch', 3)
            ->where('match.embu_penalties.points', 40)
            ->where('match.embu_penalties.source_label', 'Panitera')
            ->where('match.result.final_score', 40)
            ->where('judgeProgress.0.violation_penalty', 40));
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

test('finishing an Embu match over three minutes marks its result as disqualified', function () {
    $this->travelTo(Carbon::parse('2026-11-07 09:03:01'));

    $event = createPaniteraEvent('Event Diskualifikasi Waktu');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Diskualifikasi',
        'order' => 1,
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Beregu Putra', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Melebihi Waktu',
        'status' => 'in_progress',
        'call_status' => 'participants_called',
        'timer_status' => 'running',
        'timer_started_at' => now()->subSeconds(181),
    ]);
    EmbuScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'tiebreak_round' => 0,
        'judge_scores' => [80, 81, 82, 83, 84],
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
        ->assertSessionHasNoErrors();

    $score = EmbuScore::query()->whereBelongsTo($match)->firstOrFail();
    expect($score->duration_seconds)->toBe(181)
        ->and($score->is_disqualified)->toBeTrue()
        ->and($score->disqualification_reason)->toBe('Durasi Embu melebihi batas maksimum 3 menit.')
        ->and((float) $score->final_score)->toBe(0.0)
        ->and(data_get($match->fresh()->metadata, 'panitera.is_disqualified'))->toBeTrue();
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
            'violation_penalties' => $index === 0 ? [
                'composition_count' => 1,
                'rank_mismatch' => 1,
            ] : [],
            'violation_penalty' => $index === 0 ? 20 : 0,
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
        ->and((float) $score->violation_penalty)->toBe(20.0)
        ->and((float) $score->total_penalty)->toBe(25.0)
        ->and($score->violation_penalties)->toBe([
            'composition_count' => 1,
            'rank_mismatch' => 1,
        ])
        ->and((float) $score->final_score)->toBe(221.0)
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
            ->where('preliminaryRankings.A.0.score.final_score', 221)
        );
});

test('a clerk accumulates completed judge scores even when a judge has not signed', function () {
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
            ->where('match.embu_verification.completed_judges', 3)
            ->where('match.embu_verification.signed_judges', 2)
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

    expect($score->judge_scores)->toEqual([80, 100, 84])
        ->and((float) $score->middle_score)->toBe(264.0)
        ->and((float) $score->final_score)->toBe(264.0)
        ->and($savedMatch->status)->toBe('completed')
        ->and($savedMatch->call_status)->toBe('completed')
        ->and(data_get($savedMatch->metadata, 'panitera.result_judge_count'))->toBe(3)
        ->and(data_get($savedMatch->metadata, 'panitera.result_judge_numbers'))->toBe([1, 2, 3]);

    EventFacade::assertDispatched(
        PaniteraMatchStateUpdated::class,
        fn (PaniteraMatchStateUpdated $broadcast): bool => $broadcast->matchId === $match->id
            && $broadcast->action === 'save_result'
            && $broadcast->matchStatus === 'completed',
    );
});

test('a clerk reopens a verified Embu result while preserving the judge draft', function () {
    $event = createPaniteraEvent('Event Buka Ulang Nilai Embu');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Buka Ulang',
        'order' => 1,
        'is_active' => true,
    ]);
    assignPaniteraUserToCourt($event, $user, $court);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Tandoku Buka Ulang', 'embu', 'embu_direct_final');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Atlet Koreksi Nilai',
        'status' => 'completed',
        'call_status' => 'completed',
        'timer_status' => 'stopped',
        'timer_elapsed_seconds' => 90,
        'timer_elapsed_ms' => 90000,
        'timer_version' => 4,
        'metadata' => [
            'panitera' => [
                'finished_at' => now()->toIso8601String(),
                'duration_seconds' => 90,
                'time_penalty' => 0,
                'result_saved_at' => now()->toIso8601String(),
                'result_saved_by' => $user->id,
                'result_judge_count' => 1,
                'result_judge_numbers' => [1],
            ],
        ],
    ]);
    $referee = Referee::create([
        'name' => 'Wasit Koreksi Nilai',
        'license_number' => 'REOPEN-CHIEF',
        'is_active' => true,
    ]);
    $judgeScore = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'judge_number' => 1,
        'role' => 'chief',
        'total_score' => 80,
    ]);
    $score = EmbuScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'tiebreak_round' => 0,
        'judge_scores' => [80],
        'duration_seconds' => 90,
        'time_penalty' => 0,
        'middle_score' => 80,
        'final_score' => 80,
        'status' => 'verified',
        'submitted_by' => $user->id,
        'verified_by' => $user->id,
        'verified_at' => now(),
    ]);
    EventFacade::fake([PaniteraMatchStateUpdated::class]);

    $this->actingAs($user)
        ->delete(route('admin.panitera.matches.embu-result.destroy', $match, false), [
            'event_id' => $event->id,
        ])
        ->assertRedirect(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Form penilaian Wasit berhasil dibuka ulang. Nilai lama tetap tersedia sebagai draft dan hasil harus disimpan ulang.');

    $reopenedMatch = $match->fresh();
    $reopenedScore = $score->fresh();
    $preservedJudgeScore = $judgeScore->fresh();

    expect($reopenedMatch->status)->toBe('in_progress')
        ->and($reopenedMatch->call_status)->toBe('participants_called')
        ->and($reopenedMatch->timer_status)->toBe('stopped')
        ->and($reopenedMatch->timer_version)->toBe(5)
        ->and(data_get($reopenedMatch->metadata, 'panitera.result_saved_at'))->toBeNull()
        ->and(data_get($reopenedMatch->metadata, 'panitera.result_reopened_by'))->toBe($user->id)
        ->and(data_get($reopenedMatch->metadata, 'panitera.result_reopened_at'))->not->toBeNull();
    expect($reopenedScore->status)->toBe('draft')
        ->and($reopenedScore->verified_by)->toBeNull()
        ->and($reopenedScore->verified_at)->toBeNull();
    expect($preservedJudgeScore->total_score)->toBe('80.00')
        ->and($preservedJudgeScore->completed_items)->toBe(10)
        ->and($preservedJudgeScore->signature)->toBe($judgeScore->signature);

    EventFacade::assertDispatched(
        PaniteraMatchStateUpdated::class,
        fn (PaniteraMatchStateUpdated $broadcast): bool => $broadcast->matchId === $match->id
            && $broadcast->action === 'reopen_result'
            && $broadcast->matchStatus === 'in_progress'
            && $broadcast->callStatus === 'participants_called',
    );

    $this->actingAs($user)
        ->get(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->where('match.embu_verification.is_saved', false)
            ->where('match.embu_verification.can_save', true)
            ->where('match.result.status', 'draft')
            ->where('match.result.final_score', 80));
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
            'result' => 'Nilai belum dapat disimpan. Minimal satu Wasit harus mengisi 10 aspek secara lengkap.',
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

test('the officials monitor exposes only referees ordered by judge position', function () {
    $event = createPaniteraEvent('Event Monitor Wasit');
    $user = createPaniteraUser($event);
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court Wasit',
        'order' => 1,
        'is_active' => true,
    ]);
    assignPaniteraUserToCourt($event, $user, $court);
    $chief = Referee::query()->create(['name' => 'Wasit Utama Monitor', 'gender' => 'male', 'is_active' => true]);
    $assistant = Referee::query()->create(['name' => 'Wasit Pembantu Monitor', 'gender' => 'female', 'is_active' => true]);
    $event->referees()->attach($chief, ['role' => 'chief']);
    $event->referees()->attach($assistant, ['role' => 'judge']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $assistant->id, 'role' => 'assistant_2']);
    EventCourtAssignment::query()->create(['event_court_id' => $court->id, 'staff_type' => 'referee', 'staff_id' => $chief->id, 'role' => 'chief']);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/monitors/{$court->id}?event_id={$event->id}&mode=officials")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/CourtMonitor')
            ->where('mode', 'officials')
            ->has('monitor.staff', 2)
            ->where('monitor.staff.0.name', 'Wasit Utama Monitor')
            ->where('monitor.staff.0.judge_number', 1)
            ->where('monitor.staff.1.name', 'Wasit Pembantu Monitor')
            ->where('monitor.staff.1.judge_number', 5)
            ->where('monitor.staff.0.type', 'referee'));
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
            ->where('matches.data.0.court_id', $court->id)
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
    $this->freezeTime();
    $event = createPaniteraEvent('Event Hasil Randori');
    $user = createPaniteraUser($event);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Putra 55 kg', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'status' => 'in_progress',
        'timer_status' => 'running',
        'timer_started_at' => now()->subSeconds(135),
        'timer_started_at_ms' => now()->getTimestampMs() - 135000,
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
    $signatureNames = [
        'arbitrase' => 'Arbitrase Utama',
        'field_coordinator' => 'Koordinator Lapangan',
        'referee' => 'Wasit Lapangan',
        'clerk' => 'Panitera Meja',
        'red_manager' => 'Manajer Merah',
        'white_manager' => 'Manajer Putih',
    ];

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
    EventFacade::fake([PaniteraMatchStateUpdated::class]);
    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}", [
            'event_id' => $event->id,
            'aka' => $aka,
            'shiro' => $empty,
            'signatures' => $signatures,
            'signature_names' => $signatureNames,
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

    $savedScore = RandoriScore::query()->whereBelongsTo($match)->firstOrFail();

    $this->assertDatabaseHas('tournament_matches', [
        'id' => $match->id, 'status' => 'completed', 'timer_status' => 'stopped',
        'timer_elapsed_ms' => 120000, 'timer_started_at_ms' => null,
    ]);
    EventFacade::assertDispatched(PaniteraMatchStateUpdated::class, fn ($broadcast): bool => $broadcast->matchId === $match->id
        && $broadcast->courtId === $court->id && $broadcast->matchStatus === 'completed'
        && $broadcast->timer['status'] === 'stopped' && $broadcast->timer['elapsed_ms'] === 120000);

    expect($savedScore->signatures)->toMatchArray($signatures)
        ->and($savedScore->signature_names)->toMatchArray($signatureNames);
});

test('randori score and signature drafts are broadcast and restored for another device', function () {
    $event = createPaniteraEvent('Event Draft Realtime Randori');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Realtime 60 kg', 'randori', 'single_elimination');
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
    EventFacade::fake([RandoriScoreStateUpdated::class]);

    $this->actingAs($user)
        ->putJson("/admin/panitera/scoring/randori-result/{$match->id}/draft", [
            'event_id' => $event->id,
            'client_id' => 'device-panitera-a',
            'changes' => [
                'aka' => ['ippon' => 1],
                'signatures' => ['arbitrase' => $signature],
                'signature_names' => ['arbitrase' => 'Arbitrase Realtime'],
                'notes' => 'Draft dari meja utama.',
            ],
        ])
        ->assertOk()
        ->assertJson([
            'version' => 1,
            'changed' => true,
        ]);

    EventFacade::assertDispatched(
        RandoriScoreStateUpdated::class,
        fn (RandoriScoreStateUpdated $broadcast): bool => $broadcast->eventId === $event->id
            && $broadcast->matchId === $match->id
            && $broadcast->action === 'draft_updated'
            && $broadcast->version === 1
            && $broadcast->clientId === 'device-panitera-a'
            && $broadcast->changes['aka']['ippon'] === 1
            && $broadcast->changes['signatures']['arbitrase'] === $signature,
    );

    $this->actingAs($user)
        ->putJson("/admin/panitera/scoring/randori-result/{$match->id}/draft", [
            'event_id' => $event->id,
            'client_id' => 'device-panitera-b',
            'changes' => [
                'shiro' => ['waza_ari' => 1],
                'signatures' => ['referee' => $signature],
            ],
        ])
        ->assertOk()
        ->assertJson([
            'version' => 2,
            'changed' => true,
        ]);

    EventFacade::assertDispatched(
        RandoriScoreStateUpdated::class,
        fn (RandoriScoreStateUpdated $broadcast): bool => $broadcast->version === 2
            && $broadcast->clientId === 'device-panitera-b'
            && $broadcast->changes['shiro']['waza_ari'] === 1
            && $broadcast->changes['signatures']['referee'] === $signature,
    );

    $this->actingAs($user)
        ->get(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('match.randori_draft.version', 2)
            ->where('match.randori_draft.aka.ippon', 1)
            ->where('match.randori_draft.shiro.waza_ari', 1)
            ->where('match.randori_draft.signatures.arbitrase', $signature)
            ->where('match.randori_draft.signatures.referee', $signature)
            ->where('match.randori_draft.signature_names.arbitrase', 'Arbitrase Realtime')
            ->where('match.randori_draft.notes', 'Draft dari meja utama.'));
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

test('completed matches expose result summaries in the dashboard match list', function () {
    $event = createPaniteraEvent('Event Hasil Dashboard');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court Hasil',
        'order' => 1,
        'is_active' => true,
    ]);
    [$embuCategory, $embuDrawing] = createPaniteraCategory($event, 'Embu Hasil', 'embu', 'embu_direct_final');
    [$randoriCategory, $randoriDrawing] = createPaniteraCategory($event, 'Randori Hasil', 'randori', 'single_elimination');

    $embuMatch = TournamentMatch::create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'participant_label' => 'Pasangan Kenshi A & B',
        'status' => 'completed',
        'metadata' => ['placeholder' => false],
    ]);
    EmbuScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'judge_scores' => [88.0, 89.0, 90.0, 88.5, 89.5],
        'middle_score' => 267.0,
        'final_score' => 265.0,
        'time_penalty' => 2.0,
        'status' => 'verified',
    ]);

    $randoriMatch = TournamentMatch::create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'event_court_id' => $court->id,
        'phase' => 'upper',
        'round_label' => 'Babak 1',
        'match_sequence' => 2,
        'red_label' => 'Atlet AKA',
        'blue_label' => 'Atlet SHIRO',
        'status' => 'completed',
        'metadata' => ['placeholder' => false],
    ]);
    RandoriScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $randoriMatch->id,
        'aka_breakdown' => [],
        'shiro_breakdown' => [],
        'aka_total' => 3,
        'shiro_total' => 1,
        'winner_corner' => 'aka',
        'status' => 'verified',
        'locked_at' => now(),
        'signatures' => ['referee' => true, 'clerk' => true],
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring?event_id={$event->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/Dashboard')
            ->where('matches.data.0.result.type', 'embu')
            ->where('matches.data.0.result.final_score', 265)
            ->where('matches.data.0.result.status', 'verified')
            ->where('matches.data.1.result.type', 'randori')
            ->where('matches.data.1.result.winner_corner', 'aka')
            ->where('matches.data.1.result.aka_total', 3)
            ->where('matches.data.1.result.shiro_total', 1)
            ->where('matches.data.1.result.is_locked', true)
        );
});

test('panitera views embu result as read-only while admin can input and update scores', function () {
    $event = createPaniteraEvent('Event Embu Result Roles');
    $panitera = createPaniteraUser($event);
    $admin = User::factory()->create();
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $admin->assignRole('Admin');
    $event->users()->attach($admin, ['access_role' => Event::AccessRoleAdmin]);

    [$category, $drawing] = createPaniteraCategory($event, 'Embu Berpasangan Putra', 'embu', 'embu_pool_cross');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A · Pasangan 1',
        'metadata' => ['key' => 'team-1', 'contingent_name' => 'Kontingen A'],
    ]);

    // 1. Panitera only views recap (canInputScore = false, canOverrideScore = false)
    $this->actingAs($panitera)
        ->get("/admin/panitera/scoring/embu-result?event_id={$event->id}&category={$category->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/EmbuResult')
            ->where('canManage', true)
            ->where('canInputScore', false)
            ->where('canOverrideScore', false)
        );

    // Panitera cannot manually post scores from recap
    $this->actingAs($panitera)
        ->post("/admin/panitera/scoring/embu-result/{$match->id}", [
            'event_id' => $event->id,
            'judge_scores' => [75, 76, 77, 78, 79],
            'duration_seconds' => 110,
            'tiebreak_round' => 0,
        ])
        ->assertForbidden();

    // 2. Admin has full rights (canInputScore = true, canOverrideScore = true)
    $this->actingAs($admin)
        ->get("/admin/panitera/scoring/embu-result?event_id={$event->id}&category={$category->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/EmbuResult')
            ->where('canManage', true)
            ->where('canInputScore', true)
            ->where('canOverrideScore', true)
        );

    // Admin can input initial score
    $this->actingAs($admin)
        ->post("/admin/panitera/scoring/embu-result/{$match->id}", [
            'event_id' => $event->id,
            'judge_scores' => [75, 76, 77, 78, 79],
            'duration_seconds' => 110,
            'tiebreak_round' => 0,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $score = EmbuScore::whereBelongsTo($match)->first();
    expect($score)->not->toBeNull()
        ->and((float) $score->middle_score)->toBe(231.0);

    // Admin can update / override score
    $this->actingAs($admin)
        ->post("/admin/panitera/scoring/embu-result/{$match->id}", [
            'event_id' => $event->id,
            'judge_scores' => [80, 81, 82, 83, 84],
            'duration_seconds' => 115,
            'tiebreak_round' => 0,
            'notes' => 'Koreksi nilai oleh Admin',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $updatedScore = $score->fresh();
    expect((float) $updatedScore->middle_score)->toBe(246.0)
        ->and($updatedScore->notes)->toBe('Koreksi nilai oleh Admin');
});

test('randori 2x waza-ari automatically triggers waza-ari awasete ippon and records win method', function () {
    $event = createPaniteraEvent('Event Randori Auto Ippon');
    $user = createPaniteraUser($event);
    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'is_active' => true,
    ]);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Dewasa Putra 60kg', 'randori', 'single_elimination');
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'status' => 'ready',
        'timer_status' => 'running',
        'timer_started_at_ms' => now()->getTimestampMs() - 45000,
        'timer_elapsed_ms' => 45000,
        'metadata' => [
            'red' => ['contingent_name' => 'Aka Surabaya'],
            'blue' => ['contingent_name' => 'Shiro Malang'],
        ],
    ]);

    $empty = ['mujoken' => 0, 'ippon' => 0, 'waza_ari' => 0, 'yusei' => 0, 'batsu_5' => 0, 'batsu_10' => 0];
    $signatures = [
        'arbitrase' => 'data:image/png;base64,aaa',
        'field_coordinator' => 'data:image/png;base64,bbb',
        'referee' => 'data:image/png;base64,ccc',
        'clerk' => 'data:image/png;base64,ddd',
        'red_manager' => 'data:image/png;base64,eee',
        'white_manager' => 'data:image/png;base64,fff',
    ];

    $aka = [...$empty, 'waza_ari' => 2];
    $this->actingAs($user)
        ->post("/admin/panitera/scoring/randori-result/{$match->id}", [
            'event_id' => $event->id,
            'aka' => $aka,
            'shiro' => $empty,
            'signatures' => $signatures,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $match->refresh();
    expect($match->metadata['result']['win_method'])->toBe('waza_ari_awasete_ippon')
        ->and($match->metadata['result']['is_auto_ippon'])->toBeTrue()
        ->and($match->metadata['result']['winner_corner'])->toBe('aka');
});

test('embu multi-tier tiebreak and manual tiebreak decision resolve tied rankings', function () {
    $event = createPaniteraEvent('Event Embu Tiebreak A-E');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Embu Berpasangan Putri', 'embu', 'embu_2_pools');

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Tim Alpha',
        'metadata' => ['key' => 'team-alpha'],
    ]);
    EmbuScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $matchA->id,
        'judge_scores' => [80, 80, 80, 80, 80],
        'middle_score' => 240,
        'final_score' => 240,
        'time_penalty' => 0,
    ]);

    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Tim Beta',
        'metadata' => ['key' => 'team-beta'],
    ]);
    EmbuScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $matchB->id,
        'judge_scores' => [80, 80, 80, 80, 80],
        'middle_score' => 240,
        'final_score' => 240,
        'time_penalty' => 0,
    ]);

    $service = app(EmbuResultService::class);
    $rankingsBefore = $service->preliminaryRankings($category)->get('A');
    expect($rankingsBefore)->toHaveCount(2);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/embu-result/{$matchB->id}/manual-tiebreak", [
            'event_id' => $event->id,
            'tied_match_id' => $matchA->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $matchB->refresh();
    expect($matchB->metadata['manual_tiebreak_winner'])->toBeTrue();

    $rankingsAfter = $service->preliminaryRankings($category)->get('A');
    expect($rankingsAfter->first()['match_id'])->toBe($matchB->id)
        ->and($rankingsAfter->last()['match_id'])->toBe($matchA->id);
});

test('panitera can record medical stop doctor stop which awards kiken gachi and stops injured athlete', function () {
    $event = createPaniteraEvent('Event Medical Stop');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori Medis', 'randori', 'single_elimination');

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Medis',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Medis',
        'phone' => '081234567890',
    ]);
    $injuredAthlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Cedera',
        'gender' => 'male',
        'birth_date' => '2005-01-01',
        'kyu_dan' => '1_dan',
    ]);
    $opponentAthlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Sehat',
        'gender' => 'male',
        'birth_date' => '2005-01-01',
        'kyu_dan' => '1_dan',
    ]);

    $injuredEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $injuredAthlete->id,
        'event_match_category_id' => $category->id,
        'competition_status' => 'active',
    ]);
    $opponentEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $opponentAthlete->id,
        'event_match_category_id' => $category->id,
        'competition_status' => 'active',
    ]);

    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'red_entry_id' => $injuredEntry->id,
        'blue_entry_id' => $opponentEntry->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'red_label' => 'Kenshi Cedera',
        'blue_label' => 'Kenshi Sehat',
        'status' => 'in_progress',
        'metadata' => [
            'red' => ['label' => 'Kenshi Cedera', 'entry_id' => $injuredEntry->id, 'athlete_ids' => [$injuredAthlete->id]],
            'blue' => ['label' => 'Kenshi Sehat', 'entry_id' => $opponentEntry->id, 'athlete_ids' => [$opponentAthlete->id]],
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
            'decision_override' => [
                'type' => 'medical_stop',
                'affected_corner' => 'aka',
                'reason' => 'Dislokasi bahu kanan / rekomendasi dokter pertandingan',
            ],
            'return_to_match' => true,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $freshMatch = $match->fresh();
    expect($freshMatch->status)->toBe('completed')
        ->and($freshMatch->metadata['result']['winner_corner'])->toBe('shiro')
        ->and($freshMatch->metadata['result']['win_method'])->toBe('kiken')
        ->and($injuredEntry->fresh()->competition_status)->toBe('stopped')
        ->and($injuredEntry->fresh()->status_notes)->toContain('Doctor / Medical Stop');
});

test('panitera can record disqualification hansoku make and shikkaku global', function () {
    $event = createPaniteraEvent('Event Disqualification');
    $user = createPaniteraUser($event);
    [$category, $drawing] = createPaniteraCategory($event, 'Randori DQ', 'randori', 'single_elimination');
    [$otherCategory] = createPaniteraCategory($event, 'Embu Lain', 'embu', 'embu_direct_final');

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen DQ',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer DQ',
        'phone' => '081234567891',
    ]);
    $disqualifiedAthlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Pelanggar',
        'gender' => 'male',
        'birth_date' => '2005-01-01',
        'kyu_dan' => '1_dan',
    ]);
    $opponentAthlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Tertib',
        'gender' => 'male',
        'birth_date' => '2005-01-01',
        'kyu_dan' => '1_dan',
    ]);

    $disqualifiedEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $disqualifiedAthlete->id,
        'event_match_category_id' => $category->id,
        'competition_status' => 'active',
    ]);
    $otherEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $disqualifiedAthlete->id,
        'event_match_category_id' => $otherCategory->id,
        'competition_status' => 'active',
    ]);
    $opponentEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $opponentAthlete->id,
        'event_match_category_id' => $category->id,
        'competition_status' => 'active',
    ]);

    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'red_entry_id' => $disqualifiedEntry->id,
        'blue_entry_id' => $opponentEntry->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'red_label' => 'Kenshi Pelanggar',
        'blue_label' => 'Kenshi Tertib',
        'status' => 'in_progress',
        'metadata' => [
            'red' => ['label' => 'Kenshi Pelanggar', 'entry_id' => $disqualifiedEntry->id, 'athlete_ids' => [$disqualifiedAthlete->id]],
            'blue' => ['label' => 'Kenshi Tertib', 'entry_id' => $opponentEntry->id, 'athlete_ids' => [$opponentAthlete->id]],
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
            'decision_override' => [
                'type' => 'disqualification',
                'affected_corner' => 'aka',
                'disqualification_scope' => 'global',
                'reason' => 'Tindakan anarkis / melanggar kehormatan Shorinji Kempo',
            ],
            'return_to_match' => true,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $freshMatch = $match->fresh();
    expect($freshMatch->status)->toBe('completed')
        ->and($freshMatch->metadata['result']['winner_corner'])->toBe('shiro')
        ->and($freshMatch->metadata['result']['win_method'])->toBe('hansoku_gachi')
        ->and($disqualifiedEntry->fresh()->competition_status)->toBe('disqualified')
        ->and($disqualifiedEntry->fresh()->status_notes)->toContain('Shikkaku (Global Turnamen)')
        ->and($otherEntry->fresh()->competition_status)->toBe('disqualified');
});
