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
