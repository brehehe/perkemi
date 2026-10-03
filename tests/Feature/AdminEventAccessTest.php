<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can set multiple responsible users with event-specific roles', function () {
    $admin = User::factory()->create();
    $firstResponsibleUser = User::factory()->create(['name' => 'Ari Penanggung']);
    $secondResponsibleUser = User::factory()->create(['name' => 'Bima Penanggung']);
    $eventStaff = User::factory()->create(['name' => 'Citra Staf']);
    $event = Event::create(['name' => 'Kejurda Akses 2026', 'slug' => 'kejurda-akses-2026', 'venue' => 'GOR Kertajaya', 'city' => 'Surabaya', 'start_date' => '2026-10-01', 'end_date' => '2026-10-03']);

    $this->actingAs($admin)->put("/admin/master/event/{$event->id}/general", [
        'name' => $event->name,
        'venue' => $event->venue,
        'city' => $event->city,
        'tenant_subdomain' => 'kejurda-akses-2026',
        'status' => 'draft',
        'is_active' => false,
    ])->assertRedirect();

    $this->assertDatabaseHas('events', [
        'id' => $event->id,
        'tenant_subdomain' => 'kejurda-akses-2026',
    ]);

    $this->actingAs($admin)->put("/admin/master/event/{$event->id}/users", [
        'users' => [
            ['id' => $firstResponsibleUser->id, 'access_role' => Event::AccessRoleResponsible],
            ['id' => $secondResponsibleUser->id, 'access_role' => Event::AccessRoleResponsible],
            ['id' => $eventStaff->id, 'access_role' => Event::AccessRoleStaff],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('event_user', ['event_id' => $event->id, 'user_id' => $firstResponsibleUser->id, 'access_role' => Event::AccessRoleResponsible]);
    $this->assertDatabaseHas('event_user', ['event_id' => $event->id, 'user_id' => $secondResponsibleUser->id, 'access_role' => Event::AccessRoleResponsible]);
    $this->assertDatabaseHas('event_user', ['event_id' => $event->id, 'user_id' => $eventStaff->id, 'access_role' => Event::AccessRoleStaff]);

    expect($firstResponsibleUser->fresh()->hasRole('Penanggung Jawab Event'))->toBeTrue()
        ->and($secondResponsibleUser->fresh()->hasRole('Penanggung Jawab Event'))->toBeTrue()
        ->and($event->responsibleUsers()->count())->toBe(2);

    $this->actingAs($admin)->get("/admin/master/event/{$event->id}/detail")
        ->assertInertia(fn (Assert $page) => $page
            ->has('eventUsers', 3)
            ->where('eventUsers.0.id', $firstResponsibleUser->id)
            ->where('eventUsers.0.access_role', Event::AccessRoleResponsible)
            ->where('eventUsers.1.id', $secondResponsibleUser->id)
            ->where('eventUsers.1.access_role', Event::AccessRoleResponsible)
        );
});

test('responsible user role remains across events and is removed after the final assignment', function () {
    $admin = User::factory()->create();
    $responsibleUser = User::factory()->create();
    $firstEvent = Event::create(['name' => 'Kejurda Akses 2026', 'slug' => 'kejurda-akses-2026', 'venue' => 'GOR Kertajaya', 'city' => 'Surabaya', 'start_date' => '2026-10-01', 'end_date' => '2026-10-03']);
    $secondEvent = Event::create(['name' => 'Kejurda Akses 2027', 'slug' => 'kejurda-akses-2027', 'venue' => 'GOR Brawijaya', 'city' => 'Malang', 'start_date' => '2027-10-01', 'end_date' => '2027-10-03']);

    $this->actingAs($admin)->put("/admin/master/event/{$firstEvent->id}/users", [
        'users' => [['id' => $responsibleUser->id, 'access_role' => Event::AccessRoleResponsible]],
    ])->assertRedirect();
    $this->actingAs($admin)->put("/admin/master/event/{$secondEvent->id}/users", [
        'users' => [['id' => $responsibleUser->id, 'access_role' => Event::AccessRoleResponsible]],
    ])->assertRedirect();

    $this->actingAs($admin)->put("/admin/master/event/{$firstEvent->id}/users", [
        'users' => [],
    ])->assertRedirect();

    expect($responsibleUser->fresh()->hasRole('Penanggung Jawab Event'))->toBeTrue();

    $this->actingAs($admin)->put("/admin/master/event/{$secondEvent->id}/users", [
        'users' => [],
    ])->assertRedirect();

    expect($responsibleUser->fresh()->hasRole('Penanggung Jawab Event'))->toBeFalse();
    $this->assertDatabaseMissing('event_user', [
        'user_id' => $responsibleUser->id,
    ]);
});
