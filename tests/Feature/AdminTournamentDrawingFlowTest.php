<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Admin\Master\EventDetailViewService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createDrawingEvent(User $user, string $name = 'Kejurda Flow Drawing 2026'): Event
{
    $event = Event::create([
        'name' => $name,
        'slug' => str($name)->slug()->toString(),
        'tenant_subdomain' => str($name)->slug()->toString(),
        'venue' => 'GOR Drawing',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'match_duration_minutes' => 10,
        'minimum_rest_minutes' => 15,
        'minimum_entries_per_category' => 3,
        'minimum_contingents_per_category' => 3,
    ]);
    $event->users()->attach($user, ['access_role' => 'admin']);

    return $event;
}

function createVerifiedDrawingContingent(Event $event, User $user, int $number): Contingent
{
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => "Kontingen Drawing {$number}",
        'city' => 'Surabaya',
        'manager_name' => "Manager {$number}",
        'phone' => '0812345678'.$number,
    ]);

    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => "REG-FLOW-{$number}",
        'status' => 'verified',
        'payment_status' => 'verified',
    ]);

    return $contingent;
}

function createDrawingCategory(Event $event, string $name, string $type, int $order): EventMatchCategory
{
    return EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => $name,
        'type' => $type,
        'gender' => 'mixed',
        'capacity' => 32,
        'max_athletes_per_team' => $type === 'embu' ? 4 : 1,
        'order' => $order,
        'is_active' => true,
    ]);
}

test('generate all creates event scoped randori bracket embu pool and schedule while skipping invalid category', function () {
    $user = User::factory()->create();
    $event = createDrawingEvent($user);
    $otherEvent = createDrawingEvent($user, 'Kejurda Flow Lain 2026');

    EventCourt::create(['event_id' => $event->id, 'name' => 'Tatami 1', 'order' => 1, 'is_active' => true]);
    EventCourt::create(['event_id' => $event->id, 'name' => 'Tatami 2', 'order' => 2, 'is_active' => true]);
    $thirdCourt = EventCourt::create(['event_id' => $event->id, 'name' => 'Tatami 3', 'order' => 3, 'is_active' => true]);
    $session = Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-10-01 08:00:00',
        'end_time' => '2026-10-01 12:00:00',
        'name' => 'Sesi Pagi Pertandingan',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    $randori = createDrawingCategory($event, 'Randori Remaja A Putra 55 kg', 'randori', 1);
    $embu = createDrawingCategory($event, 'Embu Beregu Remaja A Campuran', 'embu', 2);
    $invalid = createDrawingCategory($event, 'Randori Kurang Peserta', 'randori', 3);
    createDrawingCategory($otherEvent, 'Nomor Event Lain', 'randori', 1);

    $athletes = collect();
    $embuAthletes = collect();
    foreach ([1, 2, 3] as $contingentNumber) {
        $contingent = createVerifiedDrawingContingent($event, $user, $contingentNumber);
        $athleteCount = $contingentNumber <= 2 ? 2 : 1;

        foreach (range(1, $athleteCount) as $athleteNumber) {
            $athlete = Athlete::create([
                'contingent_id' => $contingent->id,
                'name' => "Atlet {$contingentNumber}-{$athleteNumber}",
                'gender' => 'L',
                'kyu_dan' => 'Kyu 2',
                'weight' => 52,
            ]);
            $athletes->push($athlete);
            if ($athleteNumber === 1) {
                $embuAthletes->push($athlete);
            }
            AthleteMatchCategoryEntry::create([
                'event_id' => $event->id,
                'athlete_id' => $athlete->id,
                'event_match_category_id' => $randori->id,
            ]);
        }
    }

    $embuAthletes->values()->each(function (Athlete $athlete, int $index) use ($event, $embu, $invalid): void {
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $embu->id,
            'team_number' => $index + 1,
        ]);

        if ($index < 2) {
            AthleteMatchCategoryEntry::create([
                'event_id' => $event->id,
                'athlete_id' => $athlete->id,
                'event_match_category_id' => $invalid->id,
            ]);
        }
    });

    $this->withSession([
        'tenant_event_id' => $event->id,
        'tenant_event_slug' => $event->slug,
    ])->actingAs($user)
        ->post('/admin/pertandingan/drawing/generate', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(TournamentDrawing::where('event_id', $event->id)->count())->toBe(3)
        ->and(TournamentDrawing::where('event_id', $otherEvent->id)->count())->toBe(0)
        ->and($randori->tournamentDrawing()->value('status'))->toBe('generated')
        ->and($randori->tournamentDrawing()->value('bracket_type'))->toBe('single_elimination')
        ->and($embu->tournamentDrawing()->value('bracket_type'))->toBe('embu_direct_final')
        ->and($invalid->tournamentDrawing()->value('status'))->toBe('skipped')
        ->and($invalid->tournamentDrawing()->value('skip_reason'))->toContain('Minimal 3')
        ->and(TournamentMatch::where('event_match_category_id', $randori->id)->count())->toBe(7)
        ->and(TournamentMatch::where('event_match_category_id', $embu->id)->count())->toBe(6)
        ->and(TournamentMatch::where('event_match_category_id', $randori->id)->pluck('event_court_id')->filter()->unique()->count())->toBe(1)
        ->and(TournamentMatch::where('event_match_category_id', $embu->id)->pluck('event_court_id')->filter()->unique()->count())->toBe(1)
        ->and(TournamentMatch::where('event_id', $event->id)->where('is_bye', false)->whereNull('scheduled_start_at')->count())->toBe(0)
        ->and(TournamentMatch::where('event_id', $event->id)->where('is_bye', true)->whereNotNull('scheduled_start_at')->count())->toBe(0);

    $lastEmbuEnd = TournamentMatch::query()
        ->where('event_match_category_id', $embu->id)
        ->max('scheduled_end_at');
    $firstRandoriStart = TournamentMatch::query()
        ->where('event_match_category_id', $randori->id)
        ->min('scheduled_start_at');
    expect($lastEmbuEnd)->toBeLessThanOrEqual($firstRandoriStart);

    $sharedAthlete = $embuAthletes->firstOrFail();
    $sharedAthleteMatches = TournamentMatch::query()
        ->where('event_id', $event->id)
        ->whereNotNull('scheduled_start_at')
        ->get()
        ->filter(fn (TournamentMatch $match): bool => in_array($sharedAthlete->id, $match->metadata['athlete_ids'] ?? [], true))
        ->sortBy('scheduled_start_at')
        ->values();
    $lastSharedEmbuMatch = $sharedAthleteMatches
        ->where('event_match_category_id', $embu->id)
        ->last();
    $firstSharedRandoriMatch = $sharedAthleteMatches
        ->where('event_match_category_id', $randori->id)
        ->first();

    expect($firstSharedRandoriMatch->scheduled_start_at->greaterThanOrEqualTo(
        $lastSharedEmbuMatch->scheduled_end_at->addMinutes(15),
    ))->toBeTrue();

    $randoriFinal = TournamentMatch::query()
        ->where('event_match_category_id', $randori->id)
        ->where('phase', 'final')
        ->firstOrFail();
    $this->actingAs($user)
        ->put("/admin/pertandingan/drawing/matches/{$randoriFinal->id}/schedule", [
            'event_id' => $event->id,
            'event_court_id' => $thirdCourt->id,
            'rundown_id' => $session->id,
            'start_time' => '11:00',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $otherRandoriCourtIds = TournamentMatch::query()
        ->where('event_match_category_id', $randori->id)
        ->where('is_bye', false)
        ->where('id', '!=', $randoriFinal->id)
        ->pluck('event_court_id')
        ->unique()
        ->values();

    expect($randoriFinal->fresh())
        ->event_court_id->toBe($thirdCourt->id)
        ->scheduled_start_at->format('Y-m-d H:i')->toBe('2026-10-01 11:00')
        ->and($otherRandoriCourtIds)->toHaveCount(1)
        ->and($otherRandoriCourtIds->first())->not->toBe($thirdCourt->id);

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/publish', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(TournamentDrawing::where('event_id', $event->id)->where('status', 'published')->count())->toBe(2)
        ->and(TournamentDrawing::where('event_id', $event->id)->where('status', 'skipped')->count())->toBe(1);

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/unpublish', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(TournamentDrawing::where('event_id', $event->id)->where('status', 'generated')->count())->toBe(2)
        ->and(TournamentDrawing::where('event_id', $event->id)->whereNotNull('published_at')->count())->toBe(0);

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/publish', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/start', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(TournamentDrawing::where('event_id', $event->id)->where('status', 'in_progress')->count())->toBe(2);

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/unpublish', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasErrors('drawing');

    expect(TournamentDrawing::where('event_id', $event->id)->where('status', 'in_progress')->count())->toBe(2);

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/complete', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(TournamentDrawing::where('event_id', $event->id)->where('status', 'completed')->count())->toBe(2);

    $completedMatch = TournamentMatch::where('event_id', $event->id)
        ->where('is_bye', false)
        ->whereNotNull('scheduled_start_at')
        ->firstOrFail();
    $completedMatch->update([
        'status' => 'finished',
        'metadata' => [...($completedMatch->metadata ?? []), 'rank' => 1, 'total_score' => 268.5],
    ]);
    $scheduledStart = $completedMatch->scheduled_start_at;

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/reset-competition', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $resetMatch = $completedMatch->fresh();
    expect(TournamentDrawing::where('event_id', $event->id)->where('status', 'generated')->count())->toBe(2)
        ->and(TournamentDrawing::where('event_id', $event->id)->whereNotNull('published_at')->count())->toBe(0)
        ->and(TournamentMatch::where('event_id', $event->id)->where('status', 'pending')->count())->toBe(13)
        ->and($resetMatch->metadata)->not->toHaveKeys(['rank', 'total_score'])
        ->and($resetMatch->scheduled_start_at->equalTo($scheduledStart))->toBeTrue();
});

test('reset draft deletes event scores and referee signatures without affecting another event', function () {
    $user = User::factory()->create();
    $event = createDrawingEvent($user, 'Kejurda Reset Draft 2026');
    $otherEvent = createDrawingEvent($user, 'Kejurda Reset Draft Lain 2026');
    $eventCourt = EventCourt::create(['event_id' => $event->id, 'name' => 'Court Reset', 'order' => 1, 'is_active' => true]);
    $otherEventCourt = EventCourt::create(['event_id' => $otherEvent->id, 'name' => 'Court Tetap', 'order' => 1, 'is_active' => true]);
    $embuCategory = createDrawingCategory($event, 'Embu Reset Draft', 'embu', 1);
    $randoriCategory = createDrawingCategory($event, 'Randori Reset Draft', 'randori', 2);
    $otherCategory = createDrawingCategory($otherEvent, 'Embu Event Lain', 'embu', 1);
    $referee = Referee::create([
        'name' => 'Wasit Reset Draft',
        'license_number' => 'WST-RESET-DRAFT',
        'is_active' => true,
    ]);

    $embuDrawing = TournamentDrawing::factory()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
    ]);
    $embuMatch = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'event_court_id' => $eventCourt->id,
        'match_sequence' => 1,
    ]);
    $judgeScore = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'event_court_id' => $eventCourt->id,
        'referee_id' => $referee->id,
        'user_id' => $user->id,
        'signature' => 'data:image/png;base64,reset-signature',
        'notes' => 'Catatan Wasit yang harus dihapus',
    ]);
    $embuScore = EmbuScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'submitted_by' => $user->id,
        'verified_by' => $user->id,
    ]);

    $randoriDrawing = TournamentDrawing::factory()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
    ]);
    $randoriMatch = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'event_court_id' => $eventCourt->id,
        'match_sequence' => 1,
    ]);
    $randoriScore = RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $randoriMatch->id,
        'signatures' => ['panitera' => 'data:image/png;base64,randori-signature'],
        'submitted_by' => $user->id,
        'verified_by' => $user->id,
    ]);

    $otherDrawing = TournamentDrawing::factory()->create([
        'event_id' => $otherEvent->id,
        'event_match_category_id' => $otherCategory->id,
    ]);
    $otherMatch = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $otherDrawing->id,
        'event_id' => $otherEvent->id,
        'event_match_category_id' => $otherCategory->id,
        'event_court_id' => $otherEventCourt->id,
        'match_sequence' => 1,
    ]);
    $otherJudgeScore = EmbuJudgeScore::factory()->create([
        'event_id' => $otherEvent->id,
        'tournament_match_id' => $otherMatch->id,
        'event_court_id' => $otherEventCourt->id,
        'referee_id' => $referee->id,
        'user_id' => $user->id,
        'signature' => 'data:image/png;base64,other-event-signature',
    ]);

    $this->actingAs($user)
        ->withSession([
            'tenant_event_id' => $event->id,
            'tenant_event_slug' => $event->slug,
        ])
        ->delete('/admin/pertandingan/drawing/reset', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('embu_judge_scores', ['id' => $judgeScore->id]);
    $this->assertDatabaseMissing('embu_scores', ['id' => $embuScore->id]);
    $this->assertDatabaseMissing('randori_scores', ['id' => $randoriScore->id]);
    $this->assertDatabaseMissing('tournament_matches', ['id' => $embuMatch->id]);
    $this->assertDatabaseMissing('tournament_matches', ['id' => $randoriMatch->id]);
    $this->assertDatabaseMissing('tournament_drawings', ['id' => $embuDrawing->id]);
    $this->assertDatabaseMissing('tournament_drawings', ['id' => $randoriDrawing->id]);
    $this->assertDatabaseHas('embu_judge_scores', [
        'id' => $otherJudgeScore->id,
        'event_id' => $otherEvent->id,
        'signature' => 'data:image/png;base64,other-event-signature',
    ]);
    $this->assertDatabaseHas('tournament_matches', ['id' => $otherMatch->id]);
    $this->assertDatabaseHas('tournament_drawings', ['id' => $otherDrawing->id]);
});

test('randori with four participants uses double elimination on one court', function () {
    $user = User::factory()->create();
    $event = createDrawingEvent($user, 'Kejurda Double Elimination 2026');
    $category = createDrawingCategory($event, 'Randori Empat Peserta', 'randori', 1);

    EventCourt::create(['event_id' => $event->id, 'name' => 'Court Utama', 'order' => 1, 'is_active' => true]);
    Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-10-01 08:00:00',
        'end_time' => '2026-10-01 12:00:00',
        'name' => 'Sesi Randori',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    foreach ([1, 2, 3, 4] as $number) {
        $contingent = createVerifiedDrawingContingent($event, $user, 20 + $number);
        $athlete = Athlete::create([
            'contingent_id' => $contingent->id,
            'name' => "Atlet Double {$number}",
            'gender' => 'L',
            'weight' => 55,
        ]);
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
        ]);
    }

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/generate', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($category->tournamentDrawing()->value('bracket_type'))->toBe('double_elimination')
        ->and($category->tournamentDrawing()->firstOrFail()->matches()->count())->toBe(6)
        ->and($category->tournamentDrawing()->firstOrFail()->matches()->pluck('event_court_id')->filter()->unique()->count())->toBe(1);
});

test('scheduler completes each embu category before another category uses the same court', function () {
    $user = User::factory()->create();
    $event = createDrawingEvent($user, 'Kejurda Embu Berurutan 2026');
    $event->update([
        'minimum_entries_per_category' => 1,
        'minimum_contingents_per_category' => 1,
    ]);
    EventCourt::create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    EventCourt::create(['event_id' => $event->id, 'name' => 'Court 2', 'order' => 2, 'is_active' => true]);
    Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-10-01 08:00:00',
        'end_time' => '2026-10-01 12:00:00',
        'name' => 'Sesi Embu',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    $categories = collect(range(1, 4))->map(fn (int $number): EventMatchCategory => createDrawingCategory(
        $event,
        "Embu Berurutan {$number}",
        'embu',
        $number,
    ));
    $sharedContingent = createVerifiedDrawingContingent($event, $user, 61);
    $thirdContingent = createVerifiedDrawingContingent($event, $user, 62);
    $fourthContingent = createVerifiedDrawingContingent($event, $user, 63);
    $sharedAthlete = Athlete::create(['contingent_id' => $sharedContingent->id, 'name' => 'Atlet Embu Bersama', 'gender' => 'L']);
    $thirdAthlete = Athlete::create(['contingent_id' => $thirdContingent->id, 'name' => 'Atlet Embu Ketiga', 'gender' => 'L']);
    $fourthAthlete = Athlete::create(['contingent_id' => $fourthContingent->id, 'name' => 'Atlet Embu Keempat', 'gender' => 'L']);

    foreach ($categories as $index => $category) {
        $athlete = match ($index) {
            0, 1 => $sharedAthlete,
            2 => $thirdAthlete,
            default => $fourthAthlete,
        };
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
            'team_number' => 1,
        ]);
    }

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/generate', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $scheduledMatches = TournamentMatch::query()
        ->where('event_id', $event->id)
        ->whereNotNull('scheduled_start_at')
        ->get();

    expect($scheduledMatches)->toHaveCount(8);

    foreach ($categories as $category) {
        $categoryMatches = $scheduledMatches
            ->where('event_match_category_id', $category->id)
            ->sortBy('scheduled_start_at')
            ->values();
        $firstMatch = $categoryMatches->firstOrFail();
        $lastMatch = $categoryMatches->last();
        $interleavedMatches = $scheduledMatches
            ->where('event_court_id', $firstMatch->event_court_id)
            ->where('event_match_category_id', '!=', $category->id)
            ->filter(fn (TournamentMatch $match): bool => $match->scheduled_start_at->greaterThan($firstMatch->scheduled_start_at)
                && $match->scheduled_start_at->lessThan($lastMatch->scheduled_end_at));

        expect($categoryMatches)->toHaveCount(2)
            ->and($categoryMatches->pluck('match_sequence')->all())->toBe([1, 2])
            ->and($categoryMatches->pluck('event_court_id')->unique())->toHaveCount(1)
            ->and($interleavedMatches)->toBeEmpty();
    }
});

test('single elimination distributes byes to athletes and advances them without scheduling bye matches', function () {
    $user = User::factory()->create();
    $event = createDrawingEvent($user, 'Kejurda Single Elimination Bye 2026');
    $category = createDrawingCategory($event, 'Randori Sembilan Peserta', 'randori', 1);

    EventCourt::create(['event_id' => $event->id, 'name' => 'Court Utama', 'order' => 1, 'is_active' => true]);
    Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-10-01 08:00:00',
        'end_time' => '2026-10-01 12:00:00',
        'name' => 'Sesi Randori',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    foreach (range(1, 9) as $number) {
        $contingent = createVerifiedDrawingContingent($event, $user, 40 + $number);
        $athlete = Athlete::create([
            'contingent_id' => $contingent->id,
            'name' => "Atlet Single {$number}",
            'gender' => 'L',
            'weight' => 55,
        ]);
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
        ]);
    }

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/generate', ['event_id' => $event->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $matches = $category->tournamentDrawing()->firstOrFail()->matches()->with('nextMatch')->get();
    $firstRound = $matches->where('round_label', 'Babak 1');
    $byeMatches = $firstRound->where('is_bye', true);
    $scheduledMatches = $matches->whereNotNull('scheduled_start_at');

    expect($category->tournamentDrawing()->value('bracket_type'))->toBe('single_elimination')
        ->and($matches)->toHaveCount(15)
        ->and($firstRound)->toHaveCount(8)
        ->and($byeMatches)->toHaveCount(7)
        ->and($firstRound->contains(fn (TournamentMatch $match): bool => $match->red_label === 'BYE' && $match->blue_label === 'BYE'))->toBeFalse()
        ->and($byeMatches->every(fn (TournamentMatch $match): bool => ($match->red_entry_id === null) !== ($match->blue_entry_id === null)))->toBeTrue()
        ->and($byeMatches->every(fn (TournamentMatch $match): bool => $match->scheduled_start_at === null))->toBeTrue()
        ->and($byeMatches->every(function (TournamentMatch $match): bool {
            $advancedEntryId = $match->red_entry_id ?? $match->blue_entry_id;

            return in_array($advancedEntryId, [
                $match->nextMatch?->red_entry_id,
                $match->nextMatch?->blue_entry_id,
            ], true);
        }))->toBeTrue()
        ->and($scheduledMatches)->toHaveCount(8)
        ->and($scheduledMatches->every(fn (TournamentMatch $match): bool => ! $match->is_bye))->toBeTrue();
});

test('precheck excludes registrations whose payment has not been verified', function () {
    $user = User::factory()->create();
    $event = createDrawingEvent($user, 'Kejurda Pembayaran Drawing 2026');
    $category = createDrawingCategory($event, 'Randori Pembayaran', 'randori', 1);

    foreach ([1, 2, 3] as $number) {
        $contingent = createVerifiedDrawingContingent($event, $user, 10 + $number);
        if ($number === 3) {
            $contingent->registrations()->update(['payment_status' => 'submitted']);
        }
        $athlete = Athlete::create(['contingent_id' => $contingent->id, 'name' => "Atlet Bayar {$number}", 'gender' => 'L']);
        AthleteMatchCategoryEntry::create(['event_id' => $event->id, 'athlete_id' => $athlete->id, 'event_match_category_id' => $category->id]);
    }

    $this->actingAs($user)
        ->post('/admin/pertandingan/drawing/generate', ['event_id' => $event->id])
        ->assertRedirect();

    $drawing = $category->tournamentDrawing()->firstOrFail();
    expect($drawing->status)->toBe('skipped')
        ->and($drawing->participant_count)->toBe(2)
        ->and($drawing->contingent_count)->toBe(2)
        ->and($drawing->matches()->count())->toBe(0);
});

test('event tournament settings and match session window can be saved', function () {
    $user = User::factory()->create();
    $event = createDrawingEvent($user, 'Kejurda Pengaturan Drawing 2026');

    $this->actingAs($user)
        ->put("/admin/master/event/{$event->id}/tournament-settings", [
            'match_duration_minutes' => 12,
            'minimum_rest_minutes' => 20,
            'minimum_entries_per_category' => 4,
            'minimum_contingents_per_category' => 3,
            'tts_announcer_enabled' => false,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->post("/admin/master/event/{$event->id}/rundown", [
            'date' => '2026-10-01',
            'time' => '08:00',
            'end_time' => '11:30',
            'name' => 'Penyisihan Pagi',
            'type' => 'Pertandingan',
            'is_match_session' => true,
            'order' => 1,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'match_duration_minutes' => 12,
        'minimum_rest_minutes' => 20,
        'minimum_entries_per_category' => 4,
        'minimum_contingents_per_category' => 3,
        'tts_announcer_enabled' => false,
    ]);

    $viewData = app(EventDetailViewService::class)->build(request(), $event->fresh());
    expect($viewData['event']['tts_announcer_enabled'])->toBeFalse();
    $this->assertDatabaseHas('rundowns', [
        'event_id' => $event->id,
        'name' => 'Penyisihan Pagi',
        'is_match_session' => 1,
        'end_time' => '2026-10-01 11:30:00',
    ]);
});
