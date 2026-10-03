<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('renders only the active tenant event match categories and eligible drawing contestants', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Drawing 2026',
        'slug' => 'kejurda-drawing-2026',
        'tenant_subdomain' => 'kejurda-drawing-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Drawing Lain 2026',
        'slug' => 'kejurda-drawing-lain-2026',
        'tenant_subdomain' => 'kejurda-drawing-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);

    $matchCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 55–65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'min_weight' => 55,
        'max_weight' => 65,
        'order' => 1,
        'is_active' => true,
    ]);
    EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Nomor Tidak Aktif',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 2,
        'is_active' => false,
    ]);
    EventMatchCategory::create([
        'event_id' => $otherEvent->id,
        'name' => 'Nomor Event Lain',
        'type' => 'embu',
        'gender' => 'mixed',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);

    $tenantContingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Drawing Tenant',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Tenant',
        'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $otherEvent->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Drawing Lain',
        'city' => 'Malang',
        'manager_name' => 'Sensei Lain',
        'phone' => '081234567891',
    ]);
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $tenantContingent->id,
        'registration_number' => 'REG-DRAWING-001',
        'status' => 'verified',
        'payment_status' => 'verified',
    ]);
    $eligibleAthlete = Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Layak Drawing',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);
    Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Putri',
        'gender' => 'female',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);

    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $eligibleAthlete->id,
        'event_match_category_id' => $matchCategory->id,
    ]);
    Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Terlalu Berat',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 70,
    ]);
    Athlete::create([
        'contingent_id' => $otherContingent->id,
        'name' => 'Kenshi Event Lain',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);

    $this->actingAs($eventUser)
        ->get("http://kejurda-drawing-2026.localhost/admin/pertandingan/drawing?category={$matchCategory->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Drawing')
            ->has('categories', 1)
            ->where('categories.0.id', $matchCategory->id)
            ->where('categories.0.name', 'Randori Putra Kelas 55–65 kg')
            ->where('selectedCategory', $matchCategory->id)
            ->has('contestants', 1)
            ->where('contestants.0.id', $eligibleAthlete->id)
            ->where('contestants.0.name', 'Kenshi Layak Drawing')
        );
});
