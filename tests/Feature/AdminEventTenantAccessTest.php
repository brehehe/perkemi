<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Official;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('an event user can access only their related event through its tenant subdomain', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Tenant 2026',
        'slug' => 'kejurda-tenant-2026',
        'tenant_subdomain' => 'kejurda-tenant-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Lain 2026',
        'slug' => 'kejurda-lain-2026',
        'tenant_subdomain' => 'kejurda-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);

    $event->users()->attach($eventUser, ['access_role' => 'staff']);

    $this->actingAs($eventUser)
        ->get('http://kejurda-tenant-2026.localhost/admin/master/event/detail')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Event/Detail')
            ->where('event.id', $event->id)
            ->where('event.tenant_subdomain', 'kejurda-tenant-2026')
            ->where('tenant.event.id', $event->id)
            ->where('allEvents.0.id', $event->id)
        );

    $this->actingAs($eventUser)
        ->get('http://kejurda-tenant-2026.localhost/admin/master/event')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Event/Index')
            ->has('events.data', 1)
            ->where('events.data.0.id', $event->id)
            ->where('stats.total_events', 1)
        );

    $this->actingAs($eventUser)
        ->get("http://kejurda-tenant-2026.localhost/admin/master/event/{$otherEvent->id}/detail")
        ->assertNotFound();
});

test('a user without an event relationship cannot access its tenant subdomain', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    Event::create([
        'name' => 'Kejurda Tertutup 2026',
        'slug' => 'kejurda-tertutup-2026',
        'tenant_subdomain' => 'kejurda-tertutup-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $this->actingAs(User::factory()->create())
        ->get('http://kejurda-tertutup-2026.localhost/admin/master/event/detail')
        ->assertForbidden();
});

test('a responsible event user receives their event-specific access role', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $responsibleUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Penanggung Jawab 2026',
        'slug' => 'kejurda-penanggung-jawab-2026',
        'tenant_subdomain' => 'kejurda-penanggung-jawab-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $event->users()->attach($responsibleUser, [
        'access_role' => Event::AccessRoleResponsible,
    ]);

    $this->actingAs($responsibleUser)
        ->get('http://kejurda-penanggung-jawab-2026.localhost/admin/master/event/detail')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Event/Detail')
            ->where('event.id', $event->id)
            ->where('tenant.event.id', $event->id)
            ->where('tenant.event.access_role', Event::AccessRoleResponsible)
        );
});

test('a responsible event user cannot access participant master data', function (string $path) {
    config()->set('app.tenant_base_domain', 'localhost');

    $responsibleUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Akses Terbatas 2026',
        'slug' => 'kejurda-akses-terbatas-2026',
        'tenant_subdomain' => 'kejurda-akses-terbatas-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $event->users()->attach($responsibleUser, [
        'access_role' => Event::AccessRoleResponsible,
    ]);

    $this->actingAs($responsibleUser)
        ->get("http://kejurda-akses-terbatas-2026.localhost{$path}")
        ->assertForbidden();
})->with([
    'data kontingen' => '/admin/master/contingent',
    'data atlet dan kenshi' => '/admin/master/athlete',
    'data official' => '/admin/master/official',
]);

test('a tenant guest is redirected to login on the same subdomain', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    Event::create([
        'name' => 'Kejurda Login 2026',
        'slug' => 'kejurda-login-2026',
        'tenant_subdomain' => 'kejurda-login-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $this->get('http://kejurda-login-2026.localhost/admin/master/event/detail')
        ->assertRedirect('http://kejurda-login-2026.localhost/login');
});

test('a tenant user only sees registrations belonging to their event', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Registrasi 2026',
        'slug' => 'kejurda-registrasi-2026',
        'tenant_subdomain' => 'kejurda-registrasi-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Registrasi Lain 2026',
        'slug' => 'kejurda-registrasi-lain-2026',
        'tenant_subdomain' => 'kejurda-registrasi-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);

    $event->users()->attach($eventUser, ['access_role' => 'staff']);
    $tenantContingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Tenant',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Tenant',
        'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $otherEvent->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Lain',
        'city' => 'Malang',
        'manager_name' => 'Sensei Lain',
        'phone' => '081234567891',
    ]);
    $tenantRegistration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $tenantContingent->id,
        'registration_number' => 'REG-TENANT-001',
        'status' => 'pending',
    ]);
    Registration::create([
        'event_id' => $otherEvent->id,
        'contingent_id' => $otherContingent->id,
        'registration_number' => 'REG-LAIN-001',
        'status' => 'pending',
    ]);

    $this->actingAs($eventUser)
        ->get('http://kejurda-registrasi-2026.localhost/admin/pendaftaran/registrasi')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registration/Index')
            ->has('registrations.data', 1)
            ->where('registrations.data.0.id', $tenantRegistration->id)
            ->where('stats.total_registrations', 1)
        );
});

test('registration and verification lists stay scoped to the selected event in admin and event modes', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $firstEvent = Event::create([
        'name' => 'Event Pertama', 'slug' => 'event-pertama', 'venue' => 'GOR A', 'city' => 'Surabaya',
        'start_date' => '2026-10-01', 'end_date' => '2026-10-03', 'is_active' => true,
    ]);
    $secondEvent = Event::create([
        'name' => 'Event Kedua', 'slug' => 'event-kedua', 'venue' => 'GOR B', 'city' => 'Malang',
        'start_date' => '2026-11-01', 'end_date' => '2026-11-03', 'is_active' => false,
    ]);
    $firstContingent = Contingent::create([
        'event_id' => $firstEvent->id, 'user_id' => $admin->id, 'name' => 'Dojo Pertama',
        'city' => 'Surabaya', 'manager_name' => 'Sensei Pertama', 'phone' => '081234567890',
    ]);
    $secondContingent = Contingent::create([
        'event_id' => $secondEvent->id, 'user_id' => $admin->id, 'name' => 'Dojo Kedua',
        'city' => 'Malang', 'manager_name' => 'Sensei Kedua', 'phone' => '081234567891',
    ]);
    $firstRegistration = Registration::create([
        'event_id' => $firstEvent->id, 'contingent_id' => $firstContingent->id, 'registration_number' => 'REG-EVENT-A',
    ]);
    $secondRegistration = Registration::create([
        'event_id' => $secondEvent->id, 'contingent_id' => $secondContingent->id, 'registration_number' => 'REG-EVENT-B',
    ]);
    $firstAthlete = Athlete::create(['contingent_id' => $firstContingent->id, 'name' => 'Atlet Pertama', 'gender' => 'male']);
    $secondAthlete = Athlete::create(['contingent_id' => $secondContingent->id, 'name' => 'Atlet Kedua', 'gender' => 'female']);
    $firstCategory = EventMatchCategory::create([
        'event_id' => $firstEvent->id, 'name' => 'Embu Pertama', 'type' => 'embu', 'gender' => 'mixed',
        'capacity' => 16, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);
    $secondCategory = EventMatchCategory::create([
        'event_id' => $secondEvent->id, 'name' => 'Embu Kedua', 'type' => 'embu', 'gender' => 'mixed',
        'capacity' => 16, 'max_athletes_per_team' => 2, 'is_active' => true,
    ]);

    $this->actingAs($admin)->get('/admin/pendaftaran/registrasi')
        ->assertInertia(fn (Assert $page) => $page->where('activeEvent.id', $firstEvent->id)
            ->has('registrations.data', 1)->where('registrations.data.0.id', $firstRegistration->id)
            ->where('stats.total_registrations', 1)->has('eventOptions', 2));
    $this->actingAs($admin)->get("/admin/pendaftaran/registrasi?event_id={$secondEvent->id}")
        ->assertInertia(fn (Assert $page) => $page->where('activeEvent.id', $secondEvent->id)
            ->has('registrations.data', 1)->where('registrations.data.0.id', $secondRegistration->id)
            ->where('stats.total_registrations', 1));
    $this->actingAs($admin)->get("/admin/pendaftaran/verifikasi?event_id={$secondEvent->id}")
        ->assertInertia(fn (Assert $page) => $page->where('activeEvent.id', $secondEvent->id)
            ->has('athletes.data', 1)->where('athletes.data.0.id', $secondAthlete->id)
            ->has('contingents', 1)->where('contingents.0.id', $secondContingent->id)
            ->has('matchCategories', 1)->where('matchCategories.0.id', $secondCategory->id)
            ->where('stats.total_kenshi', 1));
    $this->actingAs($admin)->post("/admin/pendaftaran/verifikasi/{$secondAthlete->id}/match-category", [
        'event_id' => $secondEvent->id,
        'event_match_category_id' => $secondCategory->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('athlete_match_category_entries', [
        'event_id' => $secondEvent->id,
        'athlete_id' => $secondAthlete->id,
        'event_match_category_id' => $secondCategory->id,
    ]);

    $this->withSession(['tenant_event_id' => $firstEvent->id, 'tenant_event_slug' => $firstEvent->slug])
        ->actingAs($admin)->get("/admin/pendaftaran/registrasi?event_id={$secondEvent->id}")
        ->assertInertia(fn (Assert $page) => $page->where('activeEvent.id', $firstEvent->id)
            ->has('registrations.data', 1)->where('registrations.data.0.id', $firstRegistration->id)
            ->has('eventOptions', 1));
    $this->withSession(['tenant_event_id' => $firstEvent->id, 'tenant_event_slug' => $firstEvent->slug])
        ->actingAs($admin)->get("/admin/pendaftaran/verifikasi?event_id={$secondEvent->id}")
        ->assertInertia(fn (Assert $page) => $page->where('activeEvent.id', $firstEvent->id)
            ->has('athletes.data', 1)->where('athletes.data.0.id', $firstAthlete->id)
            ->has('matchCategories', 1)->where('matchCategories.0.id', $firstCategory->id)
            ->where('stats.total_kenshi', 1));
});

test('a tenant dashboard only aggregates data from its event', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Dashboard 2026',
        'slug' => 'kejurda-dashboard-2026',
        'tenant_subdomain' => 'kejurda-dashboard-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Dashboard Lain 2026',
        'slug' => 'kejurda-dashboard-lain-2026',
        'tenant_subdomain' => 'kejurda-dashboard-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);

    $tenantContingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Dashboard Tenant',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Tenant',
        'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $otherEvent->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Dashboard Lain',
        'city' => 'Malang',
        'manager_name' => 'Sensei Lain',
        'phone' => '081234567891',
    ]);
    Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Dashboard Tenant',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
    ]);
    Athlete::create([
        'contingent_id' => $otherContingent->id,
        'name' => 'Kenshi Dashboard Lain',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
    ]);
    $tenantRegistration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $tenantContingent->id,
        'registration_number' => 'REG-DASHBOARD-TENANT',
        'status' => 'verified',
        'final_amount' => 500000,
        'payment_status' => 'verified',
        'payment_amount' => 500000,
    ]);
    Registration::create([
        'event_id' => $otherEvent->id,
        'contingent_id' => $otherContingent->id,
        'registration_number' => 'REG-DASHBOARD-LAIN',
        'status' => 'pending',
        'final_amount' => 750000,
    ]);

    $this->actingAs($eventUser)
        ->get('http://kejurda-dashboard-2026.localhost/admin/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('stats.total_athletes', 1)
            ->where('stats.total_contingents', 1)
            ->where('stats.total_registrations', 1)
            ->where('stats.verified_count', 1)
            ->where('stats.total_amount', 500000)
            ->has('latestContingents', 1)
            ->has('latestRegistrations.data', 1)
            ->where('latestRegistrations.data.0.id', $tenantRegistration->id)
        );
});

test('a tenant viewer cannot change event configuration or open global master data', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $viewer = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Viewer 2026',
        'slug' => 'kejurda-viewer-2026',
        'tenant_subdomain' => 'kejurda-viewer-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $event->users()->attach($viewer, ['access_role' => 'viewer']);

    $this->actingAs($viewer)
        ->put("http://kejurda-viewer-2026.localhost/admin/master/event/{$event->id}/general", [])
        ->assertForbidden();

    $this->actingAs($viewer)
        ->get('http://kejurda-viewer-2026.localhost/admin/master/kyu')
        ->assertForbidden();
});

test('a tenant user only manages athletes and officials from their event contingents', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $eventUser = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Peserta 2026',
        'slug' => 'kejurda-peserta-2026',
        'tenant_subdomain' => 'kejurda-peserta-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Peserta Lain 2026',
        'slug' => 'kejurda-peserta-lain-2026',
        'tenant_subdomain' => 'kejurda-peserta-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($eventUser, ['access_role' => 'staff']);

    $tenantContingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Tenant Peserta',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Tenant',
        'phone' => '081234567890',
    ]);
    $otherContingent = Contingent::create([
        'event_id' => $otherEvent->id,
        'user_id' => $eventUser->id,
        'name' => 'Dojo Lain Peserta',
        'city' => 'Malang',
        'manager_name' => 'Sensei Lain',
        'phone' => '081234567891',
    ]);

    $tenantAthlete = Athlete::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Kenshi Tenant',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
    ]);
    Athlete::create([
        'contingent_id' => $otherContingent->id,
        'name' => 'Kenshi Lain',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 1',
    ]);
    $tenantOfficial = Official::create([
        'contingent_id' => $tenantContingent->id,
        'name' => 'Official Tenant',
        'role' => 'Manajer Tim',
        'gender' => 'male',
    ]);
    Official::create([
        'contingent_id' => $otherContingent->id,
        'name' => 'Official Lain',
        'role' => 'Manajer Tim',
        'gender' => 'male',
    ]);

    $this->actingAs($eventUser)
        ->get('http://kejurda-peserta-2026.localhost/admin/master/athlete')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Athlete/Index')
            ->has('athletes.data', 1)
            ->where('athletes.data.0.id', $tenantAthlete->id)
            ->has('contingentsList', 1)
        );

    $this->actingAs($eventUser)
        ->get('http://kejurda-peserta-2026.localhost/admin/master/official')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Official/Index')
            ->has('officials.data', 1)
            ->where('officials.data.0.id', $tenantOfficial->id)
            ->has('contingentsList', 1)
        );

    $this->actingAs($eventUser)
        ->post('http://kejurda-peserta-2026.localhost/admin/master/athlete', [
            'contingent_id' => $otherContingent->id,
            'name' => 'Kenshi Tidak Diizinkan',
            'gender' => 'male',
            'kyu_dan' => 'Kyu 2',
        ])
        ->assertNotFound();
});
