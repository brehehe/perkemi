<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Kyu;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('event staff can enroll an eligible athlete in a match category', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Entri 2026',
        'slug' => 'kejurda-entri-2026',
        'tenant_subdomain' => 'kejurda-entri-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'max_match_categories_per_athlete' => 2,
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Entri',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Entri',
        'phone' => '081234567890',
    ]);
    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Entri',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);
    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 55–65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 2,
        'min_weight' => 55,
        'max_weight' => 65,
        'order' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($eventUser)
        ->post("http://kejurda-entri-2026.localhost/admin/pendaftaran/verifikasi/{$athlete->id}/match-category", [
            'event_match_category_id' => $category->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('athlete_match_category_entries', [
        'event_id' => $event->id,
        'athlete_id' => $athlete->id,
        'event_match_category_id' => $category->id,
    ]);
});

test('enrollment enforces the maximum categories per athlete and per contingent', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Batas 2026',
        'slug' => 'kejurda-batas-2026',
        'tenant_subdomain' => 'kejurda-batas-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'max_match_categories_per_athlete' => 1,
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Batas',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Batas',
        'phone' => '081234567890',
    ]);
    $firstAthlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Pertama',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);
    $secondAthlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Kedua',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);
    $firstCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 60 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 1,
        'order' => 1,
        'is_active' => true,
    ]);
    $secondCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 65 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 2,
        'order' => 2,
        'is_active' => true,
    ]);
    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $firstAthlete->id,
        'event_match_category_id' => $firstCategory->id,
    ]);

    $this->actingAs($eventUser)
        ->from('http://kejurda-batas-2026.localhost/admin/pendaftaran/verifikasi')
        ->post("http://kejurda-batas-2026.localhost/admin/pendaftaran/verifikasi/{$firstAthlete->id}/match-category", [
            'event_match_category_id' => $secondCategory->id,
        ])
        ->assertRedirect('http://kejurda-batas-2026.localhost/admin/pendaftaran/verifikasi')
        ->assertSessionHasErrors('event_match_category_id');

    $this->actingAs($eventUser)
        ->from('http://kejurda-batas-2026.localhost/admin/pendaftaran/verifikasi')
        ->post("http://kejurda-batas-2026.localhost/admin/pendaftaran/verifikasi/{$secondAthlete->id}/match-category", [
            'event_match_category_id' => $firstCategory->id,
        ])
        ->assertRedirect('http://kejurda-batas-2026.localhost/admin/pendaftaran/verifikasi')
        ->assertSessionHasErrors('event_match_category_id');

    $this->assertDatabaseCount('athlete_match_category_entries', 1);
});

test('enrollment rejects a match category from another tenant', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Aman Entri 2026',
        'slug' => 'kejurda-aman-entri-2026',
        'tenant_subdomain' => 'kejurda-aman-entri-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'max_match_categories_per_athlete' => 2,
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Aman Entri Lain 2026',
        'slug' => 'kejurda-aman-entri-lain-2026',
        'tenant_subdomain' => 'kejurda-aman-entri-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Aman Entri',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Aman',
        'phone' => '081234567890',
    ]);
    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Aman',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);
    $otherCategory = EventMatchCategory::create([
        'event_id' => $otherEvent->id,
        'name' => 'Randori Event Lain',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 2,
        'order' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($eventUser)
        ->from('http://kejurda-aman-entri-2026.localhost/admin/pendaftaran/verifikasi')
        ->post("http://kejurda-aman-entri-2026.localhost/admin/pendaftaran/verifikasi/{$athlete->id}/match-category", [
            'event_match_category_id' => $otherCategory->id,
        ])
        ->assertRedirect('http://kejurda-aman-entri-2026.localhost/admin/pendaftaran/verifikasi')
        ->assertSessionHasErrors('event_match_category_id');

    $this->assertDatabaseCount('athlete_match_category_entries', 0);
});

test('enrollment allows a different Kyu from the match number label', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Kyu 2026',
        'slug' => 'kejurda-kyu-2026',
        'tenant_subdomain' => 'kejurda-kyu-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'max_match_categories_per_athlete' => 2,
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);
    Kyu::create(['name' => 'Kyu 7', 'order' => 1, 'is_active' => true]);
    Kyu::create(['name' => 'Kyu 5', 'order' => 3, 'is_active' => true]);
    Kyu::create(['name' => 'Kyu 1', 'order' => 5, 'is_active' => true]);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Kyu',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Kyu',
        'phone' => '081234567890',
    ]);
    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Kyu Satu',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 60,
    ]);
    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Kyu 7 sampai Kyu 5',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 2,
        'min_kyu' => 'Kyu 7',
        'max_kyu' => 'Kyu 5',
        'order' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($eventUser)
        ->from('http://kejurda-kyu-2026.localhost/admin/pendaftaran/verifikasi')
        ->post("http://kejurda-kyu-2026.localhost/admin/pendaftaran/verifikasi/{$athlete->id}/match-category", [
            'event_match_category_id' => $category->id,
        ])
        ->assertRedirect('http://kejurda-kyu-2026.localhost/admin/pendaftaran/verifikasi')
        ->assertSessionHasNoErrors();

    $this->assertDatabaseCount('athlete_match_category_entries', 1);
});
