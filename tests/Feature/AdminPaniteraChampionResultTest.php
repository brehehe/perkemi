<?php

use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function createChampionResultEvent(string $name): Event
{
    return Event::create([
        'name' => $name,
        'slug' => str($name)->slug()->toString(),
        'tenant_subdomain' => str($name)->slug()->toString(),
        'venue' => 'GOR Hasil Juara',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);
}

function createChampionResultUser(Event $event): User
{
    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Panitera');
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    return $user;
}

/** @return array{0: EventMatchCategory, 1: TournamentDrawing} */
function createChampionResultCategory(
    Event $event,
    string $name,
    string $type,
    string $format,
    int $participantCount,
): array {
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
        'participant_count' => $participantCount,
        'contingent_count' => $participantCount,
        'generated_at' => now(),
    ]);

    return [$category, $drawing];
}

/** @return array<string, mixed> */
function championResultParticipant(int $number): array
{
    return [
        'key' => "participant-{$number}",
        'entry_id' => "entry-{$number}",
        'entry_ids' => ["entry-{$number}"],
        'athlete_ids' => [],
        'contingent_name' => "Kontingen {$number}",
        'label' => "Peserta {$number}",
    ];
}

function createChampionEmbuParticipantMatch(
    Event $event,
    EventMatchCategory $category,
    TournamentDrawing $drawing,
    int $number,
): TournamentMatch {
    $participant = championResultParticipant($number);

    return TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'pool' => 'A',
        'match_sequence' => $number,
        'participant_label' => $participant['label'],
        'metadata' => $participant,
    ]);
}

function createChampionRandoriMatch(
    Event $event,
    EventMatchCategory $category,
    TournamentDrawing $drawing,
    string $roundLabel,
    int $sequence,
    array $red,
    array $blue,
    string $winnerCorner = 'aka',
): TournamentMatch {
    $match = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => $roundLabel === 'Grand Final' ? 'final' : 'preliminary',
        'round_label' => $roundLabel,
        'match_sequence' => $sequence,
        'red_label' => $red['label'],
        'blue_label' => $blue['label'],
        'metadata' => [
            'placeholder' => false,
            'red' => $red,
            'blue' => $blue,
        ],
    ]);

    RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'winner_corner' => $winnerCorner,
        'aka_total' => $winnerCorner === 'aka' ? 10 : 5,
        'shiro_total' => $winnerCorner === 'shiro' ? 10 : 5,
    ]);

    return $match;
}

test('Panitera sees champion categories with exhibition classification per match number', function () {
    $event = createChampionResultEvent('Event Klasifikasi Juara');
    $user = createChampionResultUser($event);
    [$exhibitionCategory, $exhibitionDrawing] = createChampionResultCategory(
        $event,
        'Embu Ekshibisi',
        'embu',
        'embu_direct_final',
        3,
    );
    [$regularCategory] = createChampionResultCategory(
        $event,
        'Randori Non-ekshibisi',
        'randori',
        'single_elimination',
        4,
    );

    foreach (range(1, 3) as $number) {
        createChampionEmbuParticipantMatch($event, $exhibitionCategory, $exhibitionDrawing, $number);
    }

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/champions?event_id={$event->id}&category={$exhibitionCategory->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/ChampionResults')
            ->where('activeEvent.id', $event->id)
            ->has('categories', 2)
            ->where('championship.id', $exhibitionCategory->id)
            ->where('championship.is_exhibition', true)
            ->where('championship.participant_count', 3)
            ->where('championship.required_champion_count', 3)
            ->where('summary.exhibition_categories', 1)
            ->where('summary.non_exhibition_categories', 1)
            ->where('categories', fn ($categories): bool => collect($categories)->contains(
                fn (array $category): bool => $category['id'] === $regularCategory->id
                    && $category['is_exhibition'] === false,
            ))
        );
});

test('Panitera sees every active category including categories without a drawing', function () {
    $event = createChampionResultEvent('Event Semua Nomor Juara');
    $user = createChampionResultUser($event);
    [$categoryWithDrawing] = createChampionResultCategory(
        $event,
        'Embu Sudah Drawing',
        'embu',
        'embu_direct_final',
        3,
    );
    $categoryWithoutDrawing = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Belum Drawing',
        'type' => 'randori',
        'gender' => 'mixed',
        'capacity' => 20,
        'max_athletes_per_team' => 1,
        'order' => 2,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/champions?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/ChampionResults')
            ->has('categories', 2)
            ->where('selectedCategory', $categoryWithDrawing->id)
            ->where('summary.total_categories', 2)
            ->where('summary.exhibition_categories', 1)
            ->where('summary.non_exhibition_categories', 0)
            ->where('categories', fn ($categories): bool => collect($categories)->contains(
                fn (array $category): bool => $category['id'] === $categoryWithoutDrawing->id
                    && $category['has_drawing'] === false
                    && $category['is_exhibition'] === null
                    && $category['generation_ready'] === false
                    && $category['generation_message'] === 'Drawing pertandingan belum dibuat untuk nomor ini.',
            ))
        );
});

test('the champion category list exposes ready candidates for direct generation', function () {
    $event = createChampionResultEvent('Event Generate Langsung Juara');
    $user = createChampionResultUser($event);
    [$category, $drawing] = createChampionResultCategory(
        $event,
        'Randori Siap Generate',
        'randori',
        'single_elimination',
        2,
    );
    $red = championResultParticipant(1);
    $blue = championResultParticipant(2);

    createChampionRandoriMatch($event, $category, $drawing, 'Grand Final', 1, $red, $blue);

    $this->actingAs($user)
        ->get("/admin/panitera/scoring/champions?event_id={$event->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/ChampionResults')
            ->where('summary.ready_categories', 1)
            ->where('categories.0.id', $category->id)
            ->where('categories.0.generation_ready', true)
            ->where('categories.0.required_champion_count', 2)
            ->has('categories.0.generation_candidates', 2)
            ->where('categories.0.generation_candidates.0.rank', 1)
            ->where('categories.0.generation_candidates.0.label', 'Peserta 1')
            ->where('categories.0.generation_candidates.1.rank', 2)
            ->where('categories.0.generation_candidates.1.label', 'Peserta 2')
        );
});

test('Panitera can manually adjust and replace champions even before automatic generation is ready', function () {
    $event = createChampionResultEvent('Event Penyesuaian Juara');
    $user = createChampionResultUser($event);
    [$category, $drawing] = createChampionResultCategory(
        $event,
        'Embu Penyesuaian',
        'embu',
        'embu_direct_final',
        3,
    );

    foreach (range(1, 3) as $number) {
        createChampionEmbuParticipantMatch($event, $category, $drawing, $number);
    }

    $this->actingAs($user)
        ->put("/admin/panitera/scoring/champions/{$category->id}", [
            'event_id' => $event->id,
            'champions' => [
                ['rank' => 1, 'participant_key' => 'participant-2'],
                ['rank' => 2, 'participant_key' => 'participant-1'],
                ['rank' => 3, 'participant_key' => 'participant-3'],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    expect($event->tournamentResults()->count())->toBe(3);
    $this->assertDatabaseHas('tournament_results', [
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'contingent_name' => 'Kontingen 2',
        'rank' => 1,
        'is_exhibition' => true,
    ]);

    $this->actingAs($user)
        ->put("/admin/panitera/scoring/champions/{$category->id}", [
            'event_id' => $event->id,
            'champions' => [
                ['rank' => 1, 'participant_key' => 'participant-1'],
                ['rank' => 2, 'participant_key' => 'participant-3'],
                ['rank' => 3, 'participant_key' => 'participant-2'],
            ],
        ])
        ->assertSessionHasNoErrors();

    expect($event->tournamentResults()->count())->toBe(3);
    $this->assertDatabaseHas('tournament_results', [
        'event_match_category_id' => $category->id,
        'contingent_name' => 'Kontingen 1',
        'rank' => 1,
    ]);
});

test('Panitera generates three Embu champions for an exhibition match number', function () {
    $event = createChampionResultEvent('Event Juara Embu Ekshibisi');
    $user = createChampionResultUser($event);
    [$category, $drawing] = createChampionResultCategory(
        $event,
        'Embu Ekshibisi Tiga Tim',
        'embu',
        'embu_direct_final',
        3,
    );

    foreach ([90, 80, 70] as $participantIndex => $score) {
        $participant = championResultParticipant($participantIndex + 1);

        foreach (['preliminary', 'final'] as $phaseIndex => $phase) {
            $match = TournamentMatch::create([
                'tournament_drawing_id' => $drawing->id,
                'event_id' => $event->id,
                'event_match_category_id' => $category->id,
                'phase' => $phase,
                'round_label' => $phase === 'final' ? 'Babak Final' : 'Babak Penyisihan',
                'pool' => $phase === 'final' ? 'F' : 'A',
                'match_sequence' => ($phaseIndex * 3) + $participantIndex + 1,
                'participant_label' => $participant['label'],
                'metadata' => $participant,
            ]);
            EmbuScore::factory()->create([
                'event_id' => $event->id,
                'tournament_match_id' => $match->id,
                'judge_scores' => array_fill(0, 5, $score),
                'middle_score' => $score * 3,
                'final_score' => $score * 3,
            ]);
        }
    }

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/champions/{$category->id}/generate", [
            'event_id' => $event->id,
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    expect($event->tournamentResults()->count())->toBe(3);
    $this->assertDatabaseHas('tournament_results', [
        'event_match_category_id' => $category->id,
        'participant_key' => 'participant-1',
        'rank' => 1,
        'is_exhibition' => true,
    ]);
    $this->assertDatabaseHas('tournament_results', [
        'event_match_category_id' => $category->id,
        'participant_key' => 'participant-3',
        'rank' => 3,
        'is_exhibition' => true,
    ]);
});

test('Panitera generates Randori champions from the completed double elimination ending', function () {
    $event = createChampionResultEvent('Event Juara Randori');
    $user = createChampionResultUser($event);
    [$category, $drawing] = createChampionResultCategory(
        $event,
        'Randori Putra 60 Kg',
        'randori',
        'double_elimination',
        4,
    );
    $participants = collect(range(1, 4))->mapWithKeys(
        fn (int $number): array => [$number => championResultParticipant($number)],
    );

    createChampionRandoriMatch($event, $category, $drawing, 'Lower Bracket · Babak 1', 3, $participants[3], $participants[4]);
    createChampionRandoriMatch($event, $category, $drawing, 'Final Lower Bracket', 5, $participants[2], $participants[3]);
    createChampionRandoriMatch($event, $category, $drawing, 'Grand Final', 6, $participants[1], $participants[2]);

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/champions/{$category->id}/generate", [
            'event_id' => $event->id,
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $expectedWinners = [
        1 => 'Kontingen 1',
        2 => 'Kontingen 2',
        3 => 'Kontingen 3',
        4 => 'Kontingen 4',
    ];

    foreach ($expectedWinners as $rank => $contingentName) {
        $this->assertDatabaseHas('tournament_results', [
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'contingent_name' => $contingentName,
            'rank' => $rank,
            'is_exhibition' => false,
        ]);
    }
});

test('Panitera cannot change champion results belonging to another event', function () {
    $event = createChampionResultEvent('Event Juara Sendiri');
    $otherEvent = createChampionResultEvent('Event Juara Lain');
    $user = createChampionResultUser($event);
    [$otherCategory] = createChampionResultCategory(
        $otherEvent,
        'Embu Event Lain',
        'embu',
        'embu_direct_final',
        3,
    );

    $this->actingAs($user)
        ->post("/admin/panitera/scoring/champions/{$otherCategory->id}/generate", [
            'event_id' => $event->id,
        ])
        ->assertNotFound();
});
