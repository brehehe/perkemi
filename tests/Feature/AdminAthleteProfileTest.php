<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Role;
use App\Models\TournamentResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('athlete identity, event history, and rank changes are saved', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Profil 2026', 'slug' => 'profil-2026',
        'venue' => 'GOR A', 'city' => 'Jakarta',
        'start_date' => '2026-10-01', 'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);
    $contingent = Contingent::create([
        'event_id' => $event->id, 'user_id' => $user->id, 'name' => 'Dojo Profil',
        'city' => 'Jakarta', 'manager_name' => 'Sensei Profil', 'phone' => '081234567890',
    ]);
    $base = 'http://profil-2026.localhost/admin/master/athlete';
    $form = [
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Profil',
        'nik' => '1234567890123456',
        'kenshi_number' => 'KNS-2026-01',
        'gender' => 'male',
        'birth_place' => 'Jakarta',
        'birth_date' => '2005-01-15',
        'blood_type' => 'O',
        'home_address' => 'Jalan Kempo 1',
        'dojo_name' => 'Dojo Profil',
        'kyu_dan' => 'Kyu 2',
    ];

    $this->actingAs($user)->post($base, $form)->assertRedirect();
    $athlete = Athlete::query()->sole();
    $this->assertDatabaseHas('athlete_rank_histories', [
        'athlete_id' => $athlete->id,
        'previous_rank' => null,
        'new_rank' => 'Kyu 2',
    ]);
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-PROFIL-2026',
    ]);

    $this->actingAs($user)->put("{$base}/{$athlete->id}", [
        ...$form,
        'kyu_dan' => 'Kyu 1',
    ])->assertRedirect();
    $this->assertDatabaseHas('athlete_rank_histories', [
        'athlete_id' => $athlete->id,
        'previous_rank' => 'Kyu 2',
        'new_rank' => 'Kyu 1',
    ]);

    $this->actingAs($user)->get("{$base}/{$athlete->id}/detail")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Athlete/Detail')
            ->where('athlete.nik', '1234567890123456')
            ->has('rankHistory', 2)
            ->has('eventHistory', 1)
            ->where('eventHistory.0.id', $event->id));

    Storage::fake(config('filesystems.default'));
    $this->actingAs($user)->post("{$base}/{$athlete->id}/photo", [
        'profile_photo' => UploadedFile::fake()->image('kenshi.jpg'),
    ])->assertRedirect();
    Storage::assertExists($athlete->fresh()->profile_photo_path);
    $this->actingAs($user)->get("{$base}/{$athlete->id}/photo")->assertOk();
});

test('identity links event and medal history across events for admins while tenant staff stay scoped', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $staff = User::factory()->create();
    $firstEvent = Event::create([
        'name' => 'Kejurda Pertama', 'slug' => 'riwayat-pertama',
        'venue' => 'GOR A', 'city' => 'Jakarta',
        'start_date' => '2025-10-01', 'end_date' => '2025-10-03',
    ]);
    $secondEvent = Event::create([
        'name' => 'Kejurda Kedua', 'slug' => 'riwayat-kedua',
        'venue' => 'GOR B', 'city' => 'Bandung',
        'start_date' => '2026-10-01', 'end_date' => '2026-10-03',
    ]);
    $secondEvent->users()->attach($staff, ['access_role' => 'staff']);
    $firstContingent = Contingent::create([
        'event_id' => $firstEvent->id, 'user_id' => $admin->id, 'name' => 'Dojo Pertama',
        'city' => 'Jakarta', 'manager_name' => 'Sensei A', 'phone' => '081234567890',
    ]);
    $secondContingent = Contingent::create([
        'event_id' => $secondEvent->id, 'user_id' => $staff->id, 'name' => 'Dojo Kedua',
        'city' => 'Bandung', 'manager_name' => 'Sensei B', 'phone' => '081234567891',
    ]);
    $firstAthlete = Athlete::create([
        'contingent_id' => $firstContingent->id, 'name' => 'Kenshi Identitas', 'nik' => '1234567890123456',
    ]);
    $secondAthlete = Athlete::create([
        'contingent_id' => $secondContingent->id, 'name' => 'Kenshi Identitas', 'nik' => '1234567890123456',
    ]);
    Registration::create([
        'event_id' => $firstEvent->id, 'contingent_id' => $firstContingent->id,
        'registration_number' => 'REG-RIWAYAT-1',
    ]);
    Registration::create([
        'event_id' => $secondEvent->id, 'contingent_id' => $secondContingent->id,
        'registration_number' => 'REG-RIWAYAT-2',
    ]);
    TournamentResult::create([
        'event_id' => $firstEvent->id, 'contingent_id' => $firstContingent->id,
        'athlete_id' => $firstAthlete->id, 'contingent_name' => 'Dojo Pertama',
        'rank' => 1, 'match_category' => 'Randori',
    ]);

    $this->actingAs($admin)->get("/admin/master/athlete/{$secondAthlete->id}/detail")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Athlete/Detail')
            ->has('eventHistory', 2)
            ->where('eventHistory.1.results.0.rank', 'Emas (Juara 1)'));
    $this->actingAs($staff)
        ->get("http://riwayat-kedua.localhost/admin/master/athlete/{$secondAthlete->id}/detail")
        ->assertInertia(fn (Assert $page) => $page
            ->has('eventHistory', 1)
            ->where('historyScopedToEvent', true));
});
