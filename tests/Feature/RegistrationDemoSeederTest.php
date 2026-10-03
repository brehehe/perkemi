<?php

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventMatchCategory;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RegistrationDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('demo registration seeder fills every event with complete independent data and can run twice', function () {
    $firstEvent = Event::create([
        'name' => 'Demo Cup Satu', 'slug' => 'demo-cup-satu', 'city' => 'Surabaya', 'venue' => 'GOR A',
        'start_date' => '2026-10-01', 'end_date' => '2026-10-03', 'is_active' => true,
        'fee_per_contingent' => 200000, 'fee_per_athlete' => 100000,
        'max_match_categories_per_athlete' => 3,
    ]);
    $secondEvent = Event::create([
        'name' => 'Demo Cup Dua', 'slug' => 'demo-cup-dua', 'city' => 'Malang', 'venue' => 'GOR B',
        'start_date' => '2026-11-01', 'end_date' => '2026-11-03', 'is_active' => false,
        'fee_per_contingent' => 150000, 'fee_per_athlete' => 50000,
    ]);
    $age = EventAgeCategory::create([
        'event_id' => $firstEvent->id, 'name' => 'Remaja A', 'min_age' => 11,
        'max_age' => 13, 'is_active' => true,
    ]);
    $embu = EventMatchCategory::create([
        'event_id' => $firstEvent->id, 'age_category_id' => $age->id, 'name' => 'Embu Beregu',
        'type' => 'embu', 'gender' => 'mixed', 'capacity' => 32,
        'max_athletes_per_team' => 4, 'is_active' => true,
    ]);
    $randori = EventMatchCategory::create([
        'event_id' => $firstEvent->id, 'age_category_id' => $age->id, 'name' => 'Randori Remaja',
        'type' => 'randori', 'gender' => 'male', 'capacity' => 32,
        'min_weight' => 40, 'max_weight' => 50, 'is_active' => true,
    ]);
    $randoriPutri = EventMatchCategory::create([
        'event_id' => $firstEvent->id, 'age_category_id' => $age->id, 'name' => 'Randori Remaja Putri',
        'type' => 'randori', 'gender' => 'female', 'capacity' => 32,
        'min_weight' => 45, 'max_weight' => 55, 'is_active' => true,
    ]);

    $this->seed(RegistrationDemoSeeder::class);

    expect(Registration::count())->toBe(6)
        ->and(Contingent::count())->toBe(6)
        ->and(Official::count())->toBe(12)
        ->and(Athlete::count())->toBe(99)
        ->and(AthleteMatchCategoryEntry::count())->toBe(129)
        ->and($firstEvent->registrations()->count())->toBe(3)
        ->and($secondEvent->registrations()->count())->toBe(3);

    $registration = $firstEvent->registrations()->where('status', RegistrationStatus::Verified)->sole();
    $contingent = $registration->contingent;
    expect($contingent->event_id)->toBe($firstEvent->id)
        ->and($contingent->user_id)->not->toBeNull()
        ->and($contingent->manager_name)->not->toBeEmpty()
        ->and($contingent->phone)->not->toBeEmpty()
        ->and($contingent->email)->toContain('@example.test')
        ->and($contingent->address)->not->toBeEmpty()
        ->and($contingent->user->hasRole('kontingen'))->toBeTrue()
        ->and($contingent->officials()->count())->toBe(2)
        ->and($contingent->athletes()->count())->toBe(16)
        ->and($contingent->athletes()->first()->nik)->not->toBeEmpty()
        ->and($contingent->athletes()->first()->bpjs_number)->not->toBeEmpty()
        ->and($registration->payment_status)->toBe(PaymentStatus::Verified)
        ->and($registration->paymentMethod?->code)->toBe('demo-transfer-bank')
        ->and((float) $registration->total_amount)->toBe(1800000.0)
        ->and((float) $registration->final_amount)->toBe(1800000.0 + $registration->verification_code)
        ->and($contingent->athletes()->whereHas('matchCategoryEntries', fn ($query) => $query->where('event_match_category_id', $randori->id))->count())->toBe(1)
        ->and($contingent->athletes()->whereHas('matchCategoryEntries', fn ($query) => $query->where('event_match_category_id', $randoriPutri->id))->count())->toBe(1)
        ->and($contingent->athletes()->where('name', 'Demo Arga Pratama')->sole()->matchCategoryEntries()->count())->toBe(3)
        ->and($contingent->athletes()->where('name', 'Demo Arga Pratama')->sole()->matchCategoryEntries()->whereHas('matchCategory', fn ($query) => $query->where('type', 'embu'))->count())->toBe(2)
        ->and($contingent->athletes()->where('name', 'Demo Arga Pratama')->sole()->matchCategoryEntries()->whereHas('matchCategory', fn ($query) => $query->where('type', 'randori'))->count())->toBe(1)
        ->and($contingent->athletes()->where('name', 'Demo Dewi Anggraini')->sole()->matchCategoryEntries()->where('event_match_category_id', $randoriPutri->id)->count())->toBe(1)
        ->and((float) $contingent->athletes()->where('name', 'Demo Arga Pratama')->sole()->weight)->toBe(45.0)
        ->and($embu->athleteEntries()->where('team_number', 1)->count())->toBe(12)
        ->and($embu->athleteEntries()->where('team_number', 2)->count())->toBe(12)
        ->and($embu->athleteEntries()->where('team_number', 3)->count())->toBe(12)
        ->and($embu->athleteEntries()->where('team_number', 4)->count())->toBe(12);

    Role::findOrCreate('Super Admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $this->actingAs($admin)->get("/admin/pendaftaran/registrasi?event_id={$firstEvent->id}")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/Index')
            ->where('activeEvent.id', $firstEvent->id)
            ->has('registrations.data', 3)
            ->where('stats.total_registrations', 3));
    $this->actingAs($admin)->get('/admin/pendaftaran/verifikasi?'.http_build_query([
        'event_id' => $firstEvent->id, 'search' => 'Demo Arga Pratama',
    ]))->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/Verification')
        ->where('maxMatchCategoriesPerAthlete', 3)
        ->has('athletes.data', 3)
        ->has('athletes.data.0.match_categories', 3));
    $this->actingAs($admin)->get("/admin/pendaftaran/verifikasi?event_id={$secondEvent->id}")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/Verification')
            ->where('activeEvent.id', $secondEvent->id)
            ->has('contingents', 3)
            ->has('athletes.data', 15)
            ->where('stats.total_kenshi', 51));

    $fallbackRandori = $secondEvent->matchCategories()->where('name', 'Randori Demo Remaja Demo')->sole();
    expect($fallbackRandori->athleteEntries()->count())->toBe(3)
        ->and($secondEvent->contingents()->first()->athletes()->count())->toBe(17)
        ->and($secondEvent->registrations()->first()->total_amount)->toBe('1000000.00')
        ->and($secondEvent->contingents()->first()->athletes()->whereHas('matchCategoryEntries', fn ($query) => $query->where('event_match_category_id', $fallbackRandori->id))->first()->matchCategoryEntries()->count())->toBe(1);

    $registration->update(['notes' => 'Diubah untuk memeriksa idempotensi']);
    $this->seed(RegistrationDemoSeeder::class);

    expect(Registration::count())->toBe(6)
        ->and(Contingent::count())->toBe(6)
        ->and(Official::count())->toBe(12)
        ->and(Athlete::count())->toBe(99)
        ->and(AthleteMatchCategoryEntry::count())->toBe(129)
        ->and($registration->fresh()->notes)->toBe('Diubah untuk memeriksa idempotensi')
        ->and((float) $registration->fresh()->payment_amount)->toBe(1800000.0 + $registration->verification_code)
        ->and($secondEvent->matchCategories()->where('name', 'Embu Beregu Demo')->count())->toBe(1)
        ->and($secondEvent->matchCategories()->where('name', 'Randori Demo Remaja Demo')->count())->toBe(1);

    $firstEvent->update(['max_match_categories_per_athlete' => 1]);
    $this->seed(RegistrationDemoSeeder::class);

    expect($contingent->athletes()->where('name', 'Demo Arga Pratama')->sole()->matchCategoryEntries()->count())->toBe(1)
        ->and($contingent->athletes()->count())->toBe(18)
        ->and((float) $registration->fresh()->total_amount)->toBe(2000000.0);

    $firstEvent->update(['max_match_categories_per_athlete' => 3]);
    $this->seed(RegistrationDemoSeeder::class);

    expect($contingent->athletes()->where('name', 'Demo Arga Pratama')->sole()->matchCategoryEntries()->count())->toBe(3)
        ->and($contingent->athletes()->count())->toBe(16)
        ->and((float) $registration->fresh()->total_amount)->toBe(1800000.0);
});

test('default seeding links base contingents to the primary event and adds demo data for every event', function () {
    $this->seed(DatabaseSeeder::class);

    $primaryEvent = Event::where('slug', 'kejurnas-shorinji-kempo-surabaya-2026')->sole();
    expect(Event::count())->toBe(3)
        ->and(Contingent::whereNull('event_id')->count())->toBe(0)
        ->and($primaryEvent->contingents()->where('name', 'Dojo Garuda Sakti Surabaya')->count())->toBe(1)
        ->and($primaryEvent->contingents()->where('name', 'like', 'Demo Dojo %')->count())->toBe(3)
        ->and(Registration::where('registration_number', 'like', 'REG-DEMO-%')->count())->toBe(9);
});
