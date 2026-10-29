<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
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
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
});

test('guests are redirected to login when visiting arbitration evaluation', function () {
    $this->get(route('admin.arbitrase.evaluation'))
        ->assertRedirect(route('login'));
});

test('admin can view arbitration evaluation dashboard with metrics and referee list', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Anti Bias 2026',
        'slug' => 'kejuaraan-anti-bias-2026',
        'venue' => 'GOR Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_active' => true,
    ]);

    $refereeA = Referee::query()->create([
        'name' => 'Sensei Hartono',
        'gender' => 'male',
        'region' => 'Surabaya',
        'certification_level' => 'Nasional A',
        'dan_grade' => 'IV Dan',
        'license_number' => 'WAS-001',
        'is_active' => true,
    ]);

    $refereeB = Referee::query()->create([
        'name' => 'Sensei Suryo',
        'gender' => 'male',
        'region' => 'Malang',
        'certification_level' => 'Nasional B',
        'dan_grade' => 'III Dan',
        'license_number' => 'WAS-002',
        'is_active' => true,
    ]);

    $event->referees()->attach($refereeA, ['role' => 'chief']);
    $event->referees()->attach($refereeB, ['role' => 'judge']);

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.evaluation', ['event_id' => $event->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Evaluation')
            ->where('activeEvent.id', $event->id)
            ->where('summary.total_referees', 2)
            ->has('referees', 2)
            ->has('heatmap')
            ->has('certificationOptions')
        );
});

test('admin can filter evaluation by certification and search query', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Filter 2026',
        'slug' => 'kejuaraan-filter-2026',
        'venue' => 'GOR Filter',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_active' => true,
    ]);

    $refereeA = Referee::query()->create([
        'name' => 'Sensei Bambang',
        'gender' => 'male',
        'region' => 'Surabaya',
        'certification_level' => 'Nasional A',
        'is_active' => true,
    ]);

    $refereeB = Referee::query()->create([
        'name' => 'Sensei Joko',
        'gender' => 'male',
        'region' => 'Kediri',
        'certification_level' => 'Daerah',
        'is_active' => true,
    ]);

    $event->referees()->attach($refereeA, ['role' => 'judge']);
    $event->referees()->attach($refereeB, ['role' => 'judge']);

    // Filter by certification "Nasional A"
    $this->actingAs($admin)
        ->get(route('admin.arbitrase.evaluation', [
            'event_id' => $event->id,
            'certification' => 'Nasional A',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('referees', 1)
            ->where('referees.0.name', 'Sensei Bambang')
        );

    // Filter by search query "Joko"
    $this->actingAs($admin)
        ->get(route('admin.arbitrase.evaluation', [
            'event_id' => $event->id,
            'search' => 'Joko',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('referees', 1)
            ->where('referees.0.name', 'Sensei Joko')
        );
});

test('anti-bias evaluation computes statistical metrics and detects regional conflict bias', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Anti-Bias Test',
        'slug' => 'kejuaraan-anti-bias-test',
        'venue' => 'GOR Delta',
        'city' => 'Sidoarjo',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_active' => true,
    ]);

    // Create Contingent from Malang
    $contingentUser = User::factory()->create();
    $contingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $contingentUser->id,
        'name' => 'Kontingen Kota Malang',
        'city' => 'Malang',
        'manager_name' => 'Manajer Malang',
        'phone' => '081234567890',
        'status' => 'verified',
    ]);

    // Category and drawing
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Yudansha',
        'type' => 'embu',
        'gender' => 'mixed',
        'order' => 1,
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => 'pool',
        'participant_count' => 1,
        'contingent_count' => 1,
        'generated_at' => now(),
    ]);

    $athlete1 = Athlete::query()->create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Malang Satu',
        'gender' => 'male',
        'birth_date' => '2000-01-01',
    ]);

    $athlete2 = Athlete::query()->create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Malang Dua',
        'gender' => 'female',
        'birth_date' => '2001-02-02',
    ]);

    $entry = AthleteMatchCategoryEntry::query()->create([
        'event_id' => $event->id,
        'athlete_id' => $athlete1->id,
        'event_match_category_id' => $category->id,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court A',
        'is_active' => true,
    ]);

    $match = TournamentMatch::query()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'tournament_drawing_id' => $drawing->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak 1',
        'match_sequence' => 1,
        'pool' => 'A',
        'status' => 'completed',
        'participant_entry_id' => $entry->id,
    ]);

    // 5 judges: Judge 1 is from Malang (same as contingent), others from Surabaya, Jakarta, etc.
    $judge1 = Referee::query()->create([
        'name' => 'Wasit Malang (Same Origin)',
        'region' => 'Malang',
        'certification_level' => 'Nasional A',
        'is_active' => true,
    ]);
    $judge2 = Referee::query()->create([
        'name' => 'Wasit Surabaya',
        'region' => 'Surabaya',
        'certification_level' => 'Nasional A',
        'is_active' => true,
    ]);
    $judge3 = Referee::query()->create([
        'name' => 'Wasit Jakarta',
        'region' => 'Jakarta',
        'certification_level' => 'Nasional B',
        'is_active' => true,
    ]);
    $judge4 = Referee::query()->create([
        'name' => 'Wasit Bandung',
        'region' => 'Bandung',
        'certification_level' => 'Nasional B',
        'is_active' => true,
    ]);
    $judge5 = Referee::query()->create([
        'name' => 'Wasit Semarang',
        'region' => 'Semarang',
        'certification_level' => 'Daerah',
        'is_active' => true,
    ]);

    $event->referees()->attach([$judge1->id, $judge2->id, $judge3->id, $judge4->id, $judge5->id], ['role' => 'judge']);

    // Judge 1 gives high score 90.0, others give 80.0, 81.0, 80.0, 81.0
    // Peer average is (80+81+80+81)/4 = 80.5
    // Delta for Judge 1 is 90.0 - 80.5 = +9.5 >= 3.0 -> Regional Bias Anomaly!
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'tournament_match_id' => $match->id,
        'referee_id' => $judge1->id,
        'judge_number' => 1,
        'total_score' => 90.0,
        'status' => 'submitted',
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'tournament_match_id' => $match->id,
        'referee_id' => $judge2->id,
        'judge_number' => 2,
        'total_score' => 80.0,
        'status' => 'submitted',
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'tournament_match_id' => $match->id,
        'referee_id' => $judge3->id,
        'judge_number' => 3,
        'total_score' => 81.0,
        'status' => 'submitted',
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'tournament_match_id' => $match->id,
        'referee_id' => $judge4->id,
        'judge_number' => 4,
        'total_score' => 80.0,
        'status' => 'submitted',
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'tournament_match_id' => $match->id,
        'referee_id' => $judge5->id,
        'judge_number' => 5,
        'total_score' => 81.0,
        'status' => 'submitted',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.evaluation', ['event_id' => $event->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Evaluation')
            ->has('referees', 5)
            ->where('referees', function ($refs) use ($judge1) {
                $item = collect($refs)->firstWhere('id', $judge1->id);
                $flagCodes = collect($item['flags'] ?? [])->pluck('code')->all();
                expect($item)->not->toBeNull()
                    ->and($item['same_origin_count'])->toBe(1)
                    ->and($item['regional_delta'])->toBe(9.5)
                    ->and($item['status'])->toBe('flagged')
                    ->and($item['status_label'])->toBe('Anomali Terdeteksi')
                    ->and($flagCodes)->toContain('regional_bias')
                    ->and($item['narrative']['headline'])->not->toBeEmpty()
                    ->and($item['narrative']['regional_bias'])->not->toBeEmpty()
                    ->and($item['narrative']['recommendation'])->not->toBeEmpty();

                return true;
            })
        );
});

test('admin can export arbitration evaluation to excel spreadsheet', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Event Export Evaluasi',
        'slug' => 'event-export-evaluasi',
        'venue' => 'GOR Export',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_active' => true,
    ]);

    $referee = Referee::query()->create([
        'name' => 'Sensei Ekspor',
        'gender' => 'male',
        'region' => 'Surabaya',
        'certification_level' => 'Nasional A',
        'is_active' => true,
    ]);
    $event->referees()->attach($referee, ['role' => 'judge']);

    $response = $this->actingAs($admin)
        ->get(route('admin.arbitrase.evaluation.export', ['event_id' => $event->id]));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('content-disposition'))->toContain('attachment; filename=');
    expect($response->headers->get('content-disposition'))->toContain('.xlsx');
});
