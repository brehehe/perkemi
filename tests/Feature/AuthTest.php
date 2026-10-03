<?php

use App\Mail\ContingentAccountCreatedMail;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home'));
});

test('users logging in from an event tenant are returned to that tenant', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Login Tenant 2026',
        'slug' => 'kejurda-login-tenant-2026',
        'tenant_subdomain' => 'kejurda-login-tenant-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);

    $response = $this->post('http://kejurda-login-tenant-2026.localhost/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect('http://kejurda-login-tenant-2026.localhost/admin/dashboard');
    $response->assertSessionHas('tenant_event_id', $event->id);
});

test('event responsible users logging in from a public event page enter its dashboard', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'POPDA Login 2026',
        'slug' => 'popda-login-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($user, ['access_role' => Event::AccessRoleResponsible]);

    $response = $this->withSession([
        'url.intended' => route('event.public.show', ['slug' => $event->slug]),
    ])->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('tenant_event_id', $event->id);
});

test('contingent users logging in from a public event page enter registration management', function () {
    $user = User::factory()->create();
    Role::firstOrCreate(['name' => 'kontingen', 'guard_name' => 'web']);
    $user->assignRole('kontingen');
    $event = Event::create([
        'name' => 'POPDA Kontingen 2026',
        'slug' => 'popda-kontingen-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Login',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Login',
        'phone' => '081234567890',
    ]);

    $response = $this->withSession([
        'url.intended' => route('event.public.show', ['slug' => $event->slug]),
    ])->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('kontingen.registrasi'));
    $response->assertSessionHas('tenant_event_id', $event->id);
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register contingent without manual password and queue their credentials email', function () {
    Mail::fake();

    $response = $this->post('/register', [
        'name' => 'Sensei Budi Santoso',
        'email' => 'official@perkemi.org',
        'contingent_name' => 'Dojo Surabaya Sakti',
        'city' => 'Kota Surabaya',
        'manager_name' => 'Sensei Budi Santoso',
        'phone' => '081234567890',
        'address' => 'Jl. Pemuda No 1 Surabaya',
    ]);

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('status');

    $user = User::where('email', 'official@perkemi.org')->first();
    expect($user)->not->toBeNull();
    expect($user->hasRole('kontingen'))->toBeTrue();

    // Verify contingent record
    $contingent = Contingent::where('user_id', $user->id)->first();
    expect($contingent)->not->toBeNull();
    expect($contingent->name)->toBe('Dojo Surabaya Sakti');
    expect($contingent->manager_name)->toBe('Sensei Budi Santoso');

    Mail::assertQueued(ContingentAccountCreatedMail::class, function (ContingentAccountCreatedMail $mail) use ($user) {
        return $mail->hasTo($user->email) && $mail->queue === 'emails';
    });
});

test('email preview screen can be rendered', function () {
    $response = $this->get('/preview-email');

    $response->assertStatus(200);
    $response->assertSee('SMART-PERKEMI');
    $response->assertSee('Kredensial Login Anda');
});
