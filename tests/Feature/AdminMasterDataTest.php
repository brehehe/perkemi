<?php

use App\Enums\ContingentStatus;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Official;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin master contingent index can be rendered', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurnas Shorinji Kempo 2026',
        'slug' => 'kejurnas-shorinji-kempo-2026',
        'city' => 'Kota Surabaya',
        'venue' => 'GOR Pancasila',
        'start_date' => '2026-10-24',
        'end_date' => '2026-10-26',
        'fee_per_athlete' => 150000,
        'status' => 'open_registration',
        'is_active' => true,
    ]);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Dojo Garuda Sakti Surabaya',
        'city' => 'Kota Surabaya',
        'manager_name' => 'Sensei Hendra',
        'phone' => '08123456789',
        'status' => ContingentStatus::Pending,
    ]);

    $response = $this->actingAs($user)->get('/admin/master/contingent');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Master/Contingent/Index')
        ->has('contingents.data', 1)
        ->has('stats')
        ->where('stats.total_contingents', 1)
        ->where('stats.pending_contingents', 1)
        ->has('filters')
    );
});

test('admin can assign a responsible user to a contingent', function () {
    $admin = User::factory()->create();
    $responsible = User::factory()->create();
    $contingent = Contingent::create([
        'user_id' => $admin->id, 'name' => 'Dojo Awal', 'city' => 'Surabaya',
        'manager_name' => 'Sensei Awal', 'phone' => '08123456789',
        'status' => ContingentStatus::Pending,
    ]);

    $this->actingAs($admin)->get('/admin/master/contingent')
        ->assertInertia(fn (Assert $page) => $page->component('Admin/Master/Contingent/Index')
            ->has('users', 2));

    $this->actingAs($admin)->post('/admin/master/contingent', [
        'name' => 'Dojo Baru', 'city' => 'Malang', 'manager_name' => 'Sensei Baru',
        'phone' => '08123456780', 'status' => 'pending', 'user_id' => $responsible->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect(Contingent::where('name', 'Dojo Baru')->sole()->user_id)->toBe($responsible->id);

    $this->actingAs($admin)->put("/admin/master/contingent/{$contingent->id}", [
        'name' => 'Dojo Awal', 'city' => 'Surabaya', 'manager_name' => 'Sensei Awal',
        'phone' => '08123456789', 'status' => 'pending', 'user_id' => $responsible->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($contingent->refresh()->user_id)->toBe($responsible->id);
});

test('admin can verify a contingent', function () {
    $user = User::factory()->create();

    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Rajawali Malang',
        'city' => 'Kabupaten Malang',
        'manager_name' => 'Sensei Agus',
        'phone' => '08198765432',
        'status' => ContingentStatus::Pending,
    ]);

    $response = $this->actingAs($user)->post("/admin/master/contingent/{$contingent->id}/verify");

    $response->assertRedirect();
    $this->assertDatabaseHas('contingents', [
        'id' => $contingent->id,
        'status' => ContingentStatus::Verified->value,
    ]);
});

test('admin master athlete index can be rendered with kyu/dan filter', function () {
    $user = User::factory()->create();

    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Elang Sakti',
        'city' => 'Sidoarjo',
        'manager_name' => 'Sensei Joko',
        'phone' => '08122334455',
        'status' => ContingentStatus::Verified,
    ]);

    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Satria Pratama',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
        'weight' => 65.5,
        'height' => 172.0,
        'birth_date' => '2004-05-12',
    ]);

    $response = $this->actingAs($user)->get('/admin/master/athlete');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Master/Athlete/Index')
        ->has('athletes.data', 1)
        ->has('stats')
        ->where('stats.total_athletes', 1)
        ->where('stats.male_athletes', 1)
        ->has('contingentsList')
        ->has('kyuDanList')
    );
});

test('admin can create athlete via post', function () {
    $user = User::factory()->create();

    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Harimau Putih',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Bambang',
        'phone' => '08133445566',
        'status' => ContingentStatus::Verified,
    ]);

    $payload = [
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Arya Wijaya',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 2',
        'weight' => 58.0,
        'height' => 168.0,
        'birth_date' => '2005-08-20',
    ];

    $response = $this->actingAs($user)->post('/admin/master/athlete', $payload);

    $response->assertRedirect();
    $this->assertDatabaseHas('athletes', [
        'name' => 'Kenshi Arya Wijaya',
        'kyu_dan' => 'Kyu 2',
    ]);
});

test('admin master user index can be rendered and create user with role', function () {
    $admin = User::factory()->create();
    $role = Role::create(['name' => 'Wasit', 'guard_name' => 'web']);

    $response = $this->actingAs($admin)->get('/admin/master/user');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Master/User/Index')
        ->has('users.data')
        ->has('stats')
        ->has('rolesList')
    );

    $payload = [
        'name' => 'Sensei Wasit Nasional',
        'email' => 'wasit.nasional@smart-perkemi.id',
        'password' => 'Password123!',
        'role' => 'Wasit',
    ];

    $createResponse = $this->actingAs($admin)->post('/admin/master/user', $payload);
    $createResponse->assertRedirect();

    $this->assertDatabaseHas('users', [
        'email' => 'wasit.nasional@smart-perkemi.id',
    ]);

    $newUser = User::where('email', 'wasit.nasional@smart-perkemi.id')->first();
    expect($newUser->hasRole('Wasit'))->toBeTrue();
});

test('admin master official index can be rendered with role and contingent filters', function () {
    $user = User::factory()->create();

    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Macan Putih Kediri',
        'city' => 'Kota Kediri',
        'manager_name' => 'Sensei Hartono',
        'phone' => '08123450987',
        'status' => ContingentStatus::Verified,
    ]);

    $official = Official::create([
        'contingent_id' => $contingent->id,
        'name' => 'Sensei Hartono, S.H.',
        'role' => 'Manajer Tim',
        'gender' => 'male',
        'phone' => '08123450987',
        'email' => 'hartono@macanputih.id',
    ]);

    $response = $this->actingAs($user)->get('/admin/master/official');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Master/Official/Index')
        ->has('officials.data', 1)
        ->has('stats')
        ->where('stats.total_officials', 1)
        ->where('stats.total_managers', 1)
        ->has('contingentsList')
        ->has('rolesList')
    );
});

test('admin can create official via post', function () {
    $user = User::factory()->create();

    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Banteng Merah',
        'city' => 'Kota Malang',
        'manager_name' => 'Sensei Joko',
        'phone' => '08122334400',
        'status' => ContingentStatus::Verified,
    ]);

    $payload = [
        'contingent_id' => $contingent->id,
        'name' => 'Simpai Eko Prasetyo (II Dan)',
        'role' => 'Pelatih',
        'gender' => 'male',
        'phone' => '08129876543',
        'email' => 'eko.prasetyo@kempo.id',
        'notes' => 'Pelatih nomor Randori',
    ];

    $response = $this->actingAs($user)->post('/admin/master/official', $payload);

    $response->assertRedirect();
    $this->assertDatabaseHas('officials', [
        'name' => 'Simpai Eko Prasetyo (II Dan)',
        'role' => 'Pelatih',
        'contingent_id' => $contingent->id,
    ]);
});

test('admin can update and delete official', function () {
    $user = User::factory()->create();

    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Garuda',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Budi Santoso',
        'phone' => '081234567890',
        'status' => ContingentStatus::Verified,
    ]);

    $official = Official::create([
        'contingent_id' => $contingent->id,
        'name' => 'dr. Dian Pratama',
        'role' => 'Tim Medis',
        'gender' => 'female',
    ]);

    $updatePayload = [
        'contingent_id' => $contingent->id,
        'name' => 'dr. Dian Pratama, Sp.KO',
        'role' => 'Tim Medis',
        'gender' => 'female',
        'phone' => '081200001111',
    ];

    $updateResponse = $this->actingAs($user)->put("/admin/master/official/{$official->id}", $updatePayload);
    $updateResponse->assertRedirect();

    $this->assertDatabaseHas('officials', [
        'id' => $official->id,
        'name' => 'dr. Dian Pratama, Sp.KO',
    ]);

    $deleteResponse = $this->actingAs($user)->delete("/admin/master/official/{$official->id}");
    $deleteResponse->assertRedirect();

    $this->assertSoftDeleted('officials', [
        'id' => $official->id,
    ]);
});

test('contingent has many athletes and many officials', function () {
    $user = User::factory()->create();

    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Ksatria Perkasa',
        'city' => 'Kabupaten Gresik',
        'manager_name' => 'Sensei Ksatria',
        'phone' => '081333444555',
        'status' => ContingentStatus::Verified,
    ]);

    Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Atlet A',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
    ]);
    Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Atlet B',
        'gender' => 'female',
        'kyu_dan' => 'Kyu 2',
    ]);

    Official::create([
        'contingent_id' => $contingent->id,
        'name' => 'Manajer A',
        'role' => 'Manajer Tim',
        'gender' => 'male',
    ]);
    Official::create([
        'contingent_id' => $contingent->id,
        'name' => 'Pelatih B',
        'role' => 'Pelatih Kepala',
        'gender' => 'male',
    ]);

    expect($contingent->athletes()->count())->toBe(2);
    expect($contingent->officials()->count())->toBe(2);
});
