<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Technique;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('match groups page shows only the selected event and registration data', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $staff = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Tim', 'slug' => 'event-tim', 'tenant_subdomain' => 'event-tim',
        'venue' => 'GOR A', 'city' => 'Surabaya', 'start_date' => '2026-12-01', 'end_date' => '2026-12-03',
        'max_match_categories_per_athlete' => 3,
    ]);
    $otherEvent = Event::create([
        'name' => 'Event Lain', 'slug' => 'event-lain', 'tenant_subdomain' => 'event-lain',
        'venue' => 'GOR B', 'city' => 'Malang', 'start_date' => '2027-01-01', 'end_date' => '2027-01-03',
    ]);
    $event->users()->attach($staff, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $staff->id, 'name' => 'Dojo Tim',
        'city' => 'Surabaya', 'manager_name' => 'Sensei Tim', 'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $otherEvent->id, 'user_id' => $staff->id, 'name' => 'Dojo Lain',
        'city' => 'Malang', 'manager_name' => 'Sensei Lain', 'phone' => '081234567891',
    ]);
    $registration = Registration::create([
        'event_id' => $event->id, 'contingent_id' => $contingent->id,
        'registration_number' => 'REG-TIM',
    ]);
    $otherRegistration = Registration::create([
        'event_id' => $otherEvent->id, 'contingent_id' => $otherContingent->id,
        'registration_number' => 'REG-LAIN',
    ]);
    $athlete = Athlete::create(['contingent_id' => $contingent->id, 'name' => 'Kenshi Tim', 'gender' => 'L']);
    $partner = Athlete::create(['contingent_id' => $contingent->id, 'name' => 'Kenshi Zed', 'gender' => 'P']);
    $category = EventMatchCategory::create([
        'event_id' => $event->id, 'name' => 'Embu Beregu', 'type' => 'embu',
        'gender' => 'mixed', 'capacity' => 16, 'max_athletes_per_team' => 1, 'is_active' => true,
    ]);
    $technique = Technique::create(['name' => 'Teknik Tim', 'order' => 1, 'is_active' => true]);
    $entry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id, 'athlete_id' => $athlete->id,
        'event_match_category_id' => $category->id, 'team_number' => 2,
    ]);
    $partnerEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id, 'athlete_id' => $partner->id,
        'event_match_category_id' => $category->id, 'team_number' => 1,
    ]);
    EmbuTeamTechnique::create([
        'event_id' => $event->id, 'contingent_id' => $contingent->id,
        'event_match_category_id' => $category->id, 'team_number' => 2,
        'technique_id' => $technique->id, 'order' => 1,
    ]);
    $url = 'http://event-tim.localhost/admin/pendaftaran/nomor-pertandingan';

    $this->actingAs($staff)->get($url.'?registration_id='.$registration->id)
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Registration/MatchGroups')
            ->where('activeEvent.id', $event->id)
            ->has('eventOptions', 1)
            ->has('registrations', 1)
            ->where('registration.id', $registration->id)
            ->where('athletes.0.match_category_entries.0.team_number', 2)
            ->where('teamTechniques.0.technique.name', 'Teknik Tim'));

    $this->actingAs($staff)->get($url.'?registration_id='.$otherRegistration->id)->assertNotFound();

    $this->actingAs($staff)->patch("http://event-tim.localhost/admin/pendaftaran/registrasi/{$registration->id}/entries/{$entry->id}/team", [
        'team_number' => 1,
        'swap_entry_id' => $partnerEntry->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($entry->fresh()->team_number)->toBe(1)
        ->and($partnerEntry->fresh()->team_number)->toBe(2)
        ->and(EmbuTeamTechnique::query()->where('team_number', 2)->count())->toBe(1);
});

test('match groups page requires event management access', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $viewer = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Tertutup', 'slug' => 'event-tertutup', 'tenant_subdomain' => 'event-tertutup',
        'venue' => 'GOR A', 'city' => 'Surabaya', 'start_date' => '2026-12-01', 'end_date' => '2026-12-03',
    ]);
    $event->users()->attach($viewer, ['access_role' => 'viewer']);

    $this->actingAs($viewer)->get('http://event-tertutup.localhost/admin/pendaftaran/nomor-pertandingan')
        ->assertForbidden();
});

test('contingent account sees only its own match groups', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $owner = User::factory()->create();
    $otherOwner = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Kontingen', 'slug' => 'event-kontingen', 'tenant_subdomain' => 'event-kontingen',
        'venue' => 'GOR A', 'city' => 'Surabaya', 'start_date' => '2026-12-01', 'end_date' => '2026-12-03',
    ]);
    $ownContingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $owner->id, 'name' => 'Dojo Sendiri',
        'city' => 'Surabaya', 'manager_name' => 'Sensei A', 'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $otherOwner->id, 'name' => 'Dojo Lain',
        'city' => 'Surabaya', 'manager_name' => 'Sensei B', 'phone' => '081234567891',
    ]);
    $ownRegistration = Registration::create([
        'event_id' => $event->id, 'contingent_id' => $ownContingent->id, 'registration_number' => 'REG-OWN',
    ]);
    $otherRegistration = Registration::create([
        'event_id' => $event->id, 'contingent_id' => $otherContingent->id, 'registration_number' => 'REG-OTHER',
    ]);
    $url = 'http://event-kontingen.localhost/admin/pendaftaran/nomor-pertandingan';

    $this->actingAs($owner)->get($url)->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Registration/MatchGroups')
        ->has('registrations', 1)
        ->where('registration.id', $ownRegistration->id));
    $this->actingAs($owner)->get($url.'?registration_id='.$otherRegistration->id)->assertNotFound();
});
