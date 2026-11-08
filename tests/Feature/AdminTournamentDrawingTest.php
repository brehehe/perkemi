<?php

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

test('drawing matches include aka and shiro contingent names', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = Event::create([
        'name' => 'Event Drawing Kontingen',
        'slug' => 'event-drawing-kontingen',
        'venue' => 'GOR Drawing',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa 60kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'is_active' => true,
    ]);

    for ($i = 1; $i <= 3; $i++) {
        $contingent = Contingent::create([
            'event_id' => $event->id,
            'user_id' => $admin->id,
            'name' => "Kontingen Garuda {$i}",
            'city' => 'Surabaya',
            'manager_name' => "Manager {$i}",
            'phone' => "0812345678{$i}",
        ]);
        Registration::create([
            'event_id' => $event->id,
            'contingent_id' => $contingent->id,
            'registration_number' => "REG-KTG-00{$i}",
            'status' => 'verified',
            'payment_status' => 'verified',
        ]);
        $athlete = Athlete::create([
            'contingent_id' => $contingent->id,
            'name' => "Kenshi Bintang {$i}",
            'gender' => 'male',
        ]);
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
        ]);
    }

    $generator = app(TournamentDrawingGenerator::class);
    $category->update(['preferred_bracket_type' => 'round_robin']);
    $generator->generate($event, $category);

    $this->actingAs($admin)
        ->get(route('admin.pertandingan.drawing', ['event_id' => $event->id, 'category' => $category->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Drawing')
            ->has('matches', 3)
            ->where('matches.0.aka_label', fn ($val) => ! empty($val))
            ->where('matches.0.aka_contingent', fn ($val) => str_contains($val, 'Kontingen Garuda'))
            ->where('matches.0.shiro_contingent', fn ($val) => str_contains($val, 'Kontingen Garuda')));
});

test('admin can download tournament schedule and capacity report as pdf directly', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = Event::create([
        'name' => 'Event Laporan Jadwal',
        'slug' => 'event-laporan-jadwal',
        'venue' => 'GOR Pertandingan',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    // Direct visit downloads PDF directly
    $response = $this->actingAs($admin)
        ->get(route('admin.pertandingan.drawing.report', ['event_id' => $event->id]));

    $response->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect($response->headers->get('content-disposition'))->toContain('attachment; filename=Laporan_Jadwal_Kapasitas_');

    // With ?format=html renders web HTML view
    $this->actingAs($admin)
        ->get(route('admin.pertandingan.drawing.report', ['event_id' => $event->id, 'format' => 'html']))
        ->assertOk()
        ->assertViewIs('reports.tournament-schedule-capacity')
        ->assertViewHas('capacityStats');

    // With ?stream=1 streams inline PDF
    $streamResponse = $this->actingAs($admin)
        ->get(route('admin.pertandingan.drawing.report', ['event_id' => $event->id, 'stream' => 1]));

    $streamResponse->assertOk()
        ->assertHeader('content-type', 'application/pdf');
    expect($streamResponse->headers->get('content-disposition'))->toContain('inline; filename=Laporan_Jadwal_Kapasitas_');
});

test('admin can export all drawing brackets or one selected match number as pdf', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = Event::create([
        'name' => 'Kejurda PDF Bagan',
        'slug' => 'kejurda-pdf-bagan',
        'venue' => 'GOR Bagan',
        'city' => 'Surabaya',
        'start_date' => '2026-11-20',
        'end_date' => '2026-11-22',
        'is_active' => true,
    ]);
    $randoriCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 60 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $embuCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Beregu Campuran',
        'type' => 'embu',
        'gender' => 'mixed',
        'capacity' => 8,
        'order' => 2,
        'is_active' => true,
    ]);
    $randoriDrawing = TournamentDrawing::factory()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'bracket_type' => 'single_elimination',
        'participant_count' => 4,
        'contingent_count' => 4,
    ]);
    $embuDrawing = TournamentDrawing::factory()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'bracket_type' => 'embu_direct_final',
        'participant_count' => 3,
        'contingent_count' => 3,
    ]);
    TournamentMatch::factory()->create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'match_sequence' => 1,
        'round_label' => 'Semifinal 1',
        'red_label' => 'Kenshi Aka',
        'blue_label' => 'Kenshi Shiro',
    ]);
    TournamentMatch::factory()->create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'match_sequence' => 2,
        'bracket_position' => 2,
        'round_label' => 'Final',
        'participant_label' => 'Tim Embu Garuda',
        'red_label' => null,
        'blue_label' => null,
        'metadata' => ['members' => ['Atlet Satu', 'Atlet Dua']],
    ]);

    $allDrawings = $this->actingAs($admin)->get(route('admin.pertandingan.drawing.pdf', [
        'event_id' => $event->id,
        'format' => 'html',
    ]));

    $allDrawings
        ->assertViewIs('reports.tournament-drawings')
        ->assertSee('Randori Putra 60 kg')
        ->assertSee('Embu Beregu Campuran')
        ->assertSee('Kenshi Aka')
        ->assertSee('Tim Embu Garuda');

    $selectedDrawing = $this->actingAs($admin)->get(route('admin.pertandingan.drawing.pdf', [
        'event_id' => $event->id,
        'category' => $randoriCategory->id,
    ]));

    $selectedDrawing
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
    expect($selectedDrawing->headers->get('content-disposition'))
        ->toContain('attachment; filename=Bagan_Pertandingan_kejurda_pdf_bagan_randori_putra_60_kg_');
});

test('drawing pdf export returns 403 for an inaccessible event', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Bagan Privat',
        'slug' => 'event-bagan-privat',
        'venue' => 'GOR Privat',
        'city' => 'Bandung',
        'start_date' => '2026-11-20',
        'end_date' => '2026-11-22',
        'is_active' => false,
    ]);

    $this->actingAs($user)
        ->get(route('admin.pertandingan.drawing.pdf', ['event_id' => $event->id]))
        ->assertForbidden();
});
