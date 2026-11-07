<?php

use App\Events\EmbuJudgeScoreUpdated;
use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event as EventFacade;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Panitera', 'guard_name' => 'web']);
});

test('authorized admin can save a complete signed referee draft as submitted', function (): void {
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    [$event, $score] = submittedRefereeScoreFixture('authorized');
    $reportUrl = route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'referee-scores']);

    $this->actingAs($admin)
        ->get($reportUrl)
        ->assertInertia(fn (Assert $page) => $page
            ->where('canSubmitRefereeScores', true)
            ->where('dataset.rows.0.score_id', $score->id)
            ->where('dataset.rows.0.status_value', 'draft')
            ->where('dataset.rows.0.can_submit', true));

    $response = $this->actingAs($admin)
        ->from($reportUrl)
        ->post(route('admin.laporan.referee-scores.submitted.store', [
            'event' => $event,
            'embuJudgeScore' => $score,
        ]));

    $response->assertRedirect($reportUrl)
        ->assertSessionHas('success', 'Penilaian draft berhasil disimpan sebagai Sudah Dikirim.');

    $score->refresh();
    expect($score->status)->toBe('submitted')
        ->and($score->submitted_at)->not->toBeNull()
        ->and($score->signed_at)->not->toBeNull();

    $this->assertDatabaseHas('embu_scores', [
        'event_id' => $event->id,
        'tournament_match_id' => $score->tournament_match_id,
        'status' => 'ready_for_verification',
    ]);
    EventFacade::assertDispatched(
        EmbuJudgeScoreUpdated::class,
        fn (EmbuJudgeScoreUpdated $event): bool => $event->status === 'submitted'
            && $event->matchId === $score->tournament_match_id,
    );
});

test('an incomplete referee draft cannot be submitted', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    [$event, $score] = submittedRefereeScoreFixture('incomplete');
    $aspectScores = $score->aspect_scores;
    $aspectScores['goho_attack'] = null;
    $score->update(['aspect_scores' => $aspectScores, 'completed_items' => 9]);

    $response = $this->actingAs($admin)
        ->from(route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'referee-scores']))
        ->post(route('admin.laporan.referee-scores.submitted.store', [
            'event' => $event,
            'embuJudgeScore' => $score,
        ]));

    $response->assertSessionHasErrors('score');
    $this->assertDatabaseHas('embu_judge_scores', [
        'id' => $score->id,
        'status' => 'draft',
        'submitted_at' => null,
    ]);
});

test('a complete referee draft can be submitted without a signature', function (): void {
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    [$event, $score] = submittedRefereeScoreFixture('unsigned');
    $score->update(['signature' => null, 'signed_at' => null]);
    $reportUrl = route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'referee-scores']);

    $this->actingAs($admin)
        ->get($reportUrl)
        ->assertInertia(fn (Assert $page) => $page
            ->where('dataset.rows.0.signature', 'Belum ada')
            ->where('dataset.rows.0.can_submit', true));

    $response = $this->actingAs($admin)
        ->from($reportUrl)
        ->post(route('admin.laporan.referee-scores.submitted.store', [
            'event' => $event,
            'embuJudgeScore' => $score,
        ]));

    $response->assertRedirect($reportUrl)
        ->assertSessionHasNoErrors();
    $score->refresh();
    expect($score->status)->toBe('submitted')
        ->and($score->signature)->toBeNull()
        ->and($score->signed_at)->toBeNull()
        ->and($score->submitted_at)->not->toBeNull();
    $this->assertDatabaseHas('embu_scores', [
        'tournament_match_id' => $score->tournament_match_id,
        'status' => 'ready_for_verification',
    ]);
    EventFacade::assertDispatched(
        EmbuJudgeScoreUpdated::class,
        fn (EmbuJudgeScoreUpdated $event): bool => $event->status === 'submitted' && ! $event->isSigned,
    );
});

test('authorized admin can submit every complete draft at once and leave incomplete drafts unchanged', function (): void {
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    [$event, $firstScore] = submittedRefereeScoreFixture('bulk');
    $secondUser = User::factory()->create();
    $secondReferee = Referee::query()->create([
        'user_id' => $secondUser->id,
        'name' => 'Wasit Bulk Kedua',
        'gender' => 'female',
        'is_active' => true,
    ]);
    $secondScore = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $firstScore->tournament_match_id,
        'event_court_id' => $firstScore->event_court_id,
        'referee_id' => $secondReferee->id,
        'user_id' => $secondUser->id,
        'judge_number' => 2,
        'role' => 'judge_1',
        'status' => 'draft',
        'signature' => null,
        'signed_at' => null,
        'submitted_at' => null,
    ]);
    $incompleteUser = User::factory()->create();
    $incompleteReferee = Referee::query()->create([
        'user_id' => $incompleteUser->id,
        'name' => 'Wasit Bulk Belum Lengkap',
        'gender' => 'male',
        'is_active' => true,
    ]);
    $incompleteScores = $firstScore->aspect_scores;
    $incompleteScores['goho_attack'] = null;
    $incompleteScore = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $firstScore->tournament_match_id,
        'event_court_id' => $firstScore->event_court_id,
        'referee_id' => $incompleteReferee->id,
        'user_id' => $incompleteUser->id,
        'judge_number' => 3,
        'role' => 'judge_2',
        'aspect_scores' => $incompleteScores,
        'completed_items' => 9,
        'status' => 'draft',
        'submitted_at' => null,
    ]);
    $reportUrl = route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'referee-scores']);

    $response = $this->actingAs($admin)
        ->from($reportUrl)
        ->post(route('admin.laporan.referee-scores.submitted.store-all', ['event' => $event]));

    $response->assertRedirect($reportUrl)
        ->assertSessionHas('success', '2 penilaian draft berhasil disimpan sebagai Sudah Dikirim.');
    $this->assertDatabaseHas('embu_judge_scores', ['id' => $firstScore->id, 'status' => 'submitted']);
    $this->assertDatabaseHas('embu_judge_scores', ['id' => $secondScore->id, 'status' => 'submitted', 'signed_at' => null]);
    $this->assertDatabaseHas('embu_judge_scores', ['id' => $incompleteScore->id, 'status' => 'draft', 'submitted_at' => null]);
    EventFacade::assertDispatchedTimes(EmbuJudgeScoreUpdated::class, 2);
});

test('bulk submission reports when no complete draft is available', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    [$event, $score] = submittedRefereeScoreFixture('bulk-empty');
    $aspectScores = $score->aspect_scores;
    $aspectScores['goho_attack'] = null;
    $score->update(['aspect_scores' => $aspectScores, 'completed_items' => 9]);

    $response = $this->actingAs($admin)
        ->post(route('admin.laporan.referee-scores.submitted.store-all', ['event' => $event]));

    $response->assertSessionHas('info', 'Tidak ada draft dengan 10 aspek nilai lengkap yang perlu dikirim.');
    $this->assertDatabaseHas('embu_judge_scores', ['id' => $score->id, 'status' => 'draft']);
});

test('a user without report management access cannot submit a referee draft', function (): void {
    $user = User::factory()->create();
    [$event, $score] = submittedRefereeScoreFixture('forbidden');

    $this->actingAs($user)
        ->post(route('admin.laporan.referee-scores.submitted.store-all', ['event' => $event]))
        ->assertForbidden();

    $this->assertDatabaseHas('embu_judge_scores', [
        'id' => $score->id,
        'status' => 'draft',
    ]);
});

test('a Panitera can submit a complete referee draft for the active event', function (): void {
    $panitera = User::factory()->create();
    $panitera->assignRole('Panitera');
    [$event, $score] = submittedRefereeScoreFixture('panitera');

    $this->actingAs($panitera)
        ->post(route('admin.laporan.referee-scores.submitted.store', [
            'event' => $event,
            'embuJudgeScore' => $score,
        ]))
        ->assertRedirect();

    $this->assertDatabaseHas('embu_judge_scores', [
        'id' => $score->id,
        'status' => 'submitted',
    ]);
});

test('a referee score cannot be submitted through another event route', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    [, $score] = submittedRefereeScoreFixture('original-event');
    [$otherEvent] = submittedRefereeScoreFixture('other-event');

    $this->actingAs($admin)
        ->post(route('admin.laporan.referee-scores.submitted.store', [
            'event' => $otherEvent,
            'embuJudgeScore' => $score,
        ]))
        ->assertNotFound();

    $this->assertDatabaseHas('embu_judge_scores', [
        'id' => $score->id,
        'status' => 'draft',
    ]);
});

/** @return array{Event, EmbuJudgeScore} */
function submittedRefereeScoreFixture(string $suffix): array
{
    $event = Event::query()->create([
        'name' => 'Event Submit Nilai '.str($suffix)->headline(),
        'slug' => 'event-submit-nilai-'.$suffix,
        'venue' => 'GOR Pengujian',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court '.$suffix,
        'order' => 1,
        'is_active' => true,
    ]);
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan '.$suffix,
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 2,
        'order' => 1,
        'is_active' => true,
    ]);
    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);
    $match = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'participant_label' => 'Tim Pengujian',
        'match_sequence' => 1,
    ]);
    $refereeUser = User::factory()->create();
    $referee = Referee::query()->create([
        'user_id' => $refereeUser->id,
        'name' => 'Wasit '.$suffix,
        'gender' => 'male',
        'is_active' => true,
    ]);
    $score = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'user_id' => $refereeUser->id,
        'status' => 'draft',
        'submitted_at' => null,
    ]);

    return [$event, $score];
}
