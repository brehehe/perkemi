<?php

use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\SiteSetting;
use App\Models\User;
use Database\Seeders\PopdaJatim2026Seeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('popda seeder creates the free event competition data rundown and responsible account', function () {
    $this->seed(RoleAndPermissionSeeder::class);
    $this->seed(PopdaJatim2026Seeder::class);

    $event = Event::query()->where('slug', 'popda-xv-jawa-timur-2026')->firstOrFail();
    $responsibleUser = User::query()->where('email', 'penanggungjawab.popda2026@smart-perkemi.id')->firstOrFail();

    expect($event->is_paid)->toBeFalse()
        ->and((float) $event->fee_per_athlete)->toBe(0.0)
        ->and((float) $event->fee_per_contingent)->toBe(0.0)
        ->and($event->max_match_categories_per_athlete)->toBe(2)
        ->and($event->is_active)->toBeTrue()
        ->and($event->ageCategories()->where('is_active', true)->count())->toBe(1)
        ->and($event->matchCategories()->where('is_active', true)->count())->toBe(11)
        ->and($event->matchCategories()->where('is_active', true)->distinct()->count('age_category_id'))->toBe(1)
        ->and($event->rundowns()->count())->toBe(14)
        ->and($event->paymentMethods()->count())->toBe(0)
        ->and($responsibleUser->hasRole('Penanggung Jawab Event'))->toBeTrue()
        ->and($responsibleUser->hasRole('Admin'))->toBeFalse()
        ->and($event->responsibleUsers()->whereKey($responsibleUser->id)->exists())->toBeTrue();

    $this->assertDatabaseHas('event_match_categories', [
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Campuran Kyu II / I',
        'gender' => 'mixed',
        'max_athletes_per_team' => 2,
    ]);
    $this->assertDatabaseHas('event_age_categories', [
        'event_id' => $event->id,
        'name' => 'Pelajar POPDA',
        'min_age' => 13,
        'max_age' => 16,
        'is_active' => true,
    ]);
    $this->assertDatabaseHas('rundowns', [
        'event_id' => $event->id,
        'name' => 'UPP dan Penutupan',
    ]);
    $this->assertDatabaseHas('event_user', [
        'event_id' => $event->id,
        'user_id' => $responsibleUser->id,
        'access_role' => Event::AccessRoleResponsible,
    ]);

    $settings = SiteSetting::current();
    expect($settings->home_landing_mode)->toBe(SiteSetting::HomeFeaturedEvent)
        ->and($settings->featured_event_id)->toBe($event->id);
});

test('popda seeder is idempotent', function () {
    $this->seed(RoleAndPermissionSeeder::class);
    $this->seed(PopdaJatim2026Seeder::class);
    $this->seed(PopdaJatim2026Seeder::class);

    $event = Event::query()->where('slug', 'popda-xv-jawa-timur-2026')->firstOrFail();

    expect(Event::query()->where('slug', $event->slug)->count())->toBe(1)
        ->and($event->ageCategories()->where('is_active', true)->count())->toBe(1)
        ->and($event->matchCategories()->where('is_active', true)->count())->toBe(11)
        ->and($event->rundowns()->count())->toBe(14);
});

test('popda seeder consolidates existing athlete age groups without limiting match type combinations', function () {
    $this->seed(RoleAndPermissionSeeder::class);
    $this->seed(PopdaJatim2026Seeder::class);

    $event = Event::query()->where('slug', 'popda-xv-jawa-timur-2026')->firstOrFail();
    $legacyCategory = EventAgeCategory::create([
        'event_id' => $event->id,
        'name' => 'Pelajar POPDA — Embu',
        'min_age' => 13,
        'max_age' => 16,
        'is_active' => true,
    ]);
    $user = User::factory()->create();
    $contingent = $event->contingents()->create([
        'user_id' => $user->id,
        'name' => 'Kontingen Uji POPDA',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Uji',
        'phone' => '081234567890',
    ]);
    $athlete = $contingent->athletes()->create([
        'name' => 'Atlet Uji POPDA',
        'gender' => 'male',
        'event_age_category_id' => $legacyCategory->id,
    ]);

    $this->seed(PopdaJatim2026Seeder::class);

    $ageCategory = $event->ageCategories()->where('is_active', true)->sole();
    $types = $event->matchCategories()->where('is_active', true)->pluck('type')->unique()->sort()->values();
    expect($ageCategory->name)->toBe('Pelajar POPDA')
        ->and($athlete->fresh()->event_age_category_id)->toBe($ageCategory->id)
        ->and($legacyCategory->fresh()->is_active)->toBeFalse()
        ->and($types->all())->toBe(['embu', 'randori'])
        ->and($event->fresh()->max_match_categories_per_athlete)->toBe(2);
});
