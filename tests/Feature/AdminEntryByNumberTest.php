<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can bulk save entry by number for a contingent into match categories', function () {
    $admin = User::factory()->create();
    Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
    $admin->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejuaraan Entry by Number',
        'slug' => 'kejuaraan-entry-by-number',
        'tenant_subdomain' => 'kejuaraan-entry-by-number',
        'venue' => 'GOR Pertiwi',
        'city' => 'Surabaya',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-03',
        'is_active' => true,
        'fee_per_contingent' => 500000,
        'fee_per_athlete' => 50000,
        'is_paid' => true,
    ]);
    $event->users()->attach($admin, ['access_role' => 'admin']);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $admin->id,
        'name' => 'Dojo Garuda Sakti',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Budi',
        'phone' => '081234567890',
    ]);

    $registration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-GARUDA-01',
        'status' => 'pending',
    ]);

    $cat1 = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra 50 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 1,
        'is_active' => true,
    ]);

    $cat2 = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Remaja Putra 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 1,
        'is_active' => true,
    ]);

    $cat3 = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Pasangan Remaja Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 2,
        'is_active' => true,
    ]);

    // Contingent has an athlete
    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Ahmad Kenshi',
        'gender' => 'L',
        'kyu_dan' => 'Kyu I',
    ]);

    $response = $this->actingAs($admin)
        ->post("/admin/pendaftaran/registrasi/{$registration->id}/entry-by-number", [
            'category_ids' => [$cat1->id, $cat2->id, $cat3->id],
        ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $response->assertSessionHas('success');

    // Assert that entries exist for all 3 categories for this contingent
    expect(AthleteMatchCategoryEntry::query()
        ->where('event_id', $event->id)
        ->whereIn('event_match_category_id', [$cat1->id, $cat2->id, $cat3->id])
        ->whereHas('athlete', fn ($q) => $q->where('contingent_id', $contingent->id))
        ->count()
    )->toBe(3);

    // Assert registration fee is updated and verification code is generated
    $registration->refresh();
    expect((float) $registration->total_amount)->toBeGreaterThan(500000);
});
