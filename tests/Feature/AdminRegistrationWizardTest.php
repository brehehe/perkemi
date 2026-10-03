<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventMatchCategory;
use App\Models\Kyu;
use App\Models\Official;
use App\Models\PaymentMethod;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('wizard saves a new contingent, officials, athletes, teams, and payment review data', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = Event::create([
        'name' => 'Wizard Cup', 'slug' => 'wizard-cup', 'venue' => 'GOR A', 'city' => 'Surabaya',
        'start_date' => '2026-12-01', 'end_date' => '2026-12-03',
        'fee_per_contingent' => 250000, 'fee_per_athlete' => 100000,
        'max_match_categories_per_athlete' => 3,
    ]);
    Kyu::create(['name' => 'Kyu 2', 'order' => 2, 'is_active' => true]);
    $age = EventAgeCategory::create(['event_id' => $event->id, 'name' => 'Remaja', 'min_age' => 14, 'max_age' => 18, 'is_active' => true]);
    $embu = EventMatchCategory::create([
        'event_id' => $event->id, 'age_category_id' => $age->id, 'name' => 'Embu Beregu', 'type' => 'embu',
        'gender' => 'mixed', 'capacity' => 32, 'max_athletes_per_team' => 2, 'min_kyu' => 'Kyu 7', 'max_kyu' => 'Kyu 5', 'is_active' => true,
    ]);
    $randori = EventMatchCategory::create([
        'event_id' => $event->id, 'age_category_id' => $age->id, 'name' => 'Randori Putra', 'type' => 'randori',
        'gender' => 'male', 'capacity' => 32, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);
    $embuSecond = EventMatchCategory::create([
        'event_id' => $event->id, 'age_category_id' => $age->id, 'name' => 'Embu Beregu Kedua', 'type' => 'embu',
        'gender' => 'mixed', 'capacity' => 32, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);
    $method = PaymentMethod::create(['name' => 'Transfer BCA', 'code' => 'bca-wizard', 'type' => 'bank_transfer', 'is_active' => true]);
    $event->paymentMethods()->attach($method);

    $this->actingAs($admin)->post('/admin/pendaftaran/registrasi', [
        'event_id' => $event->id, 'city' => 'Surabaya', 'name' => 'Dojo Wizard',
        'manager_name' => 'Sensei Wizard', 'phone' => '081234567890',
        'email' => 'wizard@example.com', 'address' => 'Jalan Kempo 1',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $registration = Registration::query()->sole();
    $base = "/admin/pendaftaran/registrasi/{$registration->id}";
    expect($registration->contingent->email)->toBe('wizard@example.com');
    $this->actingAs($admin)->get("{$base}/detail?step=2")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/WizardDetail')
            ->where('registration.contingent.name', 'Dojo Wizard')->has('paymentMethods', 1));

    $this->actingAs($admin)->post("{$base}/officials", [
        'name' => 'Pelatih A', 'role' => 'Pelatih', 'phone' => '081234567891',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('officials', ['contingent_id' => $registration->contingent_id, 'name' => 'Pelatih A']);

    foreach (range(1, 3) as $number) {
        $this->actingAs($admin)->post("{$base}/athletes", [
            'name' => "Atlet {$number}", 'gender' => $number === 1 ? 'female' : 'male', 'birth_date' => '2010-01-01',
            'event_age_category_id' => $age->id,
            'kyu_dan' => 'Kyu 2', 'weight' => 48, 'bpjs_number' => "BPJS-{$number}", 'bpjs_status' => 'active',
            'category_ids' => $number === 1 ? [$embu->id, $randori->id, $embuSecond->id] : [$embu->id],
        ])->assertRedirect()->assertSessionHasNoErrors();
    }
    expect(Athlete::query()->where('contingent_id', $registration->contingent_id)->count())->toBe(3);
    expect(Athlete::query()->where('name', 'Atlet 1')->sole()->gender)->toBe('female');
    expect(Athlete::query()->where('name', 'Atlet 1')->sole()->matchCategoryEntries()->count())->toBe(3);
    expect(AthleteMatchCategoryEntry::query()->where('event_match_category_id', $embu->id)->orderBy('created_at')->pluck('team_number')->sort()->values()->all())->toBe([1, 1, 2]);
    expect((float) $registration->fresh()->total_amount)->toBe(550000.0);
    expect((float) $registration->fresh()->final_amount)->toBe(550000.0 + $registration->verification_code);

    $this->actingAs($admin)->post("{$base}/payment", [
        'payment_method_id' => $method->id, 'payment_amount' => $registration->fresh()->final_amount,
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($registration->fresh()->payment_status->value)->toBe('submitted');
    $third = Athlete::query()->where('name', 'Atlet 3')->sole();
    $this->actingAs($admin)->post("{$base}/athletes/{$third->id}", [
        'name' => 'Atlet 3', 'gender' => 'male', 'birth_date' => '2010-01-01',
        'event_age_category_id' => $age->id, 'kyu_dan' => 'Kyu 2', 'weight' => 48, 'category_ids' => [],
    ])->assertSessionHasNoErrors();
    expect((float) $registration->fresh()->total_amount)->toBe(450000.0);
    expect($registration->fresh()->payment_status->value)->toBe('rejected');

    $sourceEvent = Event::create([
        'name' => 'Event Sumber', 'slug' => 'event-sumber-wizard', 'venue' => 'GOR B', 'city' => 'Malang',
        'start_date' => '2025-12-01', 'end_date' => '2025-12-03',
    ]);
    $source = Contingent::create([
        'event_id' => $sourceEvent->id, 'user_id' => $admin->id, 'name' => 'Dojo Sumber',
        'city' => 'Malang', 'manager_name' => 'Sensei B', 'phone' => '081234567899',
    ]);
    $sourceOfficial = Official::create(['contingent_id' => $source->id, 'name' => 'Pelatih Sumber', 'role' => 'Pelatih', 'phone' => '081234567898']);
    $sourceAthlete = Athlete::create(['contingent_id' => $source->id, 'name' => 'Atlet Sumber', 'gender' => 'male', 'kyu_dan' => 'Kyu 2']);
    $this->actingAs($admin)->get("{$base}/detail")
        ->assertInertia(fn (Assert $page) => $page->has('availableOfficials', 1)->has('athletes', 3)
            ->where('athletes.0.contingent_id', $registration->contingent_id));
    $this->actingAs($admin)->post("{$base}/officials/copy", ['official_id' => $sourceOfficial->id])->assertSessionHasNoErrors();
    $this->actingAs($admin)->post("{$base}/athletes/copy", ['athlete_id' => $sourceAthlete->id])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('officials', ['contingent_id' => $registration->contingent_id, 'name' => 'Pelatih Sumber']);
    $this->assertDatabaseHas('athletes', ['contingent_id' => $registration->contingent_id, 'name' => 'Atlet Sumber']);

    $secondContingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $admin->id, 'name' => 'Dojo Kedua',
        'city' => 'Surabaya', 'manager_name' => 'Sensei C', 'phone' => '081234567897',
    ]);
    $this->actingAs($admin)->post('/admin/pendaftaran/registrasi', [
        'event_id' => $event->id, 'contingent_id' => $secondContingent->id,
    ])->assertSessionHasNoErrors();
    $codes = Registration::query()->where('event_id', $event->id)->pluck('verification_code');
    expect($codes->unique()->count())->toBe(2);
});

test('wizard creates free registrations without verification code or payment step requirements', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = Event::create([
        'name' => 'Free Wizard Cup',
        'slug' => 'free-wizard-cup',
        'venue' => 'GOR A',
        'city' => 'Surabaya',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-03',
        'is_paid' => false,
        'fee_per_contingent' => 0,
        'fee_per_athlete' => 0,
    ]);

    $this->actingAs($admin)->post('/admin/pendaftaran/registrasi', [
        'event_id' => $event->id,
        'city' => 'Surabaya',
        'name' => 'Dojo Gratis',
        'manager_name' => 'Sensei Gratis',
        'phone' => '081234567890',
        'email' => 'gratis@example.com',
        'address' => 'Jalan Gratis 1',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $registration = Registration::query()->sole();
    expect((float) $registration->total_amount)->toBe(0.0);
    expect((float) $registration->final_amount)->toBe(0.0);
    expect($registration->verification_code)->toBeNull();
    expect($registration->payment_status->value)->toBe('verified');

    $this->actingAs($admin)->get("/admin/pendaftaran/registrasi/{$registration->id}/detail?step=4")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registration/WizardDetail')
            ->where('registration.event.is_paid', false)
            ->has('paymentMethods', 0));

    $this->actingAs($admin)->post("/admin/pendaftaran/registrasi/{$registration->id}/recalculate")
        ->assertRedirect()->assertSessionHasNoErrors();

    expect((float) $registration->fresh()->final_amount)->toBe(0.0);
    expect($registration->fresh()->verification_code)->toBeNull();
});

test('wizard accepts the manually chosen age group regardless of birth date and requires an explicit older Embu group choice', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = Event::create([
        'name' => 'Age Group Cup', 'slug' => 'age-group-cup', 'venue' => 'GOR A', 'city' => 'Malang',
        'start_date' => '2026-12-01', 'end_date' => '2026-12-03', 'max_match_categories_per_athlete' => 1,
    ]);
    $younger = EventAgeCategory::create(['event_id' => $event->id, 'name' => 'Pemula', 'min_age' => 10, 'max_age' => 13, 'is_active' => true]);
    $older = EventAgeCategory::create(['event_id' => $event->id, 'name' => 'Remaja', 'min_age' => 14, 'max_age' => 17, 'is_active' => true]);
    $embu = EventMatchCategory::create([
        'event_id' => $event->id, 'age_category_id' => $older->id, 'name' => 'Embu Remaja',
        'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes_per_team' => 4, 'is_active' => true,
    ]);
    $pemulaEmbu = EventMatchCategory::create([
        'event_id' => $event->id, 'age_category_id' => $younger->id, 'name' => 'Embu Pemula',
        'type' => 'embu', 'gender' => 'mixed', 'capacity' => 16, 'max_athletes_per_team' => 4, 'is_active' => true,
    ]);
    $this->actingAs($admin)->post('/admin/pendaftaran/registrasi', [
        'event_id' => $event->id, 'city' => 'Malang', 'name' => 'Dojo Pemula',
        'manager_name' => 'Sensei A', 'phone' => '081234567890', 'email' => 'pemula@example.com', 'address' => 'Malang',
    ])->assertRedirect();
    $registration = Registration::query()->sole();
    $base = "/admin/pendaftaran/registrasi/{$registration->id}/athletes";
    $profile = ['name' => 'Kenshi Pemula', 'gender' => 'male', 'birth_date' => '2009-01-01',
        'event_age_category_id' => $younger->id, 'kyu_dan' => 'Kyu 2', 'category_ids' => [$embu->id]];

    $withoutGroup = $profile;
    unset($withoutGroup['event_age_category_id']);
    $this->actingAs($admin)->post($base, $withoutGroup)->assertSessionHasErrors('event_age_category_id');
    $this->actingAs($admin)->post($base, $profile)->assertSessionHasErrors('category_ids');
    $this->actingAs($admin)->post($base, [...$profile, 'promoted_category_ids' => [$embu->id]])
        ->assertSessionHasErrors('joined_age_category_id');
    $this->actingAs($admin)->post($base, [...$profile, 'promoted_category_ids' => [$embu->id], 'joined_age_category_id' => $younger->id])
        ->assertSessionHasErrors('joined_age_category_id');
    $event->update(['allow_cross_age_group_embu' => false]);
    $this->actingAs($admin)->post($base, [...$profile, 'promoted_category_ids' => [$embu->id], 'joined_age_category_id' => $older->id])
        ->assertSessionHasErrors('joined_age_category_id');
    $this->assertDatabaseCount('athletes', 0);
    $event->update(['allow_cross_age_group_embu' => true]);
    $this->actingAs($admin)->post($base, [...$profile, 'promoted_category_ids' => [$embu->id], 'joined_age_category_id' => $older->id])
        ->assertSessionHasNoErrors();
    $entry = AthleteMatchCategoryEntry::query()->sole();
    expect($entry->age_group_promotion)->toBeTrue();
    expect($entry->athlete->event_age_category_id)->toBe($younger->id);

    $event->update(['allow_cross_age_group_embu' => false]);
    $this->actingAs($admin)->post("{$base}/{$entry->athlete_id}", [
        ...$profile, 'promoted_category_ids' => [$embu->id], 'joined_age_category_id' => $older->id,
    ])->assertSessionHasNoErrors();

    $this->actingAs($admin)->post("{$base}/{$entry->athlete_id}", [
        ...$profile, 'category_ids' => [$pemulaEmbu->id], 'promoted_category_ids' => [],
    ])->assertSessionHasNoErrors();
    expect(AthleteMatchCategoryEntry::query()->sole()->event_match_category_id)->toBe($pemulaEmbu->id);
    expect(AthleteMatchCategoryEntry::query()->sole()->age_group_promotion)->toBeFalse();

    $this->actingAs($admin)->post($base, [
        ...$profile, 'name' => 'Kenshi Remaja Pilihan', 'birth_date' => '2014-01-01',
        'event_age_category_id' => $older->id, 'category_ids' => [$embu->id],
    ])->assertSessionHasNoErrors();
    expect(Athlete::query()->where('name', 'Kenshi Remaja Pilihan')->sole()->event_age_category_id)->toBe($older->id);
});

test('logged in contingent sees its own data and can continue the wizard', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $event = Event::create([
        'name' => 'Owner Cup', 'slug' => 'owner-cup', 'tenant_subdomain' => 'owner-cup',
        'venue' => 'GOR A', 'city' => 'Surabaya', 'start_date' => '2026-12-01', 'end_date' => '2026-12-03',
    ]);
    $owned = Contingent::create([
        'event_id' => $event->id, 'user_id' => $owner->id, 'name' => 'Dojo Sendiri',
        'city' => 'Surabaya', 'manager_name' => 'Sensei Pemilik', 'phone' => '081234567890',
    ]);
    Contingent::create([
        'event_id' => $event->id, 'user_id' => $other->id, 'name' => 'Dojo Orang Lain',
        'city' => 'Malang', 'manager_name' => 'Sensei Lain', 'phone' => '081234567891',
    ]);
    $base = 'http://owner-cup.localhost/admin/pendaftaran/registrasi';
    $this->actingAs($owner)->get('http://localhost/admin/pendaftaran/registrasi/create')
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/Create')
            ->has('events', 1)->has('contingents', 1)->where('contingents.0.id', $owned->id));
    $this->actingAs($owner)->get("{$base}/create")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/Create')
            ->where('isAdmin', false)->has('contingents', 1)->where('contingents.0.id', $owned->id));
    $this->actingAs($owner)->post($base, ['event_id' => $event->id, 'contingent_id' => $owned->id])
        ->assertRedirect()->assertSessionHasNoErrors();
    $registration = Registration::query()->sole();
    $this->actingAs($owner)->get("{$base}/{$registration->id}/detail")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/WizardDetail')
            ->where('registration.contingent.name', 'Dojo Sendiri'));
    $this->actingAs($owner)->patch("{$base}/{$registration->id}/contingent", [
        'city' => 'Surabaya', 'name' => 'Dojo Sendiri', 'manager_name' => 'Sensei Pemilik',
        'phone' => '081234567890', 'email' => 'owner@example.com', 'address' => 'Jalan Kempo',
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($owned->fresh()->email)->toBe('owner@example.com');
});
