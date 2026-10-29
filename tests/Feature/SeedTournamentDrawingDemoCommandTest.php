<?php

use App\Enums\ContingentStatus;
use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

uses(RefreshDatabase::class);

test('command creates isolated drawing demo data with double and single elimination', function () {
    [$event, $doubleCategory, $singleCategory] = createDrawingDemoEvent();
    $existingUser = User::factory()->create();
    $existingContingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $existingUser->id,
        'name' => 'Kontingen Asli',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Asli',
        'phone' => '081200000001',
        'email' => 'asli@example.test',
        'status' => ContingentStatus::Verified,
    ]);

    $this->artisan('event:seed-drawing-demo', ['event' => $event->id, '--seed' => 2026])
        ->expectsOutputToContain('berhasil dibuat')
        ->expectsOutputToContain('Seed acak: 2026')
        ->assertSuccessful();

    $doubleDrawing = $doubleCategory->tournamentDrawing()->firstOrFail();
    $singleDrawing = $singleCategory->tournamentDrawing()->firstOrFail();
    $dummyAthletes = Athlete::query()
        ->whereHas('contingent', fn ($query) => $query
            ->whereBelongsTo($event)
            ->where('name', 'like', '[DUMMY DRAWING]%'))
        ->with('matchCategoryEntries.matchCategory')
        ->get();
    $athleteWithTwoEmbuCategories = $dummyAthletes->first(fn (Athlete $athlete): bool => $athlete
        ->matchCategoryEntries
        ->filter(fn ($entry): bool => $entry->matchCategory?->type === 'embu')
        ->count() === 2);
    $scheduledMatches = $event->tournamentMatches()
        ->where('is_bye', false)
        ->whereNotNull('scheduled_start_at')
        ->orderBy('scheduled_start_at')
        ->get();
    $nonByeMatchCount = $event->tournamentMatches()->where('is_bye', false)->count();

    expect($event->contingents()->where('name', 'like', '[DUMMY DRAWING]%')->count())->toBe(6)
        ->and($event->registrations()->where('status', RegistrationStatus::Verified)->where('payment_status', PaymentStatus::Verified)->count())->toBe(6)
        ->and($doubleDrawing->bracket_type)->toBe('double_elimination')
        ->and($doubleDrawing->participant_count)->toBe(4)
        ->and($doubleDrawing->matches()->count())->toBe(7)
        ->and($singleDrawing->bracket_type)->toBe('single_elimination')
        ->and($singleDrawing->participant_count)->toBe(14)
        ->and($singleDrawing->matches()->count())->toBeGreaterThan(0)
        ->and($event->tournamentDrawings()->whereBetween('participant_count', [4, 16])->count())->toBe(4)
        ->and($dummyAthletes->every(fn (Athlete $athlete): bool => $athlete->matchCategoryEntries->count() <= 2))->toBeTrue()
        ->and($athleteWithTwoEmbuCategories)->not->toBeNull()
        ->and($scheduledMatches)->toHaveCount($nonByeMatchCount);

    $scheduledMatches
        ->groupBy('event_match_category_id')
        ->each(function (Collection $categoryMatches): void {
            expect($categoryMatches->pluck('event_court_id')->unique())->toHaveCount(1)
                ->and($categoryMatches->every(fn ($match): bool => $match->scheduled_start_at
                    ->diffInMinutes($match->scheduled_end_at) === 10.0))->toBeTrue()
                ->and($categoryMatches->sliding(2)->every(
                    fn (Collection $pair): bool => $pair->first()->scheduled_start_at
                        ->diffInMinutes($pair->last()->scheduled_start_at) === 10.0,
                ))->toBeTrue();
        });
    $this->assertModelExists($existingContingent);
});

test('delete option removes only data owned by the drawing demo command', function () {
    [$event] = createDrawingDemoEvent();
    $existingUser = User::factory()->create();
    $existingContingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $existingUser->id,
        'name' => 'Kontingen Tetap',
        'city' => 'Malang',
        'manager_name' => 'Manajer Tetap',
        'phone' => '081200000002',
        'email' => 'tetap@example.test',
        'status' => ContingentStatus::Verified,
    ]);

    $this->artisan('event:seed-drawing-demo', ['event' => $event->id, '--seed' => 2026])->assertSuccessful();

    $this->artisan('event:seed-drawing-demo', ['event' => $event->id, '--delete' => true])
        ->expectsOutputToContain('berhasil dihapus')
        ->assertSuccessful();

    expect(Contingent::withTrashed()->where('event_id', $event->id)->where('name', 'like', '[DUMMY DRAWING]%')->count())->toBe(0)
        ->and(Registration::withTrashed()->where('registration_number', 'like', 'REG-DRAW-%')->count())->toBe(0)
        ->and(TournamentDrawing::where('event_id', $event->id)->count())->toBe(0);
    $this->assertModelExists($existingContingent);
});

test('command fails without changing data when the event does not exist', function () {
    $this->artisan('event:seed-drawing-demo', ['event' => '00000000-0000-0000-0000-000000000000'])
        ->expectsOutput('Event tidak ditemukan. Periksa kembali UUID event.')
        ->assertFailed();

    expect(Contingent::count())->toBe(0);
});

test('same seed reproduces participant totals for every match category', function () {
    [$event] = createDrawingDemoEvent();

    $this->artisan('event:seed-drawing-demo', ['event' => $event->id, '--seed' => 2026])
        ->assertSuccessful();
    $firstParticipantTotals = TournamentDrawing::query()
        ->whereBelongsTo($event)
        ->orderBy('event_match_category_id')
        ->pluck('participant_count', 'event_match_category_id')
        ->all();

    $this->artisan('event:seed-drawing-demo', ['event' => $event->id, '--delete' => true])
        ->assertSuccessful();
    $this->artisan('event:seed-drawing-demo', ['event' => $event->id, '--seed' => 2026])
        ->assertSuccessful();
    $secondParticipantTotals = TournamentDrawing::query()
        ->whereBelongsTo($event)
        ->orderBy('event_match_category_id')
        ->pluck('participant_count', 'event_match_category_id')
        ->all();

    expect($secondParticipantTotals)->toBe($firstParticipantTotals);
});

test('command rejects an invalid random seed without changing data', function () {
    [$event] = createDrawingDemoEvent();

    $this->artisan('event:seed-drawing-demo', ['event' => $event->id, '--seed' => 'acak'])
        ->expectsOutput('Opsi --seed harus berupa bilangan bulat antara 0 dan 2147483647.')
        ->assertFailed();

    expect($event->contingents()->where('name', 'like', '[DUMMY DRAWING]%')->count())->toBe(0)
        ->and($event->tournamentDrawings()->count())->toBe(0);
});

/** @return array{Event, EventMatchCategory, EventMatchCategory} */
function createDrawingDemoEvent(): array
{
    $event = Event::query()->create([
        'name' => 'Event Demo Drawing',
        'slug' => 'event-demo-drawing',
        'venue' => 'GOR Demo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-08',
        'minimum_entries_per_category' => 2,
        'minimum_contingents_per_category' => 2,
        'max_match_categories_per_athlete' => 2,
        'match_duration_minutes' => 10,
        'minimum_rest_minutes' => 10,
        'is_active' => true,
    ]);
    $ageCategory = EventAgeCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Pelajar',
        'min_age' => 13,
        'max_age' => 17,
        'is_active' => true,
    ]);
    $doubleCategory = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'age_category_id' => $ageCategory->id,
        'name' => 'Randori Putra 50 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 1,
        'max_weight' => 50,
        'order' => 1,
        'is_active' => true,
    ]);
    $singleCategory = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'age_category_id' => $ageCategory->id,
        'name' => 'Randori Putri 55 kg',
        'type' => 'randori',
        'gender' => 'female',
        'capacity' => 16,
        'max_athletes_per_team' => 1,
        'min_weight' => 50.01,
        'max_weight' => 55,
        'order' => 2,
        'is_active' => true,
    ]);
    EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'age_category_id' => $ageCategory->id,
        'name' => 'Embu Berpasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 2,
        'order' => 3,
        'is_active' => true,
    ]);
    EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'age_category_id' => $ageCategory->id,
        'name' => 'Embu Tandoku Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 1,
        'order' => 4,
        'is_active' => true,
    ]);
    EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Arena Utama',
        'order' => 1,
        'is_active' => true,
    ]);
    EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Arena Kedua',
        'order' => 2,
        'is_active' => true,
    ]);
    Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-06 08:00:00',
        'end_time' => '2026-11-06 16:00:00',
        'name' => 'Sesi Pertandingan',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    return [$event, $doubleCategory, $singleCategory];
}
