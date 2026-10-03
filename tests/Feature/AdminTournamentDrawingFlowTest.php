<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
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

    $this->actingAs($user)
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
        ->and(TournamentMatch::where('event_match_category_id', $randori->id)->value('event_court_id'))->not->toBe(TournamentMatch::where('event_match_category_id', $embu->id)->value('event_court_id'))
        ->and(TournamentMatch::where('event_id', $event->id)->whereNull('scheduled_start_at')->count())->toBe(0);

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

    expect($randoriFinal->fresh()->scheduled_start_at->format('Y-m-d H:i'))->toBe('2026-10-01 11:00')
        ->and(TournamentMatch::where('event_match_category_id', $randori->id)->pluck('event_court_id')->unique()->values()->all())->toBe([$thirdCourt->id]);

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

    $completedMatch = TournamentMatch::where('event_id', $event->id)->firstOrFail();
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
    ]);
    $this->assertDatabaseHas('rundowns', [
        'event_id' => $event->id,
        'name' => 'Penyisihan Pagi',
        'is_match_session' => 1,
        'end_time' => '2026-10-01 11:30:00',
    ]);
});
