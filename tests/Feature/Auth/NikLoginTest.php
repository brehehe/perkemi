<?php

use App\Models\Event;
use App\Models\Referee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('wasit can login using only nik', function () {
    $role = Role::findOrCreate('Wasit', 'web');

    $event = Event::query()->create([
        'name' => 'Kejurda Test',
        'slug' => 'kejurda-test',
        'city' => 'Surabaya',
        'venue' => 'GOR Sudirman',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $event = \App\Models\Event::query()->create([
        'name' => 'Kejurda Test',
        'slug' => 'kejurda-test',
        'city' => 'Surabaya',
        'venue' => 'GOR Sudirman',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $user = User::factory()->create([
        'name' => 'dr. Ihyan Amri',
        'email' => 'dr.ihyan.amri@smart-perkemi.id',
        'nik_perkemi' => '74.1.06.01.01.001',
    ]);
    $user->assignRole($role);

    $referee = Referee::query()->create([
        'user_id' => $user->id,
        'name' => $user->name,
        'dan_grade' => 'IV DAN',
        'license_number' => '74.1.06.01.01.001',
        'certification_level' => 'Wasit Daerah',
        'region' => 'Kota Surabaya',
        'email' => $user->email,
        'is_active' => true,
    ]);

    $event->referees()->attach($referee->id);

    $response = $this->post('/login/nik', [
        'nik' => '74.1.06.01.01.001',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('wasit.portal', ['event_id' => $event->id]));

    $portalResponse = $this->get(route('wasit.portal', ['event_id' => $event->id]));
    $portalResponse->assertOk();
});

test('referee with real popda staff nik 90.3.13.01.20.001 logs in without 403', function () {
    $role = Role::findOrCreate('Wasit', 'web');

    $event = Event::query()->create([
        'name' => 'POPDA XV JATIM 2026',
        'slug' => 'popda-xv-jatim-2026',
        'city' => 'Ngawi',
        'venue' => 'SMK Negeri 1 Geneng',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $user = User::factory()->create([
        'name' => 'Arya Setyanto Wicaksono',
        'email' => 'arya.setyanto.wicaksono@smart-perkemi.id',
        'nik_perkemi' => '90.3.13.01.20.001',
    ]);
    $user->assignRole($role);

    $referee = Referee::query()->create([
        'user_id' => $user->id,
        'name' => $user->name,
        'dan_grade' => 'IV DAN',
        'license_number' => '90.3.13.01.20.001',
        'certification_level' => 'Wasit Nasional B',
        'region' => 'Kota Surabaya',
        'email' => $user->email,
        'is_active' => true,
    ]);

    $event->referees()->attach($referee->id);

    $response = $this->post('/login/nik', [
        'nik' => '90.3.13.01.20.001',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('wasit.portal', ['event_id' => $event->id]));

    $portalResponse = $this->get(route('wasit.portal', ['event_id' => $event->id]));
    $portalResponse->assertOk();
});

test('referee with real popda staff nik 90.3.13.01.20.001 logs in without 403', function () {
    $role = Role::findOrCreate('Wasit', 'web');

    $event = \App\Models\Event::query()->create([
        'name' => 'POPDA XV JATIM 2026',
        'slug' => 'popda-xv-jatim-2026',
        'city' => 'Ngawi',
        'venue' => 'SMK Negeri 1 Geneng',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $user = User::factory()->create([
        'name' => 'Arya Setyanto Wicaksono',
        'email' => 'arya.setyanto.wicaksono@smart-perkemi.id',
        'nik_perkemi' => '90.3.13.01.20.001',
    ]);
    $user->assignRole($role);

    $referee = Referee::query()->create([
        'user_id' => $user->id,
        'name' => $user->name,
        'dan_grade' => 'IV DAN',
        'license_number' => '90.3.13.01.20.001',
        'certification_level' => 'Wasit Nasional B',
        'region' => 'Kota Surabaya',
        'email' => $user->email,
        'is_active' => true,
    ]);

    $event->referees()->attach($referee->id);

    $response = $this->post('/login/nik', [
        'nik' => '90.3.13.01.20.001',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('wasit.portal', ['event_id' => $event->id]));

    $portalResponse = $this->get(route('wasit.portal', ['event_id' => $event->id]));
    $portalResponse->assertOk();
});

test('unregistered nik is rejected', function () {
    $response = $this->post('/login/nik', [
        'nik' => '99.9.99.99.99.999',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors('nik');
});

test('user without official technical role cannot login using nik', function () {
    $user = User::factory()->create([
        'name' => 'Regular User',
        'email' => 'regular@example.com',
        'nik_perkemi' => '11.2.33.44.55.666',
    ]);

    $response = $this->post('/login/nik', [
        'nik' => '11.2.33.44.55.666',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors('nik');
});
