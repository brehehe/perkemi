<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventMatchCategory;
use App\Models\Kyu;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Technique;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('registrations are created for the selected event and contingent only once', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Registrasi 2026', 'slug' => 'registrasi-2026',
        'venue' => 'GOR A', 'city' => 'Jakarta',
        'start_date' => '2026-10-01', 'end_date' => '2026-10-03',
        'fee_per_athlete' => 100000, 'fee_per_contingent' => 250000,
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Lain', 'slug' => 'registrasi-lain',
        'venue' => 'GOR B', 'city' => 'Bandung',
        'start_date' => '2026-11-01', 'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo A',
        'city' => 'Jakarta', 'manager_name' => 'Sensei A', 'phone' => '081234567890',
    ]);
    $foreignContingent = Contingent::create([
        'event_id' => $otherEvent->id, 'user_id' => $user->id, 'name' => 'Dojo B',
        'city' => 'Bandung', 'manager_name' => 'Sensei B', 'phone' => '081234567891',
    ]);
    Athlete::create(['contingent_id' => $contingent->id, 'name' => 'Kenshi Satu', 'gender' => 'male']);
    Athlete::create(['contingent_id' => $contingent->id, 'name' => 'Kenshi Dua', 'gender' => 'female']);
    $base = 'http://registrasi-2026.localhost/admin/pendaftaran/registrasi';

    $this->actingAs($user)->get("{$base}/create")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/Create')
            ->has('events', 1)->has('contingents', 1));
    $this->actingAs($user)->post($base, [
        'event_id' => $event->id, 'contingent_id' => $foreignContingent->id,
    ])->assertSessionHasErrors('contingent_id');
    $this->actingAs($user)->post($base, [
        'event_id' => $event->id, 'contingent_id' => $contingent->id,
    ])->assertRedirect();

    $registration = Registration::query()->sole();
    expect($registration->event_id)->toBe($event->id)
        ->and($registration->contingent_id)->toBe($contingent->id)
        ->and((float) $registration->total_amount)->toBe(250000.0)
        ->and((float) $registration->final_amount)->toBe(250000.0 + $registration->verification_code);

    $this->actingAs($user)->post($base, [
        'event_id' => $event->id, 'contingent_id' => $contingent->id,
    ])->assertSessionHasErrors('contingent_id');
});

test('admin can register an existing contingent for another event with a copied roster', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $owner = User::factory()->create();
    $sourceEvent = Event::create([
        'name' => 'Event Asal', 'slug' => 'event-asal', 'venue' => 'GOR A', 'city' => 'Jakarta',
        'start_date' => '2026-10-01', 'end_date' => '2026-10-03',
    ]);
    $targetEvent = Event::create([
        'name' => 'Event Tujuan', 'slug' => 'event-tujuan', 'venue' => 'GOR B', 'city' => 'Bandung',
        'start_date' => '2026-11-01', 'end_date' => '2026-11-03',
        'fee_per_athlete' => 100000, 'fee_per_contingent' => 250000, 'is_active' => true,
    ]);
    $source = Contingent::create([
        'event_id' => $sourceEvent->id, 'user_id' => $owner->id, 'name' => 'Dojo Bersama',
        'city' => 'Jakarta', 'manager_name' => 'Sensei A', 'phone' => '081234567890',
    ]);
    Athlete::create(['contingent_id' => $source->id, 'name' => 'Kenshi Satu', 'gender' => 'male']);
    Official::create(['contingent_id' => $source->id, 'name' => 'Pelatih Satu', 'role' => 'Pelatih']);

    $this->actingAs($admin)->get('/admin/pendaftaran/registrasi/create')
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/Create')
            ->where('selectedEventId', $targetEvent->id)
            ->has('contingents', 1)
            ->where('contingents.0.id', $source->id));

    $this->actingAs($admin)->post('/admin/pendaftaran/registrasi', [
        'event_id' => $targetEvent->id, 'contingent_id' => $source->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $copy = Contingent::where('event_id', $targetEvent->id)->sole();
    $registration = Registration::query()->sole();
    expect($copy->source_contingent_id)->toBe($source->id)
        ->and($copy->user_id)->toBe($owner->id)
        ->and($copy->athletes()->count())->toBe(1)
        ->and($copy->officials()->count())->toBe(1)
        ->and($registration->contingent_id)->toBe($copy->id)
        ->and((float) $registration->total_amount)->toBe(250000.0)
        ->and((float) $registration->final_amount)->toBe(250000.0 + $registration->verification_code)
        ->and($source->athletes()->count())->toBe(1);

    $this->actingAs($admin)->post('/admin/pendaftaran/registrasi', [
        'event_id' => $targetEvent->id, 'contingent_id' => $source->id,
    ])->assertSessionHasErrors('contingent_id');
    expect(Contingent::where('event_id', $targetEvent->id)->count())->toBe(1);
});

test('registration detail limits match entries to its own athletes and event', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Detail 2026', 'slug' => 'detail-2026',
        'venue' => 'GOR A', 'city' => 'Jakarta',
        'start_date' => '2026-10-01', 'end_date' => '2026-10-03',
        'max_match_categories_per_athlete' => 1,
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo Detail',
        'city' => 'Jakarta', 'manager_name' => 'Sensei Detail', 'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo Lain',
        'city' => 'Jakarta', 'manager_name' => 'Sensei Lain', 'phone' => '081234567891',
    ]);
    $athlete = Athlete::create(['contingent_id' => $contingent->id, 'name' => 'Kenshi Detail', 'gender' => 'male']);
    $otherAthlete = Athlete::create(['contingent_id' => $otherContingent->id, 'name' => 'Kenshi Lain', 'gender' => 'male']);
    $registration = Registration::create([
        'event_id' => $event->id, 'contingent_id' => $contingent->id,
        'registration_number' => 'REG-DETAIL-2026',
    ]);
    $first = EventMatchCategory::create([
        'event_id' => $event->id, 'name' => 'Randori Putra', 'type' => 'randori',
        'gender' => 'male', 'capacity' => 16, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);
    $second = EventMatchCategory::create([
        'event_id' => $event->id, 'name' => 'Embu Putra', 'type' => 'embu',
        'gender' => 'male', 'capacity' => 16, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);
    $base = "http://detail-2026.localhost/admin/pendaftaran/registrasi/{$registration->id}";

    $this->actingAs($user)->get("{$base}/detail")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/WizardDetail')
            ->where('registration.event.id', $event->id)->has('athletes', 1)->has('categories', 2));
    $this->actingAs($user)->post("{$base}/athletes/{$otherAthlete->id}/match-category", [
        'event_match_category_id' => $first->id,
    ])->assertNotFound();
    $this->actingAs($user)->post("{$base}/athletes/{$athlete->id}/match-category", [
        'event_match_category_id' => $first->id,
    ])->assertRedirect();
    $this->actingAs($user)->post("{$base}/athletes/{$athlete->id}/match-category", [
        'event_match_category_id' => $second->id,
    ])->assertSessionHasErrors('event_match_category_id');
    $this->assertDatabaseCount('athlete_match_category_entries', 1);
});

test('registration ignores Kyu and gender limits and still uses birth age when no manual group is selected', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $staff = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Batas Usia', 'slug' => 'batas-usia',
        'venue' => 'GOR A', 'city' => 'Surabaya',
        'start_date' => '2026-12-05', 'end_date' => '2026-12-07',
        'max_match_categories_per_athlete' => 3,
    ]);
    $event->users()->attach($staff, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $staff->id, 'name' => 'Dojo Usia',
        'city' => 'Surabaya', 'manager_name' => 'Sensei Usia', 'phone' => '081234567890',
    ]);
    $eligible = Athlete::create([
        'contingent_id' => $contingent->id, 'name' => 'Atlet Memenuhi Syarat',
        'gender' => 'L', 'birth_date' => '2008-12-05', 'kyu_dan' => 'Kyu 6',
    ]);
    $tooYoung = Athlete::create([
        'contingent_id' => $contingent->id, 'name' => 'Atlet Terlalu Muda',
        'gender' => 'L', 'birth_date' => '2008-12-06', 'kyu_dan' => 'Kyu 6',
    ]);
    $wrongKyu = Athlete::create([
        'contingent_id' => $contingent->id, 'name' => 'Atlet Salah Kyu',
        'gender' => 'P', 'birth_date' => '2008-12-05', 'kyu_dan' => 'Kyu 4',
    ]);
    foreach (['Kyu 7', 'Kyu 6', 'Kyu 5', 'Kyu 4'] as $index => $name) {
        Kyu::create(['name' => $name, 'order' => $index + 1, 'is_active' => true]);
    }
    $ageCategory = EventAgeCategory::create([
        'event_id' => $event->id, 'name' => 'Dewasa', 'min_age' => 18, 'max_age' => 35,
    ]);
    $category = EventMatchCategory::create([
        'event_id' => $event->id, 'age_category_id' => $ageCategory->id,
        'name' => 'Embu Putra Kyu 7-5', 'type' => 'embu', 'gender' => 'male',
        'min_kyu' => 'Kyu 7', 'max_kyu' => 'Kyu 5',
        'capacity' => 16, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);
    $registration = Registration::create([
        'event_id' => $event->id, 'contingent_id' => $contingent->id,
        'registration_number' => 'REG-BATAS-USIA',
    ]);
    $base = "http://batas-usia.localhost/admin/pendaftaran/registrasi/{$registration->id}";

    $this->actingAs($staff)->get("{$base}/detail")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/WizardDetail')
            ->where('categories.0.eligible_athlete_ids', [$eligible->id, $wrongKyu->id]));
    $this->actingAs($staff)->post("{$base}/athletes/{$tooYoung->id}/match-category", [
        'event_match_category_id' => $category->id,
    ])->assertSessionHasErrors('event_match_category_id');
    $this->actingAs($staff)->post("{$base}/athletes/{$wrongKyu->id}/match-category", [
        'event_match_category_id' => $category->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($staff)->post("{$base}/athletes/{$eligible->id}/match-category", [
        'event_match_category_id' => $category->id,
        'team_number' => 1,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseCount('athlete_match_category_entries', 2);
});

test('one contingent can enter two Embu teams and choose separate techniques for each', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $staff = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Dua Tim', 'slug' => 'dua-tim', 'tenant_subdomain' => 'dua-tim',
        'venue' => 'GOR A', 'city' => 'Surabaya', 'start_date' => '2026-12-01', 'end_date' => '2026-12-03',
        'max_match_categories_per_athlete' => 3,
    ]);
    $event->users()->attach($staff, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $staff->id, 'name' => 'Dojo Tim',
        'city' => 'Surabaya', 'manager_name' => 'Sensei Tim', 'phone' => '081234567890',
    ]);
    $athletes = collect(['Atlet Satu', 'Atlet Dua', 'Atlet Tiga', 'Atlet Empat'])
        ->map(fn ($name, $index) => Athlete::create([
            'contingent_id' => $contingent->id, 'name' => $name,
            'gender' => $index % 2 === 0 ? 'L' : 'P',
        ]));
    $category = EventMatchCategory::create([
        'event_id' => $event->id, 'name' => 'Embu Beregu', 'type' => 'embu',
        'gender' => 'mixed', 'capacity' => 16, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);
    $firstTechnique = Technique::create(['name' => 'Teknik Pertama', 'order' => 1, 'is_active' => true]);
    $secondTechnique = Technique::create(['name' => 'Teknik Kedua', 'order' => 2, 'is_active' => true]);
    $registration = Registration::create([
        'event_id' => $event->id, 'contingent_id' => $contingent->id,
        'registration_number' => 'REG-DUA-TIM',
    ]);
    $base = "http://dua-tim.localhost/admin/pendaftaran/registrasi/{$registration->id}";

    foreach ($athletes as $index => $athlete) {
        $this->actingAs($staff)->post("{$base}/athletes/{$athlete->id}/match-category", [
            'event_match_category_id' => $category->id,
            'team_number' => $index < 2 ? 1 : 2,
        ])->assertRedirect()->assertSessionHasNoErrors();
    }
    expect($category->athleteEntries()->where('team_number', 1)->count())->toBe(2)
        ->and($category->athleteEntries()->where('team_number', 2)->count())->toBe(2);

    foreach (range(2, 4) as $number) {
        $additionalCategory = EventMatchCategory::create([
            'event_id' => $event->id, 'name' => "Embu Nomor {$number}", 'type' => 'embu',
            'gender' => 'mixed', 'capacity' => 16, 'max_athletes_per_team' => 2, 'is_active' => true,
        ]);
        $response = $this->actingAs($staff)->post("{$base}/athletes/{$athletes[0]->id}/match-category", [
            'event_match_category_id' => $additionalCategory->id,
        ]);
        if ($number < 4) {
            $response->assertRedirect()->assertSessionHasNoErrors();
        } else {
            $response->assertSessionHasErrors('event_match_category_id');
        }
    }
    expect($athletes[0]->matchCategoryEntries()->count())->toBe(3);

    $this->actingAs($staff)->post("{$base}/match-category/{$category->id}/teams/1/techniques", [
        'technique_id' => $firstTechnique->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($staff)->post("{$base}/match-category/{$category->id}/teams/2/techniques", [
        'technique_id' => $secondTechnique->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($staff)->post("{$base}/match-category/{$category->id}/teams/1/techniques", [
        'technique_name' => 'Teknik Baru',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $newTechnique = Technique::where('name', 'Teknik Baru')->sole();
    $this->assertDatabaseHas('embu_team_techniques', [
        'event_match_category_id' => $category->id,
        'team_number' => 1,
        'technique_id' => $newTechnique->id,
    ]);
    $this->actingAs($staff)->post("{$base}/match-category/{$category->id}/teams/2/techniques", [
        'technique_name' => 'teknik baru',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($staff)->post("{$base}/match-category/{$category->id}/teams/1/techniques", [
        'technique_name' => 'Teknik Baru',
    ])->assertSessionHasErrors('technique_id');
    expect(Technique::count())->toBe(3);

    $this->actingAs($staff)->get("{$base}/detail")
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/WizardDetail')
            ->where('registration.event.max_match_categories_per_athlete', 3)
            ->has('athletes', 4)->has('teamTechniques', 4)->has('techniques', 3));

    $firstEntry = $category->athleteEntries()->where('athlete_id', $athletes[0]->id)->firstOrFail();
    $this->actingAs($staff)->patch("{$base}/athletes/{$athletes[0]->id}/match-category/{$firstEntry->id}/team", [
        'team_number' => 2,
    ])->assertSessionHasErrors('team_number');

    $teamOneTechnique = EmbuTeamTechnique::where('team_number', 1)->firstOrFail();
    $this->actingAs($staff)->delete("{$base}/match-category/{$category->id}/teams/2/techniques/{$teamOneTechnique->id}")
        ->assertNotFound();
    $this->actingAs($staff)->delete("{$base}/match-category/{$category->id}/teams/1/techniques/{$teamOneTechnique->id}")
        ->assertRedirect();
    expect(EmbuTeamTechnique::count())->toBe(3);
});
