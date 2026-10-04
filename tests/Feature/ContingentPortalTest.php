<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'kontingen', 'guard_name' => 'web']);
});

function portalEvent(string $name, string $slug, bool $active = false): Event
{
    return Event::create([
        'name' => $name,
        'slug' => $slug,
        'venue' => 'GOR Uji',
        'city' => 'Surabaya',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'is_active' => $active,
        'is_paid' => false,
    ]);
}

function portalContingent(User $user, Event $event, string $name): Contingent
{
    return Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => $name,
        'city' => 'Surabaya',
        'manager_name' => 'Manajer '.$name,
        'phone' => '081234567890',
    ]);
}

test('guest is redirected to login from contingent portal', function () {
    $this->get('/kontingen/registrasi')->assertRedirect(route('login'));
});

test('only a contingent account with owned data may access the portal', function () {
    $event = portalEvent('POPDA', 'popda');
    $user = User::factory()->create();
    $user->assignRole('kontingen');

    $this->actingAs($user)->get('/kontingen/registrasi')->assertForbidden();

    portalContingent($user, $event, 'Kontingen Uji');

    $this->actingAs($user)->get('/kontingen/registrasi')->assertOk();
});

test('contingent portal exposes six separated pages scoped to the signed in contingent', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $otherOwner = User::factory()->create();
    $event = portalEvent('POPDA Jatim 2026', 'popda-jatim-2026', true);
    $ownContingent = portalContingent($owner, $event, 'Kontingen Sendiri');
    $otherContingent = portalContingent($otherOwner, $event, 'Kontingen Lain');
    $ownRegistration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $ownContingent->id,
        'registration_number' => 'REG-OWN-001',
    ]);
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $otherContingent->id,
        'registration_number' => 'REG-OTHER-001',
    ]);
    Athlete::create(['contingent_id' => $ownContingent->id, 'name' => 'Atlet Sendiri', 'gender' => 'L']);
    Athlete::create(['contingent_id' => $otherContingent->id, 'name' => 'Atlet Lain', 'gender' => 'P']);
    Official::create(['contingent_id' => $ownContingent->id, 'name' => 'Official Sendiri', 'role' => 'Pelatih']);
    Official::create(['contingent_id' => $otherContingent->id, 'name' => 'Official Lain', 'role' => 'Pelatih']);

    $this->actingAs($owner)->withSession(['tenant_event_id' => $event->id])
        ->get('/kontingen/registrasi')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'registration')
            ->where('portal.contingent.id', $ownContingent->id)
            ->where('registration.id', $ownRegistration->id));

    $this->actingAs($owner)->get('/kontingen/jadwal')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'schedule'));
    $this->actingAs($owner)->get('/kontingen/hasil')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'results'));
    $this->actingAs($owner)->get('/kontingen/atlet')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'athletes')
            ->has('athletes', 1)->where('athletes.0.name', 'Atlet Sendiri'));
    $this->actingAs($owner)->get('/kontingen/official')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'officials')
            ->has('officials', 1)->where('officials.0.name', 'Official Sendiri'));
    $this->actingAs($owner)->get('/kontingen/riwayat-pendaftaran')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'history')
            ->has('registrations', 1)->where('registrations.0.id', $ownRegistration->id));
});

test('legacy admin registration URLs redirect contingent role to its dedicated portal', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $event = portalEvent('POPDA Redirect', 'popda-redirect', true);
    portalContingent($owner, $event, 'Kontingen Redirect');

    $this->actingAs($owner)->withSession(['tenant_event_id' => $event->id])
        ->get('/admin/pendaftaran/registrasi')
        ->assertRedirect(route('kontingen.registrasi'));

    $this->actingAs($owner)->withSession(['tenant_event_id' => $event->id])
        ->get('/admin/pendaftaran/nomor-pertandingan')
        ->assertRedirect(route('kontingen.registrasi'));
});

test('opening an owned registration switches event context before entering its wizard', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $currentEvent = portalEvent('Event Aktif', 'event-aktif', true);
    $historyEvent = portalEvent('Event Riwayat', 'event-riwayat');
    portalContingent($owner, $currentEvent, 'Kontingen Aktif');
    $historyContingent = portalContingent($owner, $historyEvent, 'Kontingen Riwayat');
    $registration = Registration::create([
        'event_id' => $historyEvent->id,
        'contingent_id' => $historyContingent->id,
        'registration_number' => 'REG-HISTORY-001',
    ]);

    $this->actingAs($owner)->withSession(['tenant_event_id' => $currentEvent->id])
        ->get(route('kontingen.registrasi.detail', ['registration' => $registration, 'step' => 3]))
        ->assertRedirect(route('admin.pendaftaran.registrasi.detail', [
            'registration' => $registration,
            'step' => 3,
        ]))
        ->assertSessionHas('tenant_event_id', $historyEvent->id);
});

test('contingent can view schedules and results for each owned event', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $firstEvent = portalEvent('Event Pertama', 'event-pertama', true);
    $secondEvent = portalEvent('Event Kedua', 'event-kedua');
    $firstContingent = portalContingent($owner, $firstEvent, 'Kontingen Pertama');
    $secondContingent = portalContingent($owner, $secondEvent, 'Kontingen Kedua');
    $firstRegistration = Registration::create([
        'event_id' => $firstEvent->id,
        'contingent_id' => $firstContingent->id,
        'registration_number' => 'REG-EVENT-PERTAMA',
    ]);
    $firstAthlete = Athlete::create(['contingent_id' => $firstContingent->id, 'name' => 'Atlet Pertama', 'gender' => 'L']);
    $secondAthlete = Athlete::create(['contingent_id' => $secondContingent->id, 'name' => 'Atlet Kedua', 'gender' => 'P']);
    Rundown::create([
        'event_id' => $firstEvent->id,
        'date' => '2026-11-06 08:00:00',
        'name' => 'Rundown Pertama',
        'type' => 'match',
    ]);
    Rundown::create([
        'event_id' => $secondEvent->id,
        'date' => '2026-11-07 08:00:00',
        'name' => 'Rundown Kedua',
        'type' => 'match',
    ]);
    TournamentResult::create([
        'event_id' => $firstEvent->id,
        'contingent_id' => $firstContingent->id,
        'athlete_id' => $firstAthlete->id,
        'contingent_name' => $firstContingent->name,
        'rank' => 1,
        'match_category' => 'Randori Putra',
    ]);
    TournamentResult::create([
        'event_id' => $secondEvent->id,
        'contingent_id' => $secondContingent->id,
        'athlete_id' => $secondAthlete->id,
        'contingent_name' => $secondContingent->name,
        'rank' => 2,
        'match_category' => 'Randori Putri',
    ]);

    $this->actingAs($owner)->withSession(['tenant_event_id' => $firstEvent->id])
        ->get('/kontingen/jadwal?event_id='.$secondEvent->id)
        ->assertSessionHas('tenant_event_id', $secondEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'schedule')
            ->where('portal.event.id', $secondEvent->id)
            ->where('portal.event.status_label', 'Pendaftaran Buka')
            ->has('portal.event_options', 2)
            ->has('rundowns', 1)
            ->where('rundowns.0.name', 'Rundown Kedua'));

    $this->actingAs($owner)->get('/kontingen/hasil?event_id='.$firstEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'results')
            ->where('portal.event.id', $firstEvent->id)
            ->has('results', 1)
            ->where('results.0.athlete.name', 'Atlet Pertama')
            ->where('medal_summary.gold', 1)
            ->where('medal_summary.silver', 0));

    $this->actingAs($owner)->get('/kontingen/registrasi?event_id='.$secondEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'registration')
            ->where('portal.event.id', $secondEvent->id)
            ->where('registration', null)
            ->has('registration_events', 2)
            ->where('registration_events.0.id', $firstEvent->id)
            ->where('registration_events.0.registration.id', $firstRegistration->id)
            ->where('registration_events.0.action_label', 'Lihat Registrasi')
            ->where('registration_events.1.id', $secondEvent->id)
            ->where('registration_events.1.registration', null)
            ->where('registration_events.1.action_label', 'Mulai Registrasi'));

    $this->actingAs($owner)->get(route('kontingen.registrasi.start', $secondEvent))
        ->assertRedirect(route('admin.pendaftaran.registrasi.create', ['event_id' => $secondEvent->id]))
        ->assertSessionHas('tenant_event_id', $secondEvent->id);
    $this->actingAs($owner)->get(route('kontingen.registrasi.start', $firstEvent))
        ->assertRedirect(route('admin.pendaftaran.registrasi.detail', [
            'registration' => $firstRegistration,
            'step' => 1,
        ]));

    $unownedEvent = portalEvent('Event Bukan Milik', 'event-bukan-milik');
    $this->actingAs($owner)->get('/kontingen/hasil?event_id='.$unownedEvent->id)->assertNotFound();
    $this->actingAs($owner)->get(route('kontingen.registrasi.start', $unownedEvent))->assertNotFound();
});
