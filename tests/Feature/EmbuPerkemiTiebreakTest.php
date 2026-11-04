<?php

use App\Events\EmbuTiebreakUpdated;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Panitera\EmbuResultService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function createTiebreakTestEnvironment(): array
{
    $event = Event::create([
        'name' => 'Event PERKEMI Tie-Break Test',
        'slug' => 'event-perkemi-tiebreak-test',
        'city' => 'Surabaya',
        'venue' => 'GOR Pancasila',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(2)->toDateString(),
        'is_active' => true,
    ]);

    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Super Admin');

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Tandoku Yudansha',
        'type' => 'embu',
        'gender' => 'male',
        'order' => 1,
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'bracket_type' => 'embu_2_pools',
        'status' => 'published',
        'participant_count' => 6,
        'contingent_count' => 6,
    ]);

    $referees = collect(range(1, 5))->map(function (int $num) {
        return Referee::create([
            'name' => "Wasit {$num}",
            'gender' => 'male',
            'dan_grade' => 'III Dan',
            'license_number' => "LIC-{$num}-".Str::random(4),
            'certification_level' => 'Nasional A',
            'is_active' => true,
        ]);
    });

    return [$event, $user, $court, $category, $drawing, $referees];
}

/**
 * Helper to record 5 judge scores for a match
 */
function recordFiveJudgeScores(
    TournamentMatch $match,
    EventCourt $court,
    array $judgeScoresData // array of 5: ['total' => float, 'technique' => float]
): void {
    $totals = [];
    foreach ($judgeScoresData as $idx => $data) {
        $judgeNum = $idx + 1;
        $total = (float) $data['total'];
        $tech = (float) $data['technique'];
        $expr = max(0, $total - $tech);
        $totals[] = $total;

        EmbuJudgeScore::create([
            'event_id' => $match->event_id,
            'tournament_match_id' => $match->id,
            'event_court_id' => $court->id,
            'referee_id' => Referee::skip($idx)->first()->id,
            'tiebreak_round' => 0,
            'judge_number' => $judgeNum,
            'role' => $judgeNum === 1 ? 'chief_judge' : 'judge',
            'aspect_scores' => [],
            'completed_items' => 10,
            'technique_subtotal' => $tech,
            'expression_subtotal' => $expr,
            'total_score' => $total,
            'status' => 'submitted',
        ]);
    }

    $sortedTotals = collect($totals)->sort()->values();
    $middleScore = $sortedTotals->slice(1, 3)->sum();

    EmbuScore::create([
        'event_id' => $match->event_id,
        'tournament_match_id' => $match->id,
        'tiebreak_round' => 0,
        'judge_scores' => $totals,
        'middle_score' => $middleScore,
        'final_score' => $middleScore,
        'time_penalty' => 0,
        'status' => 'verified',
    ]);
}

test('Parameter 1: participant with higher final score ranks first', function () {
    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    // Match A final score = 94.0 * 3 = 282.0
    recordFiveJudgeScores($matchA, $court, [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0], // Max
        ['total' => 93.0, 'technique' => 55.0], // Min
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ]);

    // Match B final score = 93.0 * 3 = 279.0
    recordFiveJudgeScores($matchB, $court, [
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0], // Max
        ['total' => 92.0, 'technique' => 54.0], // Min
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 93.0, 'technique' => 55.0],
    ]);

    $service = app(EmbuResultService::class);
    $rankings = $service->preliminaryRankings($category)->get('A');

    expect($rankings->first()['match_id'])->toBe($matchA->id)
        ->and($rankings->last()['match_id'])->toBe($matchB->id);
});

test('Parameter 2: when final score is tied, participant with higher technique of 3 middle judges ranks first', function () {
    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    // Both Kontingen have identical total scores: 93, 94, 94, 94, 95 -> Min=93, Max=95, Middle 3 sum = 282.0
    // Kontingen A: Middle 3 judges technique sum = 57.0 + 57.0 + 57.0 = 171.0
    recordFiveJudgeScores($matchA, $court, [
        ['total' => 94.0, 'technique' => 57.0], // Middle (Wasit 1)
        ['total' => 95.0, 'technique' => 58.0], // Max (trimmed)
        ['total' => 93.0, 'technique' => 54.0], // Min (trimmed)
        ['total' => 94.0, 'technique' => 57.0], // Middle
        ['total' => 94.0, 'technique' => 57.0], // Middle
    ]);

    // Kontingen B: Middle 3 judges technique sum = 55.0 + 55.0 + 55.0 = 165.0
    recordFiveJudgeScores($matchB, $court, [
        ['total' => 94.0, 'technique' => 55.0], // Middle (Wasit 1)
        ['total' => 95.0, 'technique' => 59.0], // Max (trimmed)
        ['total' => 93.0, 'technique' => 53.0], // Min (trimmed)
        ['total' => 94.0, 'technique' => 55.0], // Middle
        ['total' => 94.0, 'technique' => 55.0], // Middle
    ]);

    $service = app(EmbuResultService::class);
    $rankings = $service->preliminaryRankings($category)->get('A');

    expect($rankings->first()['match_id'])->toBe($matchA->id)
        ->and($rankings->first()['middle_technique_sum'])->toBe(171.0)
        ->and($rankings->last()['match_id'])->toBe($matchB->id)
        ->and($rankings->last()['middle_technique_sum'])->toBe(165.0);
});

test('Parameter 3: when final score and middle technique sum are tied, Chief Judge total score breaks tie even if Chief Judge was trimmed', function () {
    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    // Kontingen A: Wasit 1 had MAX score 96.0 (trimmed!), Middle 3 judges have total 282.0 and tech 168.0
    recordFiveJudgeScores($matchA, $court, [
        ['total' => 96.0, 'technique' => 58.0], // Wasit 1 (Max trimmed, total 96)
        ['total' => 94.0, 'technique' => 56.0], // Middle
        ['total' => 92.0, 'technique' => 54.0], // Min trimmed
        ['total' => 94.0, 'technique' => 56.0], // Middle
        ['total' => 94.0, 'technique' => 56.0], // Middle
    ]);

    // Kontingen B: Wasit 1 had MIN score 92.0 (trimmed!), Middle 3 judges have total 282.0 and tech 168.0
    recordFiveJudgeScores($matchB, $court, [
        ['total' => 92.0, 'technique' => 54.0], // Wasit 1 (Min trimmed, total 92)
        ['total' => 94.0, 'technique' => 56.0], // Middle
        ['total' => 96.0, 'technique' => 58.0], // Max trimmed
        ['total' => 94.0, 'technique' => 56.0], // Middle
        ['total' => 94.0, 'technique' => 56.0], // Middle
    ]);

    $service = app(EmbuResultService::class);
    $rankings = $service->preliminaryRankings($category)->get('A');

    // Kontingen A wins via Parameter 3 (Wasit 1 total: 96.0 vs 92.0)
    expect($rankings->first()['match_id'])->toBe($matchA->id)
        ->and($rankings->first()['chief_judge_total'])->toBe(96.0)
        ->and($rankings->last()['match_id'])->toBe($matchB->id)
        ->and($rankings->last()['chief_judge_total'])->toBe(92.0);
});

test('Parameter 4: when final score, middle technique sum, and Chief Judge total score are tied, Chief Judge technique breaks tie', function () {
    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    // Both Kontingen have identical total scores: Wasit 1 total is 94.0 for both!
    // Middle 3 technique sum is 168.0 for both!
    // Kontingen A: Wasit 1 technique = 57.0 (higher technique)
    recordFiveJudgeScores($matchA, $court, [
        ['total' => 94.0, 'technique' => 57.0], // Wasit 1: total 94, tech 57
        ['total' => 95.0, 'technique' => 58.0], // Max
        ['total' => 93.0, 'technique' => 54.0], // Min
        ['total' => 94.0, 'technique' => 55.5], // Middle
        ['total' => 94.0, 'technique' => 55.5], // Middle (57.0 + 55.5 + 55.5 = 168.0)
    ]);

    // Kontingen B: Wasit 1 technique = 55.0 (lower technique)
    recordFiveJudgeScores($matchB, $court, [
        ['total' => 94.0, 'technique' => 55.0], // Wasit 1: total 94, tech 55
        ['total' => 95.0, 'technique' => 58.0], // Max
        ['total' => 93.0, 'technique' => 54.0], // Min
        ['total' => 94.0, 'technique' => 56.5], // Middle
        ['total' => 94.0, 'technique' => 56.5], // Middle (55.0 + 56.5 + 56.5 = 168.0)
    ]);

    $service = app(EmbuResultService::class);
    $rankings = $service->preliminaryRankings($category)->get('A');

    // Kontingen A wins via Parameter 4 (Wasit 1 tech: 57.0 vs 55.0)
    expect($rankings->first()['match_id'])->toBe($matchA->id)
        ->and($rankings->first()['chief_judge_technique'])->toBe(57.0)
        ->and($rankings->last()['match_id'])->toBe($matchB->id)
        ->and($rankings->last()['chief_judge_technique'])->toBe(55.0);
});

test('Parameter 5: when all 4 parameters are tied, tie is detected and resolved via manual rank / arbitrase decision', function () {
    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    // Exactly identical scores across all judges
    $identicalScores = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];

    recordFiveJudgeScores($matchA, $court, $identicalScores);
    recordFiveJudgeScores($matchB, $court, $identicalScores);

    $service = app(EmbuResultService::class);
    $activeTies = $service->activeTies($category);

    expect($activeTies)->toHaveCount(1)
        ->and($activeTies->first()['pool'])->toBe('A');

    // Wasit / Arbitrase resolves tie: Kontingen B is assigned rank 1, Kontingen A rank 2
    $service->resolveTiebreakRanks($category, [
        $matchB->id => 1,
        $matchA->id => 2,
    ]);

    $rankingsAfter = $service->preliminaryRankings($category)->get('A');
    expect($rankingsAfter->first()['match_id'])->toBe($matchB->id)
        ->and($rankingsAfter->last()['match_id'])->toBe($matchA->id);
});

test('arbitration endpoint resolves parameter 5 tiebreak via HTTP', function () {
    [$event, $user, $court, $category, $drawing] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    $identicalScores = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];

    recordFiveJudgeScores($matchA, $court, $identicalScores);
    recordFiveJudgeScores($matchB, $court, $identicalScores);

    $response = $this->actingAs($user)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.arbitrase.scoring.embu.tiebreak', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'ranks' => [
                $matchB->id => 1,
                $matchA->id => 2,
            ],
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $matchB->refresh();
    expect($matchB->metadata['manual_tiebreak_rank'])->toBe(1);

    $service = app(EmbuResultService::class);
    $rankings = $service->preliminaryRankings($category)->get('A');
    expect($rankings->first()['match_id'])->toBe($matchB->id);
});

test('panitera endpoint resolves parameter 5 tiebreak via HTTP', function () {
    [$event, $user, $court, $category, $drawing] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    $identicalScores = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];

    recordFiveJudgeScores($matchA, $court, $identicalScores);
    recordFiveJudgeScores($matchB, $court, $identicalScores);

    $response = $this->actingAs($user)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.panitera.embu-result.resolve-tiebreak-ranks', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'ranks' => [
                $matchB->id => 1,
                $matchA->id => 2,
            ],
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $matchB->refresh();
    expect($matchB->metadata['manual_tiebreak_rank'])->toBe(1);
});

test('matches with 0 score do not trigger active tiebreak', function () {
    [$event, $user, $court, $category, $drawing] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    // Both have NO score or 0 score
    $service = app(EmbuResultService::class);
    $activeTies = $service->activeTies($category);

    expect($activeTies)->toBeEmpty();
});

test('panitera can request tiebreak to chief judge and cancel request', function () {
    [$event, $user, $court, $category, $drawing] = createTiebreakTestEnvironment();

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    $identicalScores = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];

    recordFiveJudgeScores($matchA, $court, $identicalScores);
    recordFiveJudgeScores($matchB, $court, $identicalScores);

    // Initial check: is_requested should be false
    $service = app(EmbuResultService::class);
    $tiesBefore = $service->activeTies($category);
    expect($tiesBefore->first()['is_requested'])->toBeFalse();

    // Panitera clicks "Kirim ke Panel Wasit Utama"
    $response = $this->actingAs($user)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.panitera.embu-result.request-tiebreak', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'match_ids' => [$matchA->id, $matchB->id],
            'action' => 'request',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $tiesAfter = $service->activeTies($category);
    expect($tiesAfter->first()['is_requested'])->toBeTrue();

    // Panitera cancels request
    $cancelResponse = $this->actingAs($user)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.panitera.embu-result.request-tiebreak', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'match_ids' => [$matchA->id, $matchB->id],
            'action' => 'cancel',
        ]);

    $cancelResponse->assertRedirect();
    $cancelResponse->assertSessionHas('success');

    $tiesCancelled = $service->activeTies($category);
    expect($tiesCancelled->first()['is_requested'])->toBeFalse();
});

test('only chief judge referee can resolve parameter 5 tiebreak', function () {
    [$event, $adminUser, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    Role::firstOrCreate(['name' => 'Wasit', 'guard_name' => 'web']);

    // Create user for Wasit Utama (Chief)
    $chiefUser = User::factory()->create();
    $chiefUser->assignRole('Wasit');
    $chiefReferee = $referees->first(); // Wasit 1
    $chiefReferee->update(['user_id' => $chiefUser->id]);
    $event->referees()->attach($chiefReferee->id);

    EventCourtAssignment::create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $chiefReferee->id,
        'role' => 'chief',
        'order' => 1,
    ]);

    // Create user for Assistant Referee (Juri 2)
    $assistantUser = User::factory()->create();
    $assistantUser->assignRole('Wasit');
    $assistantReferee = $referees->get(1); // Wasit 2
    $assistantReferee->update(['user_id' => $assistantUser->id]);
    $event->referees()->attach($assistantReferee->id);

    EventCourtAssignment::create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $assistantReferee->id,
        'role' => 'regional_1',
        'order' => 2,
    ]);

    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen A',
        'metadata' => ['key' => 'team-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen B',
        'metadata' => ['key' => 'team-b'],
    ]);

    $identicalScores = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];

    recordFiveJudgeScores($matchA, $court, $identicalScores);
    recordFiveJudgeScores($matchB, $court, $identicalScores);

    // Assistant referee attempts to resolve tiebreak -> 403 Forbidden
    $this->actingAs($assistantUser)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.arbitrase.scoring.embu.tiebreak', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'ranks' => [$matchB->id => 1, $matchA->id => 2],
        ])
        ->assertForbidden();

    // Chief judge attempts to resolve tiebreak -> 302 Redirect with success
    $this->actingAs($chiefUser)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.arbitrase.scoring.embu.tiebreak', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'ranks' => [$matchB->id => 1, $matchA->id => 2],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $matchB->refresh();
    expect($matchB->metadata['manual_rank'])->toBe(1);
});

test('contested ranks only: tie for rank 2 and 3 excludes secure rank 1 contestant and allows swap', function () {
    Illuminate\Support\Facades\Event::fake([EmbuTiebreakUpdated::class]);

    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    // Match 1: Score 95 -> Secure Rank 1 (Aman)
    $match1 = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen 1 (Juara 1 Aman)',
        'metadata' => ['key' => 'team-1'],
    ]);

    // Match 2: Score 94 -> Tied for Rank 2 & 3
    $match2 = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen 2 (Seri #2)',
        'metadata' => ['key' => 'team-2'],
    ]);

    // Match 3: Score 94 -> Tied for Rank 2 & 3
    $match3 = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 3,
        'participant_label' => 'Kontingen 3 (Seri #3)',
        'metadata' => ['key' => 'team-3'],
    ]);

    // Match 1 has higher score (95)
    recordFiveJudgeScores($match1, $court, [
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 96.0, 'technique' => 58.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 95.0, 'technique' => 57.0],
    ]);

    // Match 2 & 3 have identical score (94) across P1-P4
    $identicalScores = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];
    recordFiveJudgeScores($match2, $court, $identicalScores);
    recordFiveJudgeScores($match3, $court, $identicalScores);

    $service = app(EmbuResultService::class);
    $activeTies = $service->activeTies($category);

    // 1. Must produce exactly 1 tie group
    expect($activeTies)->toHaveCount(1);

    $group = $activeTies->first();

    // 2. Title must explicitly mention Rank 2 and 3, not Rank 1
    expect($group['title'])->toContain('#2');
    expect($group['title'])->toContain('#3');
    expect($group['title'])->not->toContain('#1');

    // 3. Matches in this group must ONLY be match 2 and match 3
    $tiedMatchIds = collect($group['matches'])->pluck('id')->all();
    expect($tiedMatchIds)->toContain($match2->id);
    expect($tiedMatchIds)->toContain($match3->id);
    expect($tiedMatchIds)->not->toContain($match1->id);

    // 4. Contested ranks are 2 and 3
    $ranks = collect($group['matches'])->pluck('rank')->sort()->values()->all();
    expect($ranks)->toEqual([2, 3]);

    // 5. Wasit Utama resolves tie-break: swaps Kontingen 3 to Rank 2, and Kontingen 2 to Rank 3
    $service->resolveTiebreakRanks($category, [
        $match3->id => 2,
        $match2->id => 3,
    ]);

    // Verify Reverb event dispatched
    Illuminate\Support\Facades\Event::assertDispatched(EmbuTiebreakUpdated::class, function ($event) use ($category, $match2, $match3) {
        return $event->categoryId === $category->id
            && $event->action === 'resolved'
            && in_array($match2->id, $event->matchIds)
            && in_array($match3->id, $event->matchIds);
    });

    // Check preliminary rankings order: Match 1 is Rank 1, Match 3 is Rank 2, Match 2 is Rank 3
    $rankings = $service->preliminaryRankings($category)->get('A');
    expect($rankings->get(0)['match_id'])->toBe($match1->id);
    expect($rankings->get(1)['match_id'])->toBe($match3->id);
    expect($rankings->get(2)['match_id'])->toBe($match2->id);

    // The tie is now resolved and no longer in activeTies
    expect($service->activeTies($category))->toBeEmpty();
});

test('multiple distinct tie groups in same pool: ranks 2&3 tied and ranks 5,6,7 tied are separated into independent cards', function () {
    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    // Helper to create match
    $createMatch = function (int $seq, string $label) use ($drawing, $event, $category, $court) {
        return TournamentMatch::create([
            'tournament_drawing_id' => $drawing->id,
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'event_court_id' => $court->id,
            'phase' => 'preliminary',
            'round_label' => 'Penyisihan Pool A',
            'pool' => 'A',
            'match_sequence' => $seq,
            'participant_label' => $label,
            'metadata' => ['key' => "team-{$seq}"],
        ]);
    };

    // 7 Kontingen
    $m1 = $createMatch(1, 'Kontingen 1 (Juara 1 Aman - 96.0)');
    $m2 = $createMatch(2, 'Kontingen 2 (Seri #2 - 94.0)');
    $m3 = $createMatch(3, 'Kontingen 3 (Seri #3 - 94.0)');
    $m4 = $createMatch(4, 'Kontingen 4 (Peringkat 4 Aman - 92.0)');
    $m5 = $createMatch(5, 'Kontingen 5 (Seri #5 - 90.0)');
    $m6 = $createMatch(6, 'Kontingen 6 (Seri #6 - 90.0)');
    $m7 = $createMatch(7, 'Kontingen 7 (Seri #7 - 90.0)');

    // M1: 96.0
    recordFiveJudgeScores($m1, $court, [
        ['total' => 96.0, 'technique' => 58.0],
        ['total' => 96.0, 'technique' => 58.0],
        ['total' => 96.0, 'technique' => 58.0],
        ['total' => 96.0, 'technique' => 58.0],
        ['total' => 96.0, 'technique' => 58.0],
    ]);

    // M2 & M3: identical 94.0
    $scores94 = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];
    recordFiveJudgeScores($m2, $court, $scores94);
    recordFiveJudgeScores($m3, $court, $scores94);

    // M4: 92.0
    recordFiveJudgeScores($m4, $court, [
        ['total' => 92.0, 'technique' => 54.0],
        ['total' => 92.0, 'technique' => 54.0],
        ['total' => 92.0, 'technique' => 54.0],
        ['total' => 92.0, 'technique' => 54.0],
        ['total' => 92.0, 'technique' => 54.0],
    ]);

    // M5, M6, M7: identical 90.0
    $scores90 = [
        ['total' => 90.0, 'technique' => 52.0],
        ['total' => 91.0, 'technique' => 53.0],
        ['total' => 89.0, 'technique' => 51.0],
        ['total' => 90.0, 'technique' => 52.0],
        ['total' => 90.0, 'technique' => 52.0],
    ];
    recordFiveJudgeScores($m5, $court, $scores90);
    recordFiveJudgeScores($m6, $court, $scores90);
    recordFiveJudgeScores($m7, $court, $scores90);

    $service = app(EmbuResultService::class);
    $activeTies = $service->activeTies($category);

    // 1. HARUS terpisah menjadi 2 kasus/grup tie-break terpisah (BUKAN digabung jadi 1 grup)
    expect($activeTies)->toHaveCount(2);

    $groupA = $activeTies->get(0);
    $groupB = $activeTies->get(1);

    // 2. Grup pertama: khusus Peringkat 2 & 3
    expect($groupA['title'])->toContain('#2');
    expect($groupA['title'])->toContain('#3');
    expect($groupA['title'])->not->toContain('#5');
    $groupAMatchIds = collect($groupA['matches'])->pluck('id')->all();
    expect($groupAMatchIds)->toEqual([$m2->id, $m3->id]);
    expect(collect($groupA['matches'])->pluck('rank')->all())->toEqual([2, 3]);

    // 3. Grup kedua: khusus Peringkat 5, 6, & 7
    expect($groupB['title'])->toContain('#5');
    expect($groupB['title'])->toContain('#6');
    expect($groupB['title'])->toContain('#7');
    expect($groupB['title'])->not->toContain('#2');
    $groupBMatchIds = collect($groupB['matches'])->pluck('id')->all();
    expect($groupBMatchIds)->toEqual([$m5->id, $m6->id, $m7->id]);
    expect(collect($groupB['matches'])->pluck('rank')->all())->toEqual([5, 6, 7]);

    // 4. M1 (Rank 1) dan M4 (Rank 4) TIDAK ADA di grup tie-break mana pun
    $allTiedIds = collect($activeTies)->flatMap(fn ($g) => collect($g['matches'])->pluck('id'))->all();
    expect($allTiedIds)->not->toContain($m1->id);
    expect($allTiedIds)->not->toContain($m4->id);

    // 5. Wasit Utama menyelesaikan Grup 1 terlebih dahulu (M3 jadi #2, M2 jadi #3)
    $service->resolveTiebreakRanks($category, [
        $m3->id => 2,
        $m2->id => 3,
    ]);

    // Sekarang hanya tersisa Grup 2 di activeTies
    $remainingTies = $service->activeTies($category);
    expect($remainingTies)->toHaveCount(1);
    expect($remainingTies->first()['title'])->toContain('#5');

    // 6. Wasit Utama menyelesaikan Grup 2 (M7 jadi #5, M5 jadi #6, M6 jadi #7)
    $service->resolveTiebreakRanks($category, [
        $m7->id => 5,
        $m5->id => 6,
        $m6->id => 7,
    ]);

    // Semua tie-break telah selesai!
    expect($service->activeTies($category))->toBeEmpty();

    // Verifikasi klasemen akhir secara berurutan: M1 (1), M3 (2), M2 (3), M4 (4), M7 (5), M5 (6), M6 (7)
    $finalRankings = $service->preliminaryRankings($category)->get('A');
    expect($finalRankings->get(0)['match_id'])->toBe($m1->id);
    expect($finalRankings->get(1)['match_id'])->toBe($m3->id);
    expect($finalRankings->get(2)['match_id'])->toBe($m2->id);
    expect($finalRankings->get(3)['match_id'])->toBe($m4->id);
    expect($finalRankings->get(4)['match_id'])->toBe($m7->id);
    expect($finalRankings->get(5)['match_id'])->toBe($m5->id);
    expect($finalRankings->get(6)['match_id'])->toBe($m6->id);
});

test('court isolation: tie-break only appears to the Chief Referee assigned to that specific court', function () {
    [$event, $user, $court1, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    Role::firstOrCreate(['name' => 'Wasit', 'guard_name' => 'web']);

    // Create Court 2
    $court2 = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);

    // Wasit Utama 1 on Court 1
    $chiefUser1 = User::factory()->create();
    $chiefUser1->assignRole('Wasit');
    $referee1 = $referees->get(0);
    $referee1->update(['user_id' => $chiefUser1->id]);
    $event->referees()->attach($referee1->id);

    EventCourtAssignment::create([
        'event_court_id' => $court1->id,
        'staff_type' => 'referee',
        'staff_id' => $referee1->id,
        'role' => 'chief',
        'order' => 1,
    ]);

    // Wasit Utama 2 on Court 2
    $chiefUser2 = User::factory()->create();
    $chiefUser2->assignRole('Wasit');
    $referee2 = Referee::create([
        'name' => 'Wasit Utama Court 2',
        'gender' => 'male',
        'dan_grade' => 'IV Dan',
        'license_number' => 'LIC-C2-'.Str::random(4),
        'certification_level' => 'Nasional A',
        'is_active' => true,
        'user_id' => $chiefUser2->id,
    ]);
    $event->referees()->attach($referee2->id);

    EventCourtAssignment::create([
        'event_court_id' => $court2->id,
        'staff_type' => 'referee',
        'staff_id' => $referee2->id,
        'role' => 'chief',
        'order' => 1,
    ]);

    // Matches on Court 1 that tie
    $matchA = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court1->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Kontingen Court 1 A',
        'metadata' => ['key' => 'c1-a'],
    ]);
    $matchB = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court1->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan Pool A',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kontingen Court 1 B',
        'metadata' => ['key' => 'c1-b'],
    ]);

    $identicalScores = [
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 95.0, 'technique' => 57.0],
        ['total' => 93.0, 'technique' => 55.0],
        ['total' => 94.0, 'technique' => 56.0],
        ['total' => 94.0, 'technique' => 56.0],
    ];
    recordFiveJudgeScores($matchA, $court1, $identicalScores);
    recordFiveJudgeScores($matchB, $court1, $identicalScores);

    // Panitera requests tiebreak
    app(EmbuResultService::class)->setTiebreakRequested($category, [$matchA->id, $matchB->id], true);

    // 1. Wasit Utama 1 (Court 1) sees the tie-break card
    $responseChief1 = $this->actingAs($chiefUser1)
        ->withSession(['active_event_id' => $event->id])
        ->get(route('admin.arbitrase.scoring', ['event_id' => $event->id]));

    $responseChief1->assertOk();
    $tiesChief1 = $responseChief1->viewData('page')['props']['embuTies'];
    expect($tiesChief1)->toHaveCount(1);
    expect($tiesChief1[0]['court_id'])->toBe($court1->id);

    // 2. Wasit Utama 2 (Court 2) DOES NOT see the tie-break card (isolated by court)
    $responseChief2 = $this->actingAs($chiefUser2)
        ->withSession(['active_event_id' => $event->id])
        ->get(route('admin.arbitrase.scoring', ['event_id' => $event->id]));

    $responseChief2->assertOk();
    $tiesChief2 = $responseChief2->viewData('page')['props']['embuTies'];
    expect($tiesChief2)->toBeEmpty();

    // 3. Wasit Utama 2 attempts to resolve tie-break for Court 1 -> 403 Forbidden
    $this->actingAs($chiefUser2)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.arbitrase.scoring.embu.tiebreak', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'ranks' => [$matchB->id => 1, $matchA->id => 2],
        ])
        ->assertForbidden();

    // 4. Wasit Utama 1 (Court 1) successfully resolves the tie-break
    $this->actingAs($chiefUser1)
        ->withSession(['active_event_id' => $event->id])
        ->post(route('admin.arbitrase.scoring.embu.tiebreak', ['matchCategory' => $category, 'event_id' => $event->id]), [
            'event_id' => $event->id,
            'ranks' => [$matchB->id => 1, $matchA->id => 2],
        ])
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('final round tie requires separate Parameter 5 decision even if preliminary round had manual tiebreak', function () {
    [$event, $user, $court, $category, $drawing, $referees] = createTiebreakTestEnvironment();

    $keySurabaya = '01a1:surabaya:1';
    $keyMalang = '01a1:malang:1';

    $scoresData = [
        ['total' => 99.0, 'technique' => 59.0],
        ['total' => 94.0, 'technique' => 58.0],
        ['total' => 96.0, 'technique' => 60.0],
        ['total' => 97.0, 'technique' => 59.0],
        ['total' => 92.0, 'technique' => 57.0],
    ];

    // 1. Babak Penyisihan
    $prelimSurabaya = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'pool' => 'A',
        'match_sequence' => 1,
        'participant_label' => 'Surabaya · Tim 1',
        'status' => 'completed',
        'metadata' => [
            'key' => $keySurabaya,
            'contingent_name' => 'Surabaya',
        ],
    ]);
    recordFiveJudgeScores($prelimSurabaya, $court, $scoresData);

    $prelimMalang = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'pool' => 'A',
        'match_sequence' => 2,
        'participant_label' => 'Kota Malang · Tim 1',
        'status' => 'completed',
        'metadata' => [
            'key' => $keyMalang,
            'contingent_name' => 'Kota Malang',
        ],
    ]);
    recordFiveJudgeScores($prelimMalang, $court, $scoresData);

    $service = app(EmbuResultService::class);

    // Di Penyisihan terjadi seri, lalu diputuskan Wasit Utama: Surabaya #1, Malang #2
    $service->resolveTiebreakRanks($category, [
        $prelimSurabaya->id => 1,
        $prelimMalang->id => 2,
    ]);

    // 2. Babak Final
    $finalSurabaya = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'final',
        'round_label' => 'Babak Final',
        'pool' => 'F',
        'match_sequence' => 3,
        'participant_label' => 'Surabaya · Tim 1',
        'status' => 'completed',
        'metadata' => [
            'key' => $keySurabaya,
            'contingent_name' => 'Surabaya',
        ],
    ]);
    recordFiveJudgeScores($finalSurabaya, $court, $scoresData);

    $finalMalang = TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'final',
        'round_label' => 'Babak Final',
        'pool' => 'F',
        'match_sequence' => 4,
        'participant_label' => 'Kota Malang · Tim 1',
        'status' => 'completed',
        'metadata' => [
            'key' => $keyMalang,
            'contingent_name' => 'Kota Malang',
        ],
    ]);
    recordFiveJudgeScores($finalMalang, $court, $scoresData);

    // Di Babak Final, nilai Akumulasi dan Parameter 2-4 identik:
    // Keputusan manual dari penyisihan TIDAK BOLEH otomatis dipakai untuk final!
    $activeTies = $service->activeTies($category);
    expect($activeTies)->toHaveCount(1);
    expect($activeTies->first()['phase'])->toBe('final');
    expect($activeTies->first()['title'])->toContain('Babak Final');

    // Panitera belum boleh kunci juara karena masih ada seri di babak final
    $finalRankings = $service->finalRankings($category);
    expect($service->hasTopFourTie($finalRankings))->toBeTrue();

    // Wasit Utama memutuskan untuk Babak Final: Malang mendapatkan Perak (#1 grup seri), Surabaya Perunggu (#2 grup seri)
    $service->resolveTiebreakRanks($category, [
        $finalMalang->id => 1,
        $finalSurabaya->id => 2,
    ]);

    // Seri di babak final telah selesai diputuskan
    expect($service->activeTies($category))->toBeEmpty();
    $updatedFinalRankings = $service->finalRankings($category);
    expect($service->hasTopFourTie($updatedFinalRankings))->toBeFalse();
    expect($updatedFinalRankings->first()['participant_label'])->toBe('Kota Malang · Tim 1');
    expect($updatedFinalRankings->get(1)['participant_label'])->toBe('Surabaya · Tim 1');
});
