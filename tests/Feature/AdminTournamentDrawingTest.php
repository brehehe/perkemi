<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use App\Services\TournamentDrawingGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin tournament pages accept the all event option', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = Event::create([
        'name' => 'Event Drawing Semua',
        'slug' => 'event-drawing-semua',
        'venue' => 'GOR Drawing',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.pertandingan.drawing', ['event_id' => 'all']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Drawing')
            ->where('activeEvent.id', $event->id));
});

test('renders only the active tenant event match categories and eligible drawing contestants', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Drawing 2026',
        'slug' => 'kejurda-drawing-2026',
        'tenant_subdomain' => 'kejurda-drawing-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Drawing Lain 2026',
        'slug' => 'kejurda-drawing-lain-2026',
        'tenant_subdomain' => 'kejurda-drawing-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);

    $matchCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 55–65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'min_weight' => 55,
        'max_weight' => 65,
        'order' => 1,
        'is_active' => true,
    ]);
    EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Nomor Tidak Aktif',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 2,
        'is_active' => false,
    ]);
    EventMatchCategory::create([
        'event_id' => $otherEvent->id,
        'name' => 'Nomor Event Lain',
        'type' => 'embu',
        'gender' => 'mixed',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);

    $tenantContingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Drawing Tenant',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Tenant',
        'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $otherEvent->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Drawing Lain',
        'city' => 'Malang',
        'manager_name' => 'Sensei Lain',
        'phone' => '081234567891',
    ]);
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $tenantContingent->id,
        'registration_number' => 'REG-DRAWING-001',
        'status' => 'verified',
        'payment_status' => 'verified',
    ]);
    $eligibleAthlete = Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Layak Drawing',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);
    Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Putri',
        'gender' => 'female',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);

    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $eligibleAthlete->id,
        'event_match_category_id' => $matchCategory->id,
    ]);
    Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Terlalu Berat',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 70,
    ]);
    Athlete::create([
        'contingent_id' => $otherContingent->id,
        'name' => 'Kenshi Event Lain',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);

    $this->actingAs($eventUser)
        ->get("http://kejurda-drawing-2026.localhost/admin/pertandingan/drawing?category={$matchCategory->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Drawing')
            ->has('categories', 1)
            ->where('categories.0.id', $matchCategory->id)
            ->where('categories.0.name', 'Randori Putra Kelas 55–65 kg')
            ->where('selectedCategory', $matchCategory->id)
            ->has('contestants', 1)
            ->where('contestants.0.id', $eligibleAthlete->id)
            ->where('contestants.0.name', 'Kenshi Layak Drawing')
        );
});

test('randori category conditionally enables round robin format for 3 to 5 entries and generates all pairing matches', function () {
    $admin = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Round Robin',
        'slug' => 'event-round-robin',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-10-10',
        'end_date' => '2026-10-12',
        'minimum_entries_per_category' => 2,
        'minimum_contingents_per_category' => 2,
        'is_active' => true,
    ]);
    $event->users()->attach($admin, ['access_role' => 'admin']);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa 60kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'is_active' => true,
    ]);

    // Create 3 contingents and 3 athletes
    $athletes = [];
    for ($i = 1; $i <= 3; $i++) {
        $contingent = Contingent::create([
            'event_id' => $event->id,
            'user_id' => $admin->id,
            'name' => "Dojo {$i}",
            'city' => 'Jakarta',
            'manager_name' => "Manager {$i}",
            'phone' => "0812345670{$i}",
        ]);
        Registration::create([
            'event_id' => $event->id,
            'contingent_id' => $contingent->id,
            'registration_number' => "REG-RR-00{$i}",
            'status' => 'verified',
            'payment_status' => 'verified',
        ]);
        $athlete = Athlete::create([
            'contingent_id' => $contingent->id,
            'name' => "Kenshi {$i}",
            'gender' => 'male',
        ]);
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
        ]);
        $athletes[] = $athlete;
    }

    $generator = app(TournamentDrawingGenerator::class);
    $prechecks = $generator->precheck($event);
    $check = $prechecks->firstWhere('id', $category->id);

    expect($check['participant_count'])->toBe(3);
    expect($check['is_round_robin_eligible'])->toBeTrue();
    expect(array_keys($check['available_formats']))->toContain('round_robin');

    // Generate with Round Robin
    $category->update(['preferred_bracket_type' => 'round_robin']);
    $result = $generator->generate($event, $category);

    expect($result['generated'])->toBe(1);

    $drawing = $category->tournamentDrawing()->first();
    expect($drawing->bracket_type)->toBe('round_robin');
    // For 3 participants: 3*(3-1)/2 = 3 matches
    expect($drawing->matches()->count())->toBe(3);

    $roundLabels = $drawing->matches()->pluck('round_label')->unique()->values()->all();
    expect($roundLabels)->toContain('Putaran 1');
    expect($roundLabels)->toContain('Putaran 2');
    expect($roundLabels)->toContain('Putaran 3');
});
