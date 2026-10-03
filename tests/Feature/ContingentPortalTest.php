<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Role;
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
