<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentMatchVarReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
});

test('admin can initiate a VAR review which pauses match timer', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Wilayah VAR 2026',
        'slug' => 'kejuaraan-wilayah-var-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Tatami 1',
        'court_number' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra',
        'type' => 'randori',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'tournament_drawing_id' => $drawing->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'status' => 'in_progress',
        'timer_status' => 'running',
        'timer_duration_seconds' => 120,
        'timer_elapsed_seconds' => 45,
        'timer_started_at' => now()->subSeconds(5),
    ]);

    $response = $this->actingAs($admin)
        ->postJson(route('admin.panitera.matches.var.store', ['tournamentMatch' => $match->id]), [
            'event_id' => $event->id,
            'corner' => 'aka',
            'requested_by' => 'aka_coach',
            'reason' => 'Tantangan Poin Waza-ari',
            'camera_angle' => 'cam_corner_aka',
            'match_second' => 50,
        ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('review.status', 'reviewing')
        ->assertJsonPath('review.corner', 'aka');

    $match->refresh();
    // Timer is auto-paused
    expect($match->timer_status)->toBe('paused')
        ->and($match->metadata['under_var_review'])->toBeTrue();

    // Verify DB entry
    $review = TournamentMatchVarReview::query()->where('tournament_match_id', $match->id)->first();
    expect($review)->not->toBeNull()
        ->and($review->reason)->toBe('Tantangan Poin Waza-ari')
        ->and($review->status)->toBe('reviewing');
});

test('overturned verdict retains challenge card, upheld verdict consumes it', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Wilayah VAR 2026',
        'slug' => 'kejuaraan-wilayah-var-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra',
        'type' => 'randori',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'tournament_drawing_id' => $drawing->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'status' => 'in_progress',
    ]);

    // 1. First review for AKA: Overturned (Card retained)
    $this->actingAs($admin)
        ->postJson(route('admin.panitera.matches.var.store', ['tournamentMatch' => $match->id]), [
            'event_id' => $event->id,
            'corner' => 'aka',
            'requested_by' => 'aka_coach',
            'reason' => 'Tantangan Poin Pertama',
        ]);

    $review1 = TournamentMatchVarReview::query()->where('tournament_match_id', $match->id)->first();

    $resolveResponse1 = $this->actingAs($admin)
        ->postJson(route('admin.panitera.var.resolve', ['review' => $review1->id]), [
            'event_id' => $event->id,
            'status' => 'overturned',
            'verdict_notes' => 'Poin sah, keputusan wasit dibatalkan.',
        ]);

    $resolveResponse1->assertOk()
        ->assertJsonPath('cards_remaining.aka', 1);

    expect($review1->fresh()->challenge_card_retained)->toBeTrue();

    // 2. Second review for AKA: Upheld (Card consumed)
    $this->actingAs($admin)
        ->postJson(route('admin.panitera.matches.var.store', ['tournamentMatch' => $match->id]), [
            'event_id' => $event->id,
            'corner' => 'aka',
            'requested_by' => 'aka_coach',
            'reason' => 'Tantangan Poin Kedua',
        ]);

    $review2 = TournamentMatchVarReview::query()->where('tournament_match_id', $match->id)->where('status', 'reviewing')->first();

    $resolveResponse2 = $this->actingAs($admin)
        ->postJson(route('admin.panitera.var.resolve', ['review' => $review2->id]), [
            'event_id' => $event->id,
            'status' => 'upheld',
            'verdict_notes' => 'Putusan wasit tetap berlaku.',
        ]);

    $resolveResponse2->assertOk()
        ->assertJsonPath('cards_remaining.aka', 0);

    expect($review2->fresh()->challenge_card_retained)->toBeFalse();

    // 3. Third review attempt for AKA should fail with validation error because card is 0
    $failResponse = $this->actingAs($admin)
        ->postJson(route('admin.panitera.matches.var.store', ['tournamentMatch' => $match->id]), [
            'event_id' => $event->id,
            'corner' => 'aka',
            'requested_by' => 'aka_coach',
            'reason' => 'Tantangan Poin Ketiga',
        ]);

    $failResponse->assertStatus(422)
        ->assertJsonPath('message', 'Sudut AKA sudah tidak memiliki kuota kartu challenge VAR.');
});

test('admin can retrieve var history and cards remaining', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Wilayah VAR 2026',
        'slug' => 'kejuaraan-wilayah-var-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra',
        'type' => 'randori',
        'gender' => 'male',
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => 'single_elimination',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'tournament_drawing_id' => $drawing->id,
        'phase' => 'final',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'status' => 'in_progress',
    ]);

    $response = $this->actingAs($admin)
        ->getJson(route('admin.panitera.matches.var.history', [
            'tournamentMatch' => $match->id,
            'event_id' => $event->id,
        ]));

    $response->assertOk()
        ->assertJsonPath('cards_remaining.aka', 1)
        ->assertJsonPath('cards_remaining.shiro', 1)
        ->assertJsonPath('active_review', null)
        ->assertJsonPath('reviews', []);
});
