<?php

use App\Mail\ContingentAccountCreatedMail;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\Referee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

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

test('users can authenticate using an Indonesian phone number', function () {
    $user = User::factory()->create(['phone' => '6281234567890']);

    $response = $this->post('/login', [
        'email' => '0812-3456-7890',
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('home'));
});

test('legacy referee phone login is linked back to the user account', function () {
    $user = User::factory()->create(['phone' => null]);
    Referee::create([
        'user_id' => $user->id,
        'name' => 'Wasit Login Nomor HP',
        'gender' => 'male',
        'phone' => '+62 813-5555-6677',
        'email' => $user->email,
        'is_active' => true,
    ]);

    $this->post('/login', [
        'email' => '081355556677',
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->phone)->toBe('6281355556677');
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
    expect($user->phone)->toBe('6281234567890');

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

test('registration rejects duplicate nik perkemi', function () {
    User::factory()->create([
        'nik_perkemi' => 'PERKEMI-123456',
    ]);

    $response = $this->from('/register')->post('/register', [
        'name' => 'Kenshi Baru',
        'nik_perkemi' => 'PERKEMI-123456',
        'email' => 'kenshi.baru@perkemi.org',
        'contingent_name' => 'Dojo Baru',
        'city' => 'Kota Surabaya',
        'manager_name' => 'Sensei Baru',
        'phone' => '081234567891',
        'address' => 'Jl. Pemuda No 2',
    ]);

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors(['nik_perkemi' => 'NIK PERKEMI sudah terdaftar dalam sistem.']);
});

test('panitera can authenticate using 6 digit court access code token', function () {
    $event = Event::create([
        'name' => 'Kejuaraan Token Panitera 2026',
        'slug' => 'kejuaraan-token-panitera-2026',
        'venue' => 'GOR Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Tatami 1',
        'location' => 'Arena Utama',
        'is_active' => true,
        'access_code' => '654321',
    ]);

    $response = $this->post('/login/panitera-token', [
        'token' => '654321',
    ]);

    $this->assertAuthenticated();
    $user = auth()->user();
    expect($user->hasRole('Panitera'))->toBeTrue();
    $response->assertRedirect(route('admin.panitera.scoring.index', [
        'event_id' => $event->id,
        'court_id' => $court->id,
    ]));
});

test('panitera login rejects invalid token', function () {
    $response = $this->from('/login')->post('/login/panitera-token', [
        'token' => '000000',
    ]);

    $this->assertGuest();
    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('token');
});

test('referee can access court check-in without existing user account via signed qr', function () {
    $event = Event::create([
        'name' => 'Event Guest Wasit 2026',
        'slug' => 'event-guest-wasit-2026',
        'venue' => 'GOR Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Tatami 1',
        'location' => 'Arena Utama',
        'is_active' => true,
    ]);

    $signedUrl = URL::temporarySignedRoute('wasit.check-in.court', now()->addHour(), [
        'event' => $event,
        'eventCourt' => $court,
        'role' => 'corner_1',
    ]);

    $response = $this->get($signedUrl);

    $response->assertOk();
    $this->assertAuthenticated();
    $user = auth()->user();
    expect($user->hasRole('Wasit'))->toBeTrue();
});

test('panitera user can access dashboard and is redirected to scoring without 404', function () {
    $role = Role::firstOrCreate(['name' => 'Panitera']);
    $user = User::factory()->create();
    $user->roles()->syncWithoutDetaching([$role->id]);

    $event = Event::create([
        'name' => 'Kejurda Panitera Access 2026',
        'slug' => 'kejurda-panitera-access-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get('/admin/dashboard');

    $response->assertRedirect(route('admin.panitera.scoring.index'));

    $scoringResponse = $this->actingAs($user)->get(route('admin.panitera.scoring.index'));
    $scoringResponse->assertOk();
});
