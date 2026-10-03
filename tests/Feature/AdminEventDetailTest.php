<?php

use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\PaymentMethod;
use App\Models\Registration;
use App\Models\Rundown;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can access default event detail page and see active event with tabs data', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda Shorinji Kempo Jawa Timur 2026',
        'slug' => 'kejurda-shorinji-kempo-jatim-2026',
        'edition' => 'Ke-XVIII',
        'venue' => 'GOR Gelora Pancasila',
        'city' => 'Surabaya',
        'province' => 'Jawa Timur',
        'start_date' => '2026-10-24',
        'end_date' => '2026-10-26',
        'fee_per_athlete' => 150000,
        'fee_per_contingent' => 500000,
        'max_match_categories_per_athlete' => 2,
        'status' => 'open_registration',
        'is_active' => true,
    ]);

    // Create an age category, court, and match category
    $ageCat = EventAgeCategory::create([
        'event_id' => $event->id,
        'name' => 'Pemula',
        'min_age' => 7,
        'max_age' => 10,
        'fee' => 400000,
        'description' => 'Kenshi usia dini',
        'order' => 1,
        'is_active' => true,
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'location' => 'Tatami Utama',
        'order' => 1,
        'is_active' => true,
    ]);

    EventMatchCategory::create([
        'event_id' => $event->id,
        'age_category_id' => $ageCat->id,
        'name' => 'Embu Berpasangan Pemula Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 2,
        'order' => 1,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get('/admin/master/event/detail');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Master/Event/Detail')
        ->has('event')
        ->where('event.id', $event->id)
        ->where('event.name', 'Kejurda Shorinji Kempo Jawa Timur 2026')
        ->where('event.max_match_categories_per_athlete', 2)
        ->has('event.updated_at_formatted')
        ->has('ageCategories', 1)
        ->where('ageCategories.0.name', 'Pemula')
        ->where('ageCategories.0.fee', 400000)
        ->has('courts', 1)
        ->where('courts.0.name', 'Court 1')
        ->has('matchCategories', 1)
        ->where('matchCategories.0.name', 'Embu Berpasangan Pemula Putra')
        ->where('matchCategories.0.age_category_name', 'Pemula')
        ->where('matchCategories.0.max_athletes_per_team', 2)
        ->has('counts')
        ->where('counts.age_categories', 1)
        ->where('counts.courts', 1)
        ->where('counts.match_categories', 1)
    );
});

test('admin can access specific event detail page by id', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Piala Walikota Malang 2026',
        'slug' => 'piala-walikota-malang-2026',
        'venue' => 'GOR Ken Arok',
        'city' => 'Malang',
        'start_date' => '2026-11-15',
        'end_date' => '2026-11-17',
        'fee_per_athlete' => 100000,
        'status' => 'draft',
        'is_active' => false,
    ]);

    $response = $this->actingAs($user)->get("/admin/master/event/{$event->id}/detail");

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Master/Event/Detail')
        ->where('event.id', $event->id)
        ->where('event.name', 'Piala Walikota Malang 2026')
    );
});

test('admin can switch an event to free and existing registrations no longer require payment', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Berbayar Menjadi Gratis',
        'slug' => 'event-berbayar-menjadi-gratis',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_paid' => true,
        'fee_per_athlete' => 100000,
        'fee_per_contingent' => 200000,
    ]);
    $paymentMethod = PaymentMethod::create([
        'name' => 'Transfer Panitia',
        'code' => 'transfer-panitia-free-test',
        'type' => 'bank_transfer',
        'is_active' => true,
    ]);
    $event->paymentMethods()->attach($paymentMethod);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Dojo Gratis',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Gratis',
        'phone' => '081234567890',
    ]);
    $registration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-FREE-001',
        'total_amount' => 200000,
        'final_amount' => 200123,
        'verification_code' => 123,
        'payment_status' => 'submitted',
        'payment_amount' => 200123,
    ]);

    $this->actingAs($user)->put("/admin/master/event/{$event->id}/fees", [
        'is_paid' => false,
        'fee_per_athlete' => 100000,
        'fee_per_contingent' => 200000,
        'payment_method_ids' => [$paymentMethod->id],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($event->fresh()->is_paid)->toBeFalse();
    expect((float) $event->fresh()->fee_per_athlete)->toBe(0.0);
    expect($event->fresh()->paymentMethods)->toHaveCount(0);
    expect((float) $registration->fresh()->final_amount)->toBe(0.0);
    expect($registration->fresh()->verification_code)->toBeNull();
    expect($registration->fresh()->payment_status->value)->toBe('verified');
});

test('admin can create, update, and delete age categories with custom pricing', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda Shorinji Kempo 2026',
        'slug' => 'kejurda-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    // 1. Create Age Category
    $createResponse = $this->actingAs($user)->post("/admin/master/event/{$event->id}/age-category", [
        'name' => 'Remaja A',
        'min_age' => 11,
        'max_age' => 13,
        'fee' => 500000,
        'description' => 'Pra-remaja kelahiran 2013-2015',
        'order' => 1,
        'is_active' => true,
    ]);

    $createResponse->assertRedirect();
    $this->assertDatabaseHas('event_age_categories', [
        'event_id' => $event->id,
        'name' => 'Remaja A',
        'fee' => 500000,
        'min_age' => 11,
        'max_age' => 13,
    ]);

    $ageCat = EventAgeCategory::where('event_id', $event->id)->first();

    // 2. Update Age Category
    $updateResponse = $this->actingAs($user)->put("/admin/master/event/{$event->id}/age-category/{$ageCat->id}", [
        'name' => 'Remaja A (Khusus)',
        'min_age' => 11,
        'max_age' => 14,
        'fee' => 550000,
        'description' => 'Updated description',
        'order' => 2,
        'is_active' => true,
    ]);

    $updateResponse->assertRedirect();
    $this->assertDatabaseHas('event_age_categories', [
        'id' => $ageCat->id,
        'name' => 'Remaja A (Khusus)',
        'fee' => 550000,
        'max_age' => 14,
    ]);

    // 3. Delete Age Category
    $deleteResponse = $this->actingAs($user)->delete("/admin/master/event/{$event->id}/age-category/{$ageCat->id}");
    $deleteResponse->assertRedirect();
    $this->assertSoftDeleted('event_age_categories', ['id' => $ageCat->id]);
});

test('admin can create, update, and delete courts', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda 2026',
        'slug' => 'kejurda-2026-court-test',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    // Create Court
    $this->actingAs($user)->post("/admin/master/event/{$event->id}/court", [
        'name' => 'Court 2',
        'location' => 'Tatami Sayap Barat',
        'description' => 'Penyisihan Embu',
        'order' => 2,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('event_courts', [
        'event_id' => $event->id,
        'name' => 'Court 2',
    ]);

    $court = EventCourt::where('event_id', $event->id)->first();

    // Update Court
    $this->actingAs($user)->put("/admin/master/event/{$event->id}/court/{$court->id}", [
        'name' => 'Court 2 (Tatami B)',
        'location' => 'Sayap Barat Diperluas',
        'order' => 3,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('event_courts', [
        'id' => $court->id,
        'name' => 'Court 2 (Tatami B)',
    ]);

    // Delete Court
    $this->actingAs($user)->delete("/admin/master/event/{$event->id}/court/{$court->id}")
        ->assertRedirect();

    $this->assertSoftDeleted('event_courts', ['id' => $court->id]);
});

test('admin can create, update, and delete match categories with age relation and gender/type', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda 2026',
        'slug' => 'kejurda-2026-match-test',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $ageCat = EventAgeCategory::create([
        'event_id' => $event->id,
        'name' => 'Remaja A',
        'fee' => 500000,
    ]);

    // Create Match Category
    $this->actingAs($user)->post("/admin/master/event/{$event->id}/match-category", [
        'name' => 'Randori Putra Remaja A -50kg',
        'age_category_id' => $ageCat->id,
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 32,
        'max_athletes_per_team' => 4,
        'min_weight' => 45.0,
        'max_weight' => 50.0,
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('event_match_categories', [
        'event_id' => $event->id,
        'name' => 'Randori Putra Remaja A -50kg',
        'age_category_id' => $ageCat->id,
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 32,
        'max_athletes_per_team' => 4,
    ]);

    $matchCat = EventMatchCategory::where('event_id', $event->id)->first();

    // Update Match Category
    $this->actingAs($user)->put("/admin/master/event/{$event->id}/match-category/{$matchCat->id}", [
        'name' => 'Randori Putra Remaja A -55kg',
        'age_category_id' => $ageCat->id,
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 32,
        'max_athletes_per_team' => 2,
        'min_weight' => 50.0,
        'max_weight' => 55.0,
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('event_match_categories', [
        'id' => $matchCat->id,
        'name' => 'Randori Putra Remaja A -55kg',
        'max_weight' => 55.0,
        'max_athletes_per_team' => 2,
    ]);

    // Delete Match Category
    $this->actingAs($user)->delete("/admin/master/event/{$event->id}/match-category/{$matchCat->id}")
        ->assertRedirect();

    $this->assertSoftDeleted('event_match_categories', ['id' => $matchCat->id]);
});

test('admin can create, update, and delete rundowns', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda 2026',
        'slug' => 'kejurda-2026-rundown-test',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    // Create Rundown
    $this->actingAs($user)->post("/admin/master/event/{$event->id}/rundown", [
        'date' => '2026-10-01',
        'time' => '09:00',
        'name' => 'Upacara Pembukaan',
        'type' => 'Upacara / Pembukaan',
        'description' => 'Dihadiri seluruh kontingen',
        'order' => 1,
    ])->assertRedirect();

    $this->assertDatabaseHas('rundowns', [
        'event_id' => $event->id,
        'name' => 'Upacara Pembukaan',
    ]);

    $rundown = Rundown::where('event_id', $event->id)->first();

    // Update Rundown
    $this->actingAs($user)->put("/admin/master/event/{$event->id}/rundown/{$rundown->id}", [
        'date' => '2026-10-01',
        'time' => '10:00',
        'name' => 'Upacara Pembukaan & Parade Kontingen',
        'type' => 'Upacara / Pembukaan',
        'description' => 'Parade akbar',
        'order' => 1,
    ])->assertRedirect();

    $this->assertDatabaseHas('rundowns', [
        'id' => $rundown->id,
        'name' => 'Upacara Pembukaan & Parade Kontingen',
    ]);

    // Delete Rundown
    $this->actingAs($user)->delete("/admin/master/event/{$event->id}/rundown/{$rundown->id}")
        ->assertRedirect();

    $this->assertSoftDeleted('rundowns', ['id' => $rundown->id]);
});

test('admin can update general info, dates, and fees of event', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda Lama',
        'slug' => 'kejurda-lama',
        'venue' => 'GOR Lama',
        'city' => 'Sidoarjo',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'fee_per_athlete' => 100000,
        'fee_per_contingent' => 200000,
        'status' => 'draft',
        'is_active' => false,
    ]);

    // 1. Update General
    $this->actingAs($user)->put("/admin/master/event/{$event->id}/general", [
        'name' => 'Kejurda Baru 2026',
        'edition' => 'Edisi 18',
        'venue' => 'GOR Kertajaya Baru',
        'city' => 'Surabaya',
        'status' => 'open_registration',
        'max_match_categories_per_athlete' => 4,
        'allow_cross_age_group_embu' => false,
        'is_active' => true,
    ])->assertRedirect();

    $event->refresh();
    expect($event->name)->toBe('Kejurda Baru 2026');
    expect($event->city)->toBe('Surabaya');
    expect($event->is_active)->toBeTrue();
    expect($event->max_match_categories_per_athlete)->toBe(4);
    expect($event->allow_cross_age_group_embu)->toBeFalse();

    $this->actingAs($user)->put("/admin/master/event/{$event->id}/general", [
        'name' => $event->name,
        'slug' => 'kejurda-baru-2026',
        'tenant_subdomain' => 'kejurda-baru-2026',
        'venue' => $event->venue,
        'city' => $event->city,
        'status' => 'draft',
        'max_match_categories_per_athlete' => 3,
        'allow_cross_age_group_embu' => true,
        'is_active' => true,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($event->refresh()->max_match_categories_per_athlete)->toBe(3);
    expect($event->allow_cross_age_group_embu)->toBeTrue();

    // 2. Update Dates
    $this->actingAs($user)->put("/admin/master/event/{$event->id}/dates", [
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-05',
        'registration_start' => '2026-09-01',
        'registration_end' => '2026-10-25',
    ])->assertRedirect();

    $event->refresh();
    expect($event->start_date->format('Y-m-d'))->toBe('2026-11-01');

    // 3. Update Fees
    $this->actingAs($user)->put("/admin/master/event/{$event->id}/fees", [
        'fee_per_contingent' => 750000,
        'fee_per_athlete' => 250000,
    ])->assertRedirect();

    $event->refresh();
    expect((float) $event->fee_per_contingent)->toBe(750000.0);
    expect((float) $event->fee_per_athlete)->toBe(250000.0);
});
