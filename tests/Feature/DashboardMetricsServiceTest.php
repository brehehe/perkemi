<?php

use App\Enums\EventStatus;
use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Enums\TournamentRank;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\TournamentResult;
use App\Models\User;
use App\Services\Admin\DashboardMetricsService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('dashboard metrics service calculates core stats accurately', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejuaraan Test',
        'slug' => 'kejuaraan-test',
        'venue' => 'GOR Test',
        'city' => 'Surabaya',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(2)->toDateString(),
        'fee_per_athlete' => 100000,
        'status' => EventStatus::OpenRegistration,
        'is_active' => true,
    ]);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen A',
        'city' => 'Surabaya',
        'manager_name' => 'Manager A',
        'phone' => '08123456789',
        'status' => 'verified',
    ]);

    Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Atlet A',
        'gender' => 'L',
    ]);

    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-001',
        'status' => RegistrationStatus::Verified,
        'total_amount' => 500000,
        'final_amount' => 500000,
        'payment_status' => PaymentStatus::Verified,
        'payment_amount' => 500000,
    ]);

    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-002',
        'status' => RegistrationStatus::Pending,
        'total_amount' => 300000,
        'final_amount' => 300000,
    ]);

    TournamentResult::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'contingent_name' => $contingent->name,
        'rank' => TournamentRank::Gold,
        'match_category' => 'Embu',
    ]);

    Rundown::create([
        'event_id' => $event->id,
        'date' => now(),
        'name' => 'Babak Final',
        'type' => 'Embu',
        'order' => 1,
    ]);

    $service = app(DashboardMetricsService::class);

    $stats = $service->getStats();
    expect($stats['total_athletes'])->toBe(1);
    expect($stats['total_contingents'])->toBe(1);
    expect($stats['total_registrations'])->toBe(2);
    expect($stats['verified_count'])->toBe(1);
    expect($stats['pending_count'])->toBe(1);
    expect($stats['total_amount'])->toBe(500000.0);
    expect($stats['verification_rate'])->toBe(50.0);

    $breakdown = $service->getRegistrationStatusBreakdown();
    expect($breakdown['verified'])->toBe(1);
    expect($breakdown['pending'])->toBe(1);
    expect($breakdown['rejected'])->toBe(0);

    $medalStats = $service->getMedalStats();
    expect($medalStats['gold'])->toBe(1);
    expect($medalStats['silver'])->toBe(0);
    expect($medalStats['bronze'])->toBe(0);

    $latestContingents = $service->getLatestContingents();
    expect($latestContingents)->toHaveCount(1);
    expect($latestContingents[0]['athletes_count'])->toBe(1);

    $schedules = $service->getTodaySchedules();
    expect($schedules)->toHaveCount(1);

    $activities = $service->getLatestActivities();
    expect(count($activities))->toBeGreaterThanOrEqual(1);
});

test('medal distribution respects event champion ranking system between medals and weighted points', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejuaraan Ranking Test',
        'slug' => 'kejuaraan-ranking-test',
        'venue' => 'GOR Ranking',
        'city' => 'Jakarta',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(2)->toDateString(),
        'champion_ranking_system' => 'medals',
        'champion_gold_points' => 5,
        'champion_silver_points' => 3,
        'champion_bronze_points' => 1,
        'is_active' => true,
    ]);

    // Contingent 1: 1 Gold, 0 Silver, 0 Bronze (Total Medals = 1, Pts = 5)
    $con1 = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Emas Sedikit',
        'city' => 'Jakarta',
        'manager_name' => 'Manager 1',
        'phone' => '08123456781',
        'status' => 'verified',
    ]);
    TournamentResult::create([
        'event_id' => $event->id,
        'contingent_id' => $con1->id,
        'contingent_name' => $con1->name,
        'rank' => TournamentRank::Gold,
        'match_category' => 'Randori',
    ]);

    // Contingent 2: 0 Gold, 3 Silver, 2 Bronze (Total Medals = 5, Pts = 3*3 + 2*1 = 11)
    $con2 = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Perak Banyak',
        'city' => 'Bandung',
        'manager_name' => 'Manager 2',
        'phone' => '08123456782',
        'status' => 'verified',
    ]);
    for ($i = 0; $i < 3; $i++) {
        TournamentResult::create([
            'event_id' => $event->id,
            'contingent_id' => $con2->id,
            'contingent_name' => $con2->name,
            'rank' => TournamentRank::Silver,
            'match_category' => 'Randori',
        ]);
    }
    for ($i = 0; $i < 2; $i++) {
        TournamentResult::create([
            'event_id' => $event->id,
            'contingent_id' => $con2->id,
            'contingent_name' => $con2->name,
            'rank' => TournamentRank::Bronze,
            'match_category' => 'Randori',
        ]);
    }

    $service = app(DashboardMetricsService::class);

    // 1. Under 'medals' standard, Kontingen 1 is rank 1 because 1 Gold > 0 Gold
    $distMedals = $service->getMedalDistribution($event);
    expect($distMedals['ranking_system'])->toBe('medals');
    expect($distMedals['contingents'][0]['id'])->toBe($con1->id);
    expect($distMedals['contingents'][1]['id'])->toBe($con2->id);

    // 2. Switch to 'points' weighted system at any time
    $event->update([
        'champion_ranking_system' => 'points',
        'champion_gold_points' => 5,
        'champion_silver_points' => 3,
        'champion_bronze_points' => 1,
    ]);

    // Immediately adjusts: Kontingen 2 has 11 pts vs Kontingen 1 with 5 pts!
    $distPoints = $service->getMedalDistribution($event);
    expect($distPoints['ranking_system'])->toBe('points');
    expect($distPoints['contingents'][0]['id'])->toBe($con2->id);
    expect($distPoints['contingents'][0]['total_points'])->toBe(11);
    expect($distPoints['contingents'][1]['id'])->toBe($con1->id);
    expect($distPoints['contingents'][1]['total_points'])->toBe(5);
});
