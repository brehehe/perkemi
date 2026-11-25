<?php

use App\Models\Event;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::findOrCreate('Super Admin');
    Role::findOrCreate('Admin');
});

test('an admin can enter mode event via id route and session is populated', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurprov Shorinji Kempo 2026',
        'slug' => 'kejurprov-shorinji-kempo-2026',
        'venue' => 'GOR Pajajaran',
        'city' => 'Bandung',
        'start_date' => '2026-10-10',
        'end_date' => '2026-10-12',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.event.enter', $event));

    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('tenant_event_id', $event->id);
    $response->assertSessionHas('tenant_event_slug', $event->slug);
});

test('an admin can exit mode event and session is cleared', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurprov Shorinji Kempo 2026',
        'slug' => 'kejurprov-shorinji-kempo-2026',
        'venue' => 'GOR Pajajaran',
        'city' => 'Bandung',
        'start_date' => '2026-10-10',
        'end_date' => '2026-10-12',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)
        ->withSession([
            'tenant_event_id' => $event->id,
            'tenant_event_slug' => $event->slug,
        ])
        ->post(route('admin.tenant.exit'));

    $response->assertRedirect(route('admin.master.event.index'));
    $response->assertSessionMissing('tenant_event_id');
});

test('a super admin can view all events on the event catalog page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $eventA = Event::create([
        'name' => 'Turnamen Pertama',
        'slug' => 'turnamen-pertama',
        'venue' => 'GOR A',
        'city' => 'Jakarta',
        'start_date' => '2026-05-01',
        'end_date' => '2026-05-03',
        'is_active' => true,
    ]);

    $eventB = Event::create([
        'name' => 'Turnamen Kedua',
        'slug' => 'turnamen-kedua',
        'venue' => 'GOR B',
        'city' => 'Surabaya',
        'start_date' => '2026-06-01',
        'end_date' => '2026-06-03',
        'is_active' => false,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.master.event.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Event/Index')
            ->has('events.data', 2)
        );
});

test('mode event accurately provides active event context to registration match groups page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'POPDASh Jatim 2026',
        'slug' => 'popda-jatim-2026',
        'venue' => 'GOR Madiun',
        'city' => 'Madiun',
        'start_date' => '2026-07-01',
        'end_date' => '2026-07-04',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->withSession(['tenant_event_id' => $event->id])
        ->get(route('admin.pendaftaran.nomor-pertandingan'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registration/MatchGroups')
            ->where('activeEvent.id', $event->id)
            ->where('activeEvent.name', $event->name)
        );
});

test('admin dashboard accurately recognizes mode event via tenant middleware', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'POPDASh Jatim 2026',
        'slug' => 'popda-jatim-2026',
        'venue' => 'GOR Madiun',
        'city' => 'Madiun',
        'start_date' => '2026-07-01',
        'end_date' => '2026-07-04',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->withSession(['tenant_event_id' => $event->id])
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('tenant.event.id', $event->id)
            ->where('activeEvent.id', $event->id)
        );
});

test('admin dashboard with event_id query param resolves tenant and stores session', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejuaraan Nasional 2026',
        'slug' => 'kejurnas-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-08-01',
        'end_date' => '2026-08-05',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.dashboard', ['event_id' => $event->id]));

    $response->assertOk();
    $response->assertSessionHas('tenant_event_id', $event->id);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->where('tenant.event.id', $event->id)
        ->where('activeEvent.id', $event->id)
    );
});

test('admin dashboard with event_id=all clears tenant session and displays global multi-event overview', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejuaraan Nasional 2026',
        'slug' => 'kejurnas-2026',
        'venue' => 'GOR Bulungan',
        'city' => 'Jakarta Selatan',
        'start_date' => '2026-08-01',
        'end_date' => '2026-08-05',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)
        ->withSession(['tenant_event_id' => $event->id])
        ->get(route('admin.dashboard', ['event_id' => 'all']));

    $response->assertOk();
    $response->assertSessionMissing('tenant_event_id');
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->where('tenant.event', null)
        ->where('activeEvent', null)
        ->has('eventOptions')
    );
});

test('operational role can switch event via enter route and redirect replaces old event_id in target', function () {
    Role::findOrCreate('Koordinator Lapangan');

    $user = User::factory()->create(['email' => 'daud.test@smart-perkemi.id']);
    $user->assignRole('Koordinator Lapangan');

    $eventA = Event::create([
        'name' => 'Kejurda Shorinji Kempo 2026',
        'slug' => 'kejurda-shorinji-kempo-2026',
        'venue' => 'GOR Kanjuruhan',
        'city' => 'Malang',
        'start_date' => '2026-10-10',
        'end_date' => '2026-10-12',
        'is_active' => true,
    ]);

    $eventB = Event::create([
        'name' => 'POPDA Shorinji Kempo 2026',
        'slug' => 'popda-shorinji-kempo-2026',
        'venue' => 'SMK Negeri 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);
    $eventB->fieldCoordinators()->create([
        'name' => 'Daud Test',
        'email' => 'daud.test@smart-perkemi.id',
        'phone' => '08123456789',
    ]);

    $response = $this->actingAs($user)
        ->get(route('admin.event.enter', [
            'event' => $eventB->id,
            'target' => '/admin/koordinator-court?event_id='.$eventA->id.'&view=grid',
        ]));

    $response->assertRedirect('/admin/koordinator-court?event_id='.$eventB->id.'&view=grid');
    $response->assertSessionHas('tenant_event_id', $eventB->id);
    $response->assertSessionHas('tenant_event_slug', $eventB->slug);
});

test('inertia middleware exposes tenant available_events with assignment labels and current flag', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Turnamen Terbuka 2026',
        'slug' => 'turnamen-terbuka-2026',
        'venue' => 'GOR Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-03',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->withSession(['tenant_event_id' => $event->id])
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tenant.available_events')
            ->where('tenant.available_events.0.id', $event->id)
            ->where('tenant.available_events.0.is_current', true)
            ->where('tenant.available_events.0.assignment_label', 'Administrator')
        );
});

test('mode event accurately retains active event context on admin report hub and stays in mode event', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');

    $event = Event::create([
        'name' => 'Kejurda Shorinji Kempo Malang 2026',
        'slug' => 'kejurda-shorinji-kempo-malang-2026',
        'venue' => 'GOR Kanjuruhan',
        'city' => 'Malang',
        'start_date' => '2026-12-05',
        'end_date' => '2026-12-07',
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->withSession(['tenant_event_id' => $event->id])
        ->get(route('admin.laporan.index', ['report' => 'champions']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Report/Index')
            ->where('tenant.event.id', $event->id)
            ->where('activeEvent.id', $event->id)
            ->where('activeEvent.name', $event->name)
        );
});
