<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Panitera\ChampionResultService;
use App\Services\Panitera\RandoriResultService;
use App\Services\TournamentDrawingGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('generates valid 9-match double elimination bracket for 5 participants with full schedule and no dead-end byes', function () {
    $user = User::factory()->create();
    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $user->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejurda 5 Peserta 2026',
        'slug' => 'kejurda-5-peserta-2026',
        'tenant_subdomain' => 'kejurda-5-peserta',
        'venue' => 'GOR 5 Peserta',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'match_duration_minutes' => 7,
        'minimum_rest_minutes' => 10,
        'is_active' => true,
    ]);
    $event->users()->attach($user, ['access_role' => Event::AccessRoleAdmin]);

    EventCourt::create(['event_id' => $event->id, 'name' => 'Tatami 1', 'order' => 1, 'is_active' => true]);
    Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-11-01 09:00:00',
        'end_time' => '2026-11-01 13:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'order' => 1,
        'preferred_bracket_type' => 'double_elimination',
        'is_active' => true,
    ]);

    // Create 5 contingents and 5 athletes
    $athletes = [];
    for ($i = 1; $i <= 5; $i++) {
        $contingent = Contingent::create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'name' => "Kontingen {$i}",
            'city' => "Kota {$i}",
            'manager_name' => "Manager {$i}",
            'phone' => "0812345678{$i}",
        ]);
        Registration::create([
            'event_id' => $event->id,
            'contingent_id' => $contingent->id,
            'registration_number' => "REG-5P-{$i}",
            'status' => 'verified',
            'payment_status' => 'verified',
        ]);
        $athlete = Athlete::create([
            'contingent_id' => $contingent->id,
            'name' => "Atlet Ke-{$i}",
        ]);
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
        ]);
        $athletes[] = $athlete;
    }

    $generator = app(TournamentDrawingGenerator::class);
    $result = $generator->generate($event, $category);

    expect($result['generated'])->toBe(1);

    $matches = TournamentMatch::query()
        ->where('event_match_category_id', $category->id)
        ->orderBy('match_sequence')
        ->get();

    // Must generate exactly 9 matches (8 standard + 1 GF2)
    expect($matches)->toHaveCount(9);

    // Verify all 9 matches are NOT BYEs and all have scheduled time & court
    foreach ($matches as $match) {
        expect($match->is_bye)->toBeFalse()
            ->and($match->status)->toBe('pending')
            ->and($match->scheduled_start_at)->not->toBeNull()
            ->and($match->event_court_id)->not->toBeNull();
    }

    // Match 1: Upper Bracket · Babak 1 (Seed 4 vs Seed 5)
    $m1 = $matches->get(0);
    expect($m1->round_label)->toBe('Upper Bracket · Babak 1')
        ->and($m1->red_entry_id)->not->toBeNull()
        ->and($m1->blue_entry_id)->not->toBeNull();

    // Match 2: Upper Bracket · Semifinal 1 (Seed 2 vs Seed 3)
    $m2 = $matches->get(1);
    expect($m2->round_label)->toBe('Upper Bracket · Semifinal')
        ->and($m2->red_entry_id)->not->toBeNull()
        ->and($m2->blue_entry_id)->not->toBeNull();

    // Match 3: Upper Bracket · Semifinal 2 (Seed 1 vs Winner Partai 1)
    $m3 = $matches->get(2);
    expect($m3->round_label)->toBe('Upper Bracket · Semifinal')
        ->and($m3->red_entry_id)->not->toBeNull()
        ->and($m3->blue_label)->toContain('Pemenang Partai #1');

    // Match 4: Lower Bracket · Babak 1
    $m4 = $matches->get(3);
    expect($m4->round_label)->toBe('Lower Bracket · Babak 1')
        ->and($m4->red_label)->toContain('Kalah Partai #1')
        ->and($m4->blue_label)->toContain('Kalah Partai #2');

    // Match 5: Final Upper Bracket
    $m5 = $matches->get(4);
    expect($m5->round_label)->toBe('Final Upper Bracket')
        ->and($m5->red_label)->toContain('Pemenang Partai #2')
        ->and($m5->blue_label)->toContain('Pemenang Partai #3');

    // Match 6: Lower Bracket · Babak 2
    $m6 = $matches->get(5);
    expect($m6->round_label)->toBe('Lower Bracket · Babak 2')
        ->and($m6->red_label)->toContain('Pemenang Partai #4')
        ->and($m6->blue_label)->toContain('Kalah Partai #3');

    // Match 7: Final Lower Bracket
    $m7 = $matches->get(6);
    expect($m7->round_label)->toBe('Final Lower Bracket')
        ->and($m7->red_label)->toContain('Pemenang Partai #6')
        ->and($m7->blue_label)->toContain('Kalah Partai #5');

    // Match 8: Grand Final
    $m8 = $matches->get(7);
    expect($m8->round_label)->toBe('Grand Final')
        ->and($m8->red_label)->toContain('Pemenang Partai #5')
        ->and($m8->blue_label)->toContain('Pemenang Partai #7');

    // Match 9: Grand Final Ulang (GF2)
    $m9 = $matches->get(8);
    expect($m9->round_label)->toBe('Grand Final Ulang (GF2)')
        ->and($m9->metadata['is_gf2'])->toBeTrue();

    // Now test routing results step by step
    $resultService = app(RandoriResultService::class);

    // 1. Play Match 1 (Seed 4 wins against Seed 5)
    $resultService->record(
        $m1,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 1'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m3->refresh();
    $m4->refresh();
    expect($m3->blue_label)->toBe($m1->red_label)
        ->and($m4->red_label)->toBe($m1->blue_label);

    // 2. Play Match 2 (Seed 2 wins against Seed 3)
    $resultService->record(
        $m2,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 2'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m5->refresh();
    $m4->refresh();
    expect($m5->red_label)->toBe($m2->red_label)
        ->and($m4->blue_label)->toBe($m2->blue_label);

    // 3. Play Match 3 (Seed 1 wins against Winner of Match 1)
    $resultService->record(
        $m3,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 3'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m5->refresh();
    $m6->refresh();
    expect($m5->blue_label)->toBe($m3->red_label)
        ->and($m6->blue_label)->toBe($m3->blue_label);

    // 4. Play Match 4 (Lower Round 1: Winner advances to Match 6)
    $resultService->record(
        $m4,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 4'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m6->refresh();
    expect($m6->red_label)->toBe($m4->red_label);

    // 5. Play Match 5 (Final Upper: Winner advances to Grand Final, Loser to Final Lower)
    $resultService->record(
        $m5,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 5'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m8->refresh();
    $m7->refresh();
    expect($m8->red_label)->toBe($m5->red_label)
        ->and($m7->blue_label)->toBe($m5->blue_label);

    // 6. Play Match 6 (Lower Round 2: Winner advances to Final Lower)
    $resultService->record(
        $m6,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 6'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m7->refresh();
    expect($m7->red_label)->toBe($m6->red_label);

    // 7. Play Match 7 (Final Lower: Winner advances to Grand Final)
    $resultService->record(
        $m7,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 7'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m8->refresh();
    expect($m8->blue_label)->toBe($m7->red_label);

    // 8. Play Match 8 (Grand Final: Upper winner wins, GF2 skipped!)
    $resultService->record(
        $m8,
        akaBreakdown: ['waza_ari' => 1],
        shiroBreakdown: ['waza_ari' => 0],
        signatures: ['referee' => 'Wasit 8'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );
    $m9->refresh();
    expect($m9->is_bye)->toBeTrue()
        ->and($m9->status)->toBe('completed')
        ->and($m9->metadata['gf2_status'])->toBe('skipped');

    // 9. Verify Champion Results calculation
    $championService = app(ChampionResultService::class);
    $generation = $championService->generationData($category);
    expect($generation['ready'])->toBeTrue()
        ->and($generation['champions']->count())->toBeGreaterThanOrEqual(3)
        ->and($generation['champions'][0]['label'])->toBe($m8->red_label)
        ->and($generation['champions'][1]['label'])->toBe($m8->blue_label)
        ->and($generation['champions'][2]['label'])->toBe($m7->blue_label);
});

test('GF2 is activated when Lower Bracket finalist wins Grand Final in 5-participant bracket', function () {
    $user = User::factory()->create();
    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $user->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejurda 5 Peserta GF2 2026',
        'slug' => 'kejurda-5-peserta-gf2-2026',
        'tenant_subdomain' => 'kejurda-5-peserta-gf2',
        'venue' => 'GOR 5 Peserta',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'match_duration_minutes' => 7,
        'minimum_rest_minutes' => 10,
        'is_active' => true,
    ]);
    $event->users()->attach($user, ['access_role' => Event::AccessRoleAdmin]);

    EventCourt::create(['event_id' => $event->id, 'name' => 'Tatami 1', 'order' => 1, 'is_active' => true]);
    Rundown::create([
        'event_id' => $event->id,
        'date' => '2026-11-01 09:00:00',
        'end_time' => '2026-11-01 13:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putri 50 kg',
        'type' => 'randori',
        'gender' => 'female',
        'capacity' => 16,
        'order' => 1,
        'preferred_bracket_type' => 'double_elimination',
        'is_active' => true,
    ]);

    for ($i = 1; $i <= 5; $i++) {
        $contingent = Contingent::create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'name' => "Dojo {$i}",
            'city' => "Kota {$i}",
            'manager_name' => "Sensei {$i}",
            'phone' => "0812345678{$i}",
        ]);
        Registration::create([
            'event_id' => $event->id,
            'contingent_id' => $contingent->id,
            'registration_number' => "REG-GF2-{$i}",
            'status' => 'verified',
            'payment_status' => 'verified',
        ]);
        $athlete = Athlete::create([
            'contingent_id' => $contingent->id,
            'name' => "Kenshi {$i}",
        ]);
        AthleteMatchCategoryEntry::create([
            'event_id' => $event->id,
            'athlete_id' => $athlete->id,
            'event_match_category_id' => $category->id,
        ]);
    }

    $generator = app(TournamentDrawingGenerator::class);
    $generator->generate($event, $category);

    $matches = TournamentMatch::query()
        ->where('event_match_category_id', $category->id)
        ->orderBy('match_sequence')
        ->get();

    $resultService = app(RandoriResultService::class);

    // Play matches 1 to 7
    $resultService->record($matches->get(0)->fresh(), akaBreakdown: ['waza_ari' => 1], shiroBreakdown: ['waza_ari' => 0], signatures: ['referee' => 'W1'], signatureNames: null, notes: null, userId: $user->id);
    $resultService->record($matches->get(1)->fresh(), akaBreakdown: ['waza_ari' => 1], shiroBreakdown: ['waza_ari' => 0], signatures: ['referee' => 'W2'], signatureNames: null, notes: null, userId: $user->id);
    $resultService->record($matches->get(2)->fresh(), akaBreakdown: ['waza_ari' => 1], shiroBreakdown: ['waza_ari' => 0], signatures: ['referee' => 'W3'], signatureNames: null, notes: null, userId: $user->id);
    $resultService->record($matches->get(3)->fresh(), akaBreakdown: ['waza_ari' => 1], shiroBreakdown: ['waza_ari' => 0], signatures: ['referee' => 'W4'], signatureNames: null, notes: null, userId: $user->id);
    $resultService->record($matches->get(4)->fresh(), akaBreakdown: ['waza_ari' => 1], shiroBreakdown: ['waza_ari' => 0], signatures: ['referee' => 'W5'], signatureNames: null, notes: null, userId: $user->id);
    $resultService->record($matches->get(5)->fresh(), akaBreakdown: ['waza_ari' => 1], shiroBreakdown: ['waza_ari' => 0], signatures: ['referee' => 'W6'], signatureNames: null, notes: null, userId: $user->id);
    $resultService->record($matches->get(6)->fresh(), akaBreakdown: ['waza_ari' => 1], shiroBreakdown: ['waza_ari' => 0], signatures: ['referee' => 'W7'], signatureNames: null, notes: null, userId: $user->id);

    $m8 = $matches->get(7)->fresh();
    $m9 = $matches->get(8)->fresh();

    // In Grand Final, SHIRO (Lower finalist) wins against AKA (Upper finalist)!
    $resultService->record(
        $m8,
        akaBreakdown: ['waza_ari' => 0],
        shiroBreakdown: ['waza_ari' => 1],
        signatures: ['referee' => 'W8'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );

    $m9->refresh();
    // GF2 must be ACTIVE and pending
    expect($m9->is_bye)->toBeFalse()
        ->and($m9->status)->toBe('pending')
        ->and($m9->metadata['gf2_status'])->toBe('active')
        ->and($m9->red_label)->toBe($m8->red_label)
        ->and($m9->blue_label)->toBe($m8->blue_label);

    // Play GF2: Lower finalist wins GF2
    $resultService->record(
        $m9,
        akaBreakdown: ['waza_ari' => 0],
        shiroBreakdown: ['waza_ari' => 1],
        signatures: ['referee' => 'W9'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );

    // Verify Champion is SHIRO from GF2
    $championService = app(ChampionResultService::class);
    $generation = $championService->generationData($category);
    expect($generation['ready'])->toBeTrue()
        ->and($generation['champions'][0]['label'])->toBe($m9->blue_label)
        ->and($generation['champions'][1]['label'])->toBe($m9->red_label);
});
