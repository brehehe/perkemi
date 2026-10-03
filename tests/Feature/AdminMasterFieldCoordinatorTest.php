<?php

use App\Models\Event;
use App\Models\FieldCoordinator;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can manage master field coordinator data', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/admin/master/field-coordinator', ['name' => 'Andi Pratama', 'coordinator_number' => 'KOR-001', 'region' => 'Jawa Timur', 'is_active' => true])->assertRedirect();
    $coordinator = FieldCoordinator::query()->firstOrFail();
    $this->assertDatabaseHas('field_coordinators', ['id' => $coordinator->id, 'coordinator_number' => 'KOR-001']);
    $this->actingAs($user)->get('/admin/master/field-coordinator')->assertInertia(fn (Assert $page) => $page->component('Admin/Master/FieldCoordinator/Index')->has('fieldCoordinators.data', 1));
});

test('admin can assign a field coordinator to an event', function () {
    $user = User::factory()->create();
    $coordinator = FieldCoordinator::create(['name' => 'Andi Pratama', 'is_active' => true]);
    $event = Event::create(['name' => 'Kejurda Koordinator 2026', 'slug' => 'kejurda-koordinator-2026', 'venue' => 'GOR Kertajaya', 'city' => 'Surabaya', 'start_date' => '2026-10-01', 'end_date' => '2026-10-03']);
    $this->actingAs($user)->post("/admin/master/event/{$event->id}/field-coordinator", ['field_coordinator_id' => $coordinator->id, 'assignment_area' => 'court'])->assertRedirect();
    $this->assertDatabaseHas('event_field_coordinator', ['event_id' => $event->id, 'field_coordinator_id' => $coordinator->id, 'assignment_area' => 'court']);
});
