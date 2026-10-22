<?php

use App\Enums\RefereeCourtRole;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAttendance;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

test('admin can export contingent registrations to excel', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Role::findOrCreate('Admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_paid' => true,
    ]);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $admin->id,
        'name' => 'Dojo Garuda',
        'city' => 'Jakarta',
        'manager_name' => 'Sensei Budi',
        'phone' => '08123456789',
    ]);

    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-GARUDA-01',
        'status' => 'verified',
        'payment_status' => 'verified',
        'payment_amount' => 500000,
    ]);

    $response = $this->actingAs($admin)
        ->get("/admin/pendaftaran/registrasi/export?event_id={$event->id}");

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('Content-Disposition'))->toContain('.xlsx');
});

test('admin can export match groups to excel', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Role::findOrCreate('Admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $admin->id,
        'name' => 'Dojo Garuda',
        'city' => 'Jakarta',
        'manager_name' => 'Sensei Budi',
        'phone' => '08123456789',
    ]);

    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Ahmad Kenshi',
        'gender' => 'L',
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 16,
        'is_active' => true,
    ]);

    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $athlete->id,
        'event_match_category_id' => $category->id,
        'team_number' => 1,
    ]);

    $response = $this->actingAs($admin)
        ->get("/admin/pendaftaran/nomor-pertandingan/export?event_id={$event->id}");

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('Content-Disposition'))->toContain('.xlsx');
});

test('admin can export athlete verifications to excel', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Role::findOrCreate('Admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $admin->id,
        'name' => 'Dojo Garuda',
        'city' => 'Jakarta',
        'manager_name' => 'Sensei Budi',
        'phone' => '08123456789',
    ]);

    Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Ahmad Kenshi',
        'gender' => 'L',
        'weight' => 60,
        'height' => 170,
        'kyu_dan' => 'Kyu 1',
    ]);

    $response = $this->actingAs($admin)
        ->get("/admin/pendaftaran/verifikasi/export?event_id={$event->id}");

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('Content-Disposition'))->toContain('.xlsx');
});

test('referee can check in with role-specific court qr and is rejected if scanning wrong role', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Role::findOrCreate('Wasit', 'web');

    $event = Event::create([
        'name' => 'Kejurda Kempo 2026',
        'slug' => 'kejurda-kempo-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'is_active' => true,
    ]);

    $chiefUser = User::factory()->create();
    $chiefUser->assignRole('Wasit');

    $chiefReferee = Referee::create([
        'user_id' => $chiefUser->id,
        'name' => 'Wasit Utama Sensei',
        'email' => $chiefUser->email,
        'is_active' => true,
    ]);
    $event->referees()->attach($chiefReferee->id);

    // Assign chiefReferee as Chief
    EventCourtAssignment::create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $chiefReferee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);

    // Check in event first
    RefereeAttendance::create([
        'event_id' => $event->id,
        'referee_id' => $chiefReferee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'method' => 'qr',
    ]);

    // 1. Scan wrong role QR (e.g. RegionalOne)
    $wrongRoleUrl = URL::temporarySignedRoute('wasit.check-in.court', now()->addHour(), [
        'event' => $event,
        'eventCourt' => $court,
        'role' => RefereeCourtRole::RegionalOne->value,
    ]);

    $this->actingAs($chiefUser)
        ->get($wrongRoleUrl)
        ->assertForbidden();

    // 2. Scan correct role QR (Chief)
    $correctRoleUrl = URL::temporarySignedRoute('wasit.check-in.court', now()->addHour(), [
        'event' => $event,
        'eventCourt' => $court,
        'role' => RefereeCourtRole::Chief->value,
    ]);

    $this->actingAs($chiefUser)
        ->get($correctRoleUrl)
        ->assertOk();

    $this->actingAs($chiefUser)
        ->post($correctRoleUrl)
        ->assertRedirect(route('wasit.portal', ['event_id' => $event->id]));

    expect(RefereeCourtAttendance::query()
        ->whereBelongsTo($event)
        ->whereBelongsTo($court, 'court')
        ->whereBelongsTo($chiefReferee)
        ->whereDate('attendance_date', now()->toDateString())
        ->exists())->toBeTrue();
});
