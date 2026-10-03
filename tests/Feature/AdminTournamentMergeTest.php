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

test('renders active tenant event categories and their compatible merge targets', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Merge 2026',
        'slug' => 'kejurda-merge-2026',
        'tenant_subdomain' => 'kejurda-merge-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Merge Lain 2026',
        'slug' => 'kejurda-merge-lain-2026',
        'tenant_subdomain' => 'kejurda-merge-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'admin']);

    $sourceCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 50 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $targetCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 2,
        'is_active' => true,
    ]);
    EventMatchCategory::create([
        'event_id' => $otherEvent->id,
        'name' => 'Nomor Event Lain',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($eventUser)
        ->get('http://kejurda-merge-2026.localhost/admin/pertandingan/merge')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/Merge')
            ->has('categories', 2)
            ->where('categories.0.id', $sourceCategory->id)
            ->where('categories.0.status', 'under_quota')
            ->where('categories.0.merge_targets.0.id', $targetCategory->id)
            ->where('canManageMerge', true)
        );
});

test('event admin can persist a merge into a compatible category', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Simpan Merge 2026',
        'slug' => 'kejurda-simpan-merge-2026',
        'tenant_subdomain' => 'kejurda-simpan-merge-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'admin']);

    $sourceCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 50 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $targetCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 2,
        'is_active' => true,
    ]);

    $this->actingAs($eventUser)
        ->post("http://kejurda-simpan-merge-2026.localhost/admin/pertandingan/merge/{$sourceCategory->id}", [
            'target_category_id' => $targetCategory->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('event_match_categories', [
        'id' => $sourceCategory->id,
        'merged_into_id' => $targetCategory->id,
        'is_active' => false,
    ]);
});

test('event admin can combine three under quota embu categories into six teams', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Gabungan Embu 2026',
        'slug' => 'kejurda-gabungan-embu-2026',
        'tenant_subdomain' => 'kejurda-gabungan-embu-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'admin']);

    $categories = collect([
        ['name' => 'Embu Berpasangan Pemula Putra Kyu 7-5', 'gender' => 'male'],
        ['name' => 'Embu Perorangan Pemula Putra Kyu 7-5', 'gender' => 'male'],
        ['name' => 'Embu Perorangan Pemula Putri Kyu 7-5', 'gender' => 'female'],
    ])->map(fn (array $attributes, int $index) => EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => $attributes['name'],
        'type' => 'embu',
        'gender' => $attributes['gender'],
        'capacity' => 8,
        'max_athletes_per_team' => 2,
        'order' => $index + 1,
        'is_active' => true,
    ]));

    foreach ($categories as $categoryIndex => $category) {
        $contingent = Contingent::create([
            'event_id' => $event->id,
            'user_id' => $eventUser->id,
            'name' => 'Kontingen Embu '.($categoryIndex + 1),
            'city' => 'Surabaya',
            'manager_name' => 'Manajer Embu',
            'phone' => '08123456789'.$categoryIndex,
            'address' => 'Surabaya',
            'status' => 'verified',
        ]);
        Registration::create([
            'event_id' => $event->id,
            'contingent_id' => $contingent->id,
            'registration_number' => 'REG-EMBU-'.($categoryIndex + 1),
            'status' => 'verified',
            'payment_status' => 'verified',
        ]);

        foreach ([1, 2] as $teamNumber) {
            foreach ([1, 2] as $memberNumber) {
                $athlete = Athlete::create([
                    'contingent_id' => $contingent->id,
                    'name' => "Atlet {$categoryIndex}-{$teamNumber}-{$memberNumber}",
                    'gender' => $category->gender === 'female' ? 'P' : 'L',
                    'kyu_dan' => 'Kyu 6',
                ]);

                AthleteMatchCategoryEntry::create([
                    'event_id' => $event->id,
                    'athlete_id' => $athlete->id,
                    'event_match_category_id' => $category->id,
                    'team_number' => $teamNumber,
                ]);
            }
        }
    }

    $combinedName = 'Embu Pasangan / Putra / Putri Kyu 7-2';

    $this->actingAs($eventUser)
        ->post('http://kejurda-gabungan-embu-2026.localhost/admin/pertandingan/merge/combine', [
            'combined_name' => $combinedName,
            'source_category_ids' => $categories->pluck('id')->all(),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $combined = EventMatchCategory::query()->where('name', $combinedName)->firstOrFail();

    expect($combined->type)->toBe('embu')
        ->and($combined->gender)->toBe('mixed')
        ->and($combined->is_active)->toBeTrue();

    foreach ($categories as $category) {
        $this->assertDatabaseHas('event_match_categories', [
            'id' => $category->id,
            'merged_into_id' => $combined->id,
            'is_active' => false,
        ]);
    }

    $this->actingAs($eventUser)
        ->get('http://kejurda-gabungan-embu-2026.localhost/admin/pertandingan/merge')
        ->assertInertia(fn (Assert $page) => $page
            ->where('categories.3.id', $combined->id)
            ->where('categories.3.participants_count', 6)
            ->where('categories.3.participant_label', 'Tim')
            ->has('categories.3.merged_sources', 3)
        );

    $this->actingAs($eventUser)
        ->get("http://kejurda-gabungan-embu-2026.localhost/admin/pertandingan/drawing?category={$combined->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedCategory', $combined->id)
            ->has('contestants', 6)
        );

    $this->actingAs($eventUser)
        ->delete("http://kejurda-gabungan-embu-2026.localhost/admin/pertandingan/merge/combine/{$combined->id}")
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertSoftDeleted('event_match_categories', ['id' => $combined->id]);
    foreach ($categories as $category) {
        $this->assertDatabaseHas('event_match_categories', [
            'id' => $category->id,
            'merged_into_id' => null,
            'is_active' => true,
        ]);
    }
});

test('event admin cannot merge a category into a target from another tenant', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Aman Merge 2026',
        'slug' => 'kejurda-aman-merge-2026',
        'tenant_subdomain' => 'kejurda-aman-merge-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Aman Merge Lain 2026',
        'slug' => 'kejurda-aman-merge-lain-2026',
        'tenant_subdomain' => 'kejurda-aman-merge-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'admin']);

    $sourceCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 50 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $otherTargetCategory = EventMatchCategory::create([
        'event_id' => $otherEvent->id,
        'name' => 'Randori Putra Kelas 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($eventUser)
        ->from('http://kejurda-aman-merge-2026.localhost/admin/pertandingan/merge')
        ->post("http://kejurda-aman-merge-2026.localhost/admin/pertandingan/merge/{$sourceCategory->id}", [
            'target_category_id' => $otherTargetCategory->id,
        ])
        ->assertRedirect('http://kejurda-aman-merge-2026.localhost/admin/pertandingan/merge')
        ->assertSessionHasErrors('target_category_id');

    $this->assertDatabaseHas('event_match_categories', [
        'id' => $sourceCategory->id,
        'merged_into_id' => null,
        'is_active' => true,
    ]);
});
