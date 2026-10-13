<?php

use App\Events\DashboardSummaryUpdated;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event as EventFacade;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin dashboard can be rendered with complete stats and props', function () {
    $user = User::factory()->create();
    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Garuda Sakti Surabaya',
        'city' => 'Kota Surabaya',
        'manager_name' => 'Sensei Budi Santoso',
        'phone' => '081234567890',
        'address' => 'Jl. Pemuda No. 45 Surabaya',
        'status' => 'verified',
    ]);

    Registration::create([
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-2026-0001',
        'status' => 'verified',
        'total_amount' => 1500000,
        'final_amount' => 1500000,
    ]);

    $response = $this->actingAs($user)->get('/admin/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->has('stats')
        ->has('monthlyAthletes')
        ->has('statusBreakdown')
        ->has('latestContingents')
        ->has('latestRegistrations')
        ->has('medalStats')
        ->has('medalDistribution')
        ->has('todaySchedules')
        ->has('latestActivities')
    );
});

test('admin dashboard can filter registrations by search term', function () {
    $user = User::factory()->create();
    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Rajawali Sidoarjo',
        'city' => 'Kabupaten Sidoarjo',
        'manager_name' => 'Sensei Dewi',
        'phone' => '081234567891',
        'address' => 'Jl. Pahlawan Sidoarjo',
        'status' => 'verified',
    ]);

    Registration::create([
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-SDA-099',
        'status' => 'pending',
        'total_amount' => 750000,
        'final_amount' => 750000,
    ]);

    $response = $this->actingAs($user)->get('/admin/dashboard?search=Rajawali');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->where('filters.search', 'Rajawali')
        ->has('latestRegistrations.data', 1)
    );
});

test('event staff dashboard only lists assigned events and exposes a realtime channel', function () {
    Role::firstOrCreate(['name' => 'Arbitrase', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Arbitrase');
    $assignedEvent = Event::create([
        'name' => 'Event Arbitrase',
        'slug' => 'event-arbitrase',
        'venue' => 'GOR Arbitrase',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
        'is_active' => true,
    ]);
    $otherEvent = Event::create([
        'name' => 'Event Lain',
        'slug' => 'event-lain',
        'venue' => 'GOR Lain',
        'city' => 'Malang',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-03',
    ]);
    $assignedEvent->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    $this->actingAs($user)
        ->get('/admin/dashboard?event_id='.$assignedEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('activeEvent.id', $assignedEvent->id)
            ->has('eventOptions', 1)
            ->where('eventOptions.0.id', $assignedEvent->id)
            ->where('realtime.channel', "event.{$assignedEvent->id}.dashboard")
            ->where('realtime.event', '.dashboard.summary.updated'));

    $this->actingAs($user)
        ->get('/admin/dashboard?event_id='.$otherEvent->id)
        ->assertNotFound();
});

test('dashboard summary broadcasts a lightweight refresh signal after event data changes', function () {
    EventFacade::fake([DashboardSummaryUpdated::class]);
    $event = Event::create([
        'name' => 'Event Live',
        'slug' => 'event-live',
        'venue' => 'GOR Live',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $user = User::factory()->create();

    Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Kontingen Live',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Live',
        'phone' => '081234567890',
    ]);

    EventFacade::assertDispatched(
        DashboardSummaryUpdated::class,
        fn (DashboardSummaryUpdated $updated): bool => $updated->eventId === $event->id,
    );
});

test('portal accounts are redirected from admin dashboard to their own dashboard', function () {
    Role::firstOrCreate(['name' => 'kontingen', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'Wasit', 'guard_name' => 'web']);

    $contingentUser = User::factory()->create();
    $contingentUser->assignRole('kontingen');
    $refereeUser = User::factory()->create();
    $refereeUser->assignRole('Wasit');

    $this->actingAs($contingentUser)
        ->get('/admin/dashboard')
        ->assertRedirect(route('kontingen.registrasi'));

    $this->actingAs($refereeUser)
        ->get('/admin/dashboard')
        ->assertRedirect(route('wasit.portal'));
});
