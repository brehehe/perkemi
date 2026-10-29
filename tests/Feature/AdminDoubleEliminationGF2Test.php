<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Panitera\ChampionResultService;
use App\Services\Panitera\RandoriResultService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createDoubleElimEvent(string $name = 'Event Double Elim'): Event
{
    $event = Event::create([
        'name' => $name,
        'slug' => str($name)->slug()->toString(),
        'tenant_subdomain' => str($name)->slug()->toString(),
        'venue' => 'GOR Double Elim',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_active' => true,
    ]);
    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);

    return $event;
}

test('GF2 is automatically skipped when Upper Bracket (WB) finalist wins Grand Final', function () {
    $event = createDoubleElimEvent('Event GF2 Skip');
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa 60kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'bracket_type' => 'double_elimination',
        'status' => 'in_progress',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);

    $contingent1 = Contingent::create(['event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo 1', 'city' => 'Surabaya', 'manager_name' => 'Sensei 1', 'phone' => '08123456781']);
    $contingent2 = Contingent::create(['event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo 2', 'city' => 'Malang', 'manager_name' => 'Sensei 2', 'phone' => '08123456782']);
    $athlete1 = Athlete::create(['contingent_id' => $contingent1->id, 'name' => 'Kenshi 1 (WB Winner)']);
    $athlete2 = Athlete::create(['contingent_id' => $contingent2->id, 'name' => 'Kenshi 2 (LB Winner)']);
    $entry1 = AthleteMatchCategoryEntry::create(['event_id' => $event->id, 'athlete_id' => $athlete1->id, 'event_match_category_id' => $category->id]);
    $entry2 = AthleteMatchCategoryEntry::create(['event_id' => $event->id, 'athlete_id' => $athlete2->id, 'event_match_category_id' => $category->id]);

    $p1 = [
        'entry_id' => $entry1->id,
        'label' => $athlete1->name,
        'contingent_name' => 'Dojo 1',
    ];
    $p2 = [
        'entry_id' => $entry2->id,
        'label' => $athlete2->name,
        'contingent_name' => 'Dojo 2',
    ];

    $grandFinal = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 6,
        'round_label' => 'Grand Final',
        'phase' => 'final',
        'bracket_position' => 1,
        'status' => 'pending',
        'red_entry_id' => $entry1->id,
        'blue_entry_id' => $entry2->id,
        'red_label' => $athlete1->name,
        'blue_label' => $athlete2->name,
        'metadata' => [
            'red' => $p1,
            'blue' => $p2,
        ],
    ]);

    $gf2 = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 7,
        'round_label' => 'Grand Final Ulang (GF2)',
        'phase' => 'final',
        'bracket_position' => 2,
        'status' => 'pending',
        'red_label' => 'Pemenang Upper Bracket (Bila Perlu)',
        'blue_label' => 'Pemenang Lower Bracket (Bila Perlu)',
        'is_bye' => false,
        'metadata' => [
            'is_gf2' => true,
        ],
    ]);

    $grandFinal->update(['next_match_id' => $gf2->id]);

    // Red (WB Winner) wins Grand Final
    $service = app(RandoriResultService::class);
    $service->record(
        $grandFinal,
        akaBreakdown: ['waza_ari' => 1, 'ippon' => 0, 'total' => 5],
        shiroBreakdown: ['waza_ari' => 0, 'ippon' => 0, 'total' => 0],
        signatures: ['referee' => 'Wasit Utama'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );

    $gf2->refresh();
    expect($gf2->is_bye)->toBeTrue()
        ->and($gf2->status)->toBe('completed')
        ->and($gf2->metadata['gf2_status'])->toBe('skipped')
        ->and(str_contains((string) ($gf2->metadata['notes'] ?? ''), 'Slot GF2 dilewati otomatis'))->toBeTrue();
});

test('GF2 is activated and played when Lower Bracket (LB) finalist wins Grand Final', function () {
    $event = createDoubleElimEvent('Event GF2 Play');
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa 65kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'bracket_type' => 'double_elimination',
        'status' => 'in_progress',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);

    $contingent1 = Contingent::create(['event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo 1', 'city' => 'Surabaya', 'manager_name' => 'Sensei 1', 'phone' => '08123456781']);
    $contingent2 = Contingent::create(['event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo 2', 'city' => 'Malang', 'manager_name' => 'Sensei 2', 'phone' => '08123456782']);
    $athlete1 = Athlete::create(['contingent_id' => $contingent1->id, 'name' => 'Kenshi 1 (WB Winner)']);
    $athlete2 = Athlete::create(['contingent_id' => $contingent2->id, 'name' => 'Kenshi 2 (LB Winner)']);
    $entry1 = AthleteMatchCategoryEntry::create(['event_id' => $event->id, 'athlete_id' => $athlete1->id, 'event_match_category_id' => $category->id]);
    $entry2 = AthleteMatchCategoryEntry::create(['event_id' => $event->id, 'athlete_id' => $athlete2->id, 'event_match_category_id' => $category->id]);

    $p1 = [
        'entry_id' => $entry1->id,
        'label' => $athlete1->name,
        'contingent_name' => 'Dojo 1',
    ];
    $p2 = [
        'entry_id' => $entry2->id,
        'label' => $athlete2->name,
        'contingent_name' => 'Dojo 2',
    ];

    $grandFinal = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 6,
        'round_label' => 'Grand Final',
        'phase' => 'final',
        'bracket_position' => 1,
        'status' => 'pending',
        'red_entry_id' => $entry1->id,
        'blue_entry_id' => $entry2->id,
        'red_label' => $athlete1->name,
        'blue_label' => $athlete2->name,
        'metadata' => [
            'red' => $p1,
            'blue' => $p2,
        ],
    ]);

    $gf2 = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 7,
        'round_label' => 'Grand Final Ulang (GF2)',
        'phase' => 'final',
        'bracket_position' => 2,
        'status' => 'pending',
        'red_label' => 'Pemenang Upper Bracket (Bila Perlu)',
        'blue_label' => 'Pemenang Lower Bracket (Bila Perlu)',
        'is_bye' => false,
        'metadata' => [
            'is_gf2' => true,
        ],
    ]);

    $grandFinal->update(['next_match_id' => $gf2->id]);

    // Blue (LB Winner) wins Grand Final with an Ippon!
    $service = app(RandoriResultService::class);
    $service->record(
        $grandFinal,
        akaBreakdown: ['waza_ari' => 0, 'ippon' => 0, 'total' => 0],
        shiroBreakdown: ['waza_ari' => 0, 'ippon' => 1, 'total' => 10],
        signatures: ['referee' => 'Wasit Utama'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );

    $gf2->refresh();
    expect($gf2->is_bye)->toBeFalse()
        ->and($gf2->status)->toBe('pending')
        ->and($gf2->red_entry_id)->toBe($entry1->id)
        ->and($gf2->blue_entry_id)->toBe($entry2->id)
        ->and($gf2->metadata['gf2_status'])->toBe('active')
        ->and(str_contains((string) ($gf2->metadata['notes'] ?? ''), 'GF2 diaktifkan karena pemenang Grand Final'))->toBeTrue();

    // Now GF2 is played and Blue wins GF2 to become Champion!
    $service->record(
        $gf2,
        akaBreakdown: ['waza_ari' => 0, 'ippon' => 0, 'total' => 0],
        shiroBreakdown: ['waza_ari' => 1, 'ippon' => 0, 'total' => 5],
        signatures: ['referee' => 'Wasit Utama'],
        signatureNames: null,
        notes: null,
        userId: $user->id
    );

    $championService = app(ChampionResultService::class);
    $ranked = $championService->generate($event, $category);

    expect($ranked->first()['contingent_name'])->toBe('Dojo 2')
        ->and($ranked->first()['rank']->value)->toBe(1)
        ->and($ranked->get(1)['contingent_name'])->toBe('Dojo 1')
        ->and($ranked->get(1)['rank']->value)->toBe(2);
});
