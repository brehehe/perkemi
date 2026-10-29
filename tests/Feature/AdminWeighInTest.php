<?php

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\TournamentDrawingGenerator;
use App\Services\WeighInService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
});

function makeTestContingent(string $name = 'Kota Surabaya', string $city = 'Surabaya'): Contingent
{
    return Contingent::create([
        'user_id' => User::factory()->create()->id,
        'name' => $name,
        'city' => $city,
        'manager_name' => 'Manager '.$name,
        'phone' => '081234567890',
    ]);
}

test('admin can view weigh-in station with statistics and categories', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa Putra 60-65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'min_weight' => 60.0,
        'max_weight' => 65.0,
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.pertandingan.weigh-in.index', ['event_id' => $event->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/WeighIn')
            ->where('event.id', $event->id)
            ->has('categories', 1)
            ->has('overallStats')
            ->where('overallStats.total', 0)
        );
});

test('operator can record weigh-in and status is evaluated correctly', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa Putra 60-65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'min_weight' => 60.0,
        'max_weight' => 65.0,
        'is_active' => true,
    ]);

    $contingent = makeTestContingent('Kota Surabaya', 'Surabaya');

    $athlete = Athlete::create([
        'name' => 'Budi Santoso',
        'gender' => 'male',
        'contingent_id' => $contingent->id,
        'weight' => 62.0,
    ]);

    $entry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'athlete_id' => $athlete->id,
        'weigh_in_status' => 'pending',
    ]);

    // 1. Valid weight: 63.5 kg -> passed
    $this->actingAs($admin)
        ->post(route('admin.pertandingan.weigh-in.update', $entry), [
            'actual_weight' => 63.5,
            'weigh_in_notes' => 'Pakaian tanding standar',
        ])
        ->assertRedirect();

    $entry->refresh();
    expect($entry->weigh_in_status)->toBe('passed')
        ->and((float) $entry->actual_weight)->toBe(63.5)
        ->and((float) $entry->athlete->fresh()->weight)->toBe(63.5);

    // 2. Overweight: 66.2 kg -> overweight
    $this->actingAs($admin)
        ->post(route('admin.pertandingan.weigh-in.update', $entry), [
            'actual_weight' => 66.2,
        ])
        ->assertRedirect();

    $entry->refresh();
    expect($entry->weigh_in_status)->toBe('overweight');

    // 3. Underweight: 58.5 kg -> underweight
    $this->actingAs($admin)
        ->post(route('admin.pertandingan.weigh-in.update', $entry), [
            'actual_weight' => 58.5,
        ])
        ->assertRedirect();

    $entry->refresh();
    expect($entry->weigh_in_status)->toBe('underweight');
});

test('locked category prevents weigh-in modifications unless unlocked', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa Putra 60-65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'min_weight' => 60.0,
        'max_weight' => 65.0,
        'is_active' => true,
    ]);

    $contingent = makeTestContingent('Kota Surabaya', 'Surabaya');

    $athlete = Athlete::create([
        'name' => 'Budi Santoso',
        'gender' => 'male',
        'contingent_id' => $contingent->id,
    ]);

    $entry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'athlete_id' => $athlete->id,
        'weigh_in_status' => 'pending',
    ]);

    // Lock category
    $this->actingAs($admin)
        ->post(route('admin.pertandingan.weigh-in.lock', $category))
        ->assertRedirect();

    $category->refresh();
    expect($category->weigh_in_locked_at)->not->toBeNull();

    // Attempt to update entry while locked -> throws validation error
    $this->actingAs($admin)
        ->post(route('admin.pertandingan.weigh-in.update', $entry), [
            'actual_weight' => 62.0,
        ])
        ->assertSessionHasErrors(['weigh_in']);

    // Unlock category
    $this->actingAs($admin)
        ->post(route('admin.pertandingan.weigh-in.unlock', $category))
        ->assertRedirect();

    $category->refresh();
    expect($category->weigh_in_locked_at)->toBeNull();

    // Now update succeeds
    $this->actingAs($admin)
        ->post(route('admin.pertandingan.weigh-in.update', $entry), [
            'actual_weight' => 62.0,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($entry->fresh()->weigh_in_status)->toBe('passed');
});

test('drawing generator includes pending weigh-in but excludes overweight/underweight', function () {
    $event = Event::create([
        'name' => 'Kejurda Drawing 2026',
        'slug' => 'kejurda-drawing-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa Putra 60-65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'min_weight' => 60.0,
        'max_weight' => 65.0,
        'is_active' => true,
    ]);

    $contingentA = makeTestContingent('Kota Surabaya', 'Surabaya');
    $contingentB = makeTestContingent('Kota Malang', 'Malang');

    // Verified registrations
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingentA->id,
        'registration_number' => 'REG-A-01',
        'status' => RegistrationStatus::Verified,
        'payment_status' => PaymentStatus::Verified,
    ]);
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingentB->id,
        'registration_number' => 'REG-B-01',
        'status' => RegistrationStatus::Verified,
        'payment_status' => PaymentStatus::Verified,
    ]);

    $athlete1 = Athlete::create(['name' => 'Kenshi 1 (Pending)', 'gender' => 'male', 'contingent_id' => $contingentA->id]);
    $athlete2 = Athlete::create(['name' => 'Kenshi 2 (Passed)', 'gender' => 'male', 'contingent_id' => $contingentB->id]);
    $athlete3 = Athlete::create(['name' => 'Kenshi 3 (Overweight)', 'gender' => 'male', 'contingent_id' => $contingentA->id]);

    // Athlete 1: belum ditimbang (pending) -> Skenario 1: TETAP DIUNDI
    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'athlete_id' => $athlete1->id,
        'weigh_in_status' => 'pending',
    ]);

    // Athlete 2: lolos timbang (passed) -> TETAP DIUNDI
    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'athlete_id' => $athlete2->id,
        'weigh_in_status' => 'passed',
        'actual_weight' => 63.0,
    ]);

    // Athlete 3: gagal timbang (overweight) -> Skenario 2: DIBATALKAN DARI UNDIAN
    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'athlete_id' => $athlete3->id,
        'weigh_in_status' => 'overweight',
        'actual_weight' => 68.0,
    ]);

    $generator = app(TournamentDrawingGenerator::class);
    $participants = $generator->participantsFor($event, $category);

    expect($participants)->toHaveCount(2)
        ->and($participants->pluck('label')->all())->toContain('Kenshi 1 (Pending)', 'Kenshi 2 (Passed)')
        ->and($participants->pluck('label')->all())->not->toContain('Kenshi 3 (Overweight)');
});

test('syncMatchDisqualifications flags bracket and applies WO when match is ready', function () {
    $event = Event::create([
        'name' => 'Kejurda Drawing 2026',
        'slug' => 'kejurda-drawing-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa Putra 60-65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'min_weight' => 60.0,
        'max_weight' => 65.0,
        'is_active' => true,
    ]);

    $contingentA = makeTestContingent('Surabaya', 'Surabaya');
    $contingentB = makeTestContingent('Malang', 'Malang');

    $redAthlete = Athlete::create(['name' => 'Kenshi Merah', 'gender' => 'male', 'contingent_id' => $contingentA->id]);
    $blueAthlete = Athlete::create(['name' => 'Kenshi Putih', 'gender' => 'male', 'contingent_id' => $contingentB->id]);

    $redEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'athlete_id' => $redAthlete->id,
        'weigh_in_status' => 'pending',
    ]);

    $blueEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'athlete_id' => $blueAthlete->id,
        'weigh_in_status' => 'passed',
        'actual_weight' => 62.0,
    ]);

    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'bracket_type' => 'single_elimination',
    ]);

    $match = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'phase' => 'upper',
        'match_sequence' => 1,
        'round_number' => 1,
        'round_label' => 'Babak Penyisihan',
        'status' => 'ready',
        'red_entry_id' => $redEntry->id,
        'blue_entry_id' => $blueEntry->id,
        'red_label' => 'Kenshi Merah',
        'blue_label' => 'Kenshi Putih',
        'metadata' => [
            'red' => ['entry_id' => $redEntry->id, 'label' => 'Kenshi Merah'],
            'blue' => ['entry_id' => $blueEntry->id, 'label' => 'Kenshi Putih'],
        ],
    ]);

    // Red fails weigh-in on match day -> overweight
    $user = User::factory()->create();
    $user->assignRole('Super Admin');
    app(WeighInService::class)->recordWeighIn($redEntry, 67.5, 'Overweight Hari-H', $user->id);

    $match->refresh();
    expect($match->status)->toBe('completed')
        ->and($match->metadata['red_weigh_in_disqualified'])->toBeTrue()
        ->and($match->metadata['result']['is_walkover'])->toBeTrue()
        ->and($match->metadata['result']['win_method'])->toBe('walkover_weigh_in')
        ->and($match->metadata['result']['winner_corner'])->toBe('blue');
});

test('admin can view berita acara export page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.pertandingan.weigh-in.export', ['event_id' => $event->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/WeighInReport')
            ->where('event.id', $event->id)
            ->has('printed_at')
            ->has('stats')
        );
});
