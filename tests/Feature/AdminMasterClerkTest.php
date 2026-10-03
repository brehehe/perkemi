<?php

use App\Models\Clerk;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can manage master clerk data', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/admin/master/clerk', ['name' => 'Dewi Lestari', 'employee_number' => 'PAN-001', 'certification' => 'Operator Nasional', 'region' => 'Jawa Timur', 'phone' => '08123456789', 'is_active' => true])->assertRedirect();

    $clerk = Clerk::query()->firstOrFail();

    $this->assertDatabaseHas('clerks', ['id' => $clerk->id, 'employee_number' => 'PAN-001']);

    $this->actingAs($user)->get('/admin/master/clerk')->assertInertia(fn (Assert $page) => $page->component('Admin/Master/Clerk/Index')->has('clerks.data', 1)->where('clerks.data.0.name', 'Dewi Lestari'));

    $this->actingAs($user)->put("/admin/master/clerk/{$clerk->id}", ['name' => 'Dewi Lestari, S.Kom.', 'employee_number' => 'PAN-001', 'is_active' => true])->assertRedirect();

    $this->assertDatabaseHas('clerks', ['id' => $clerk->id, 'name' => 'Dewi Lestari, S.Kom.']);
});

test('admin can assign or directly add a clerk to an event', function () {
    $user = User::factory()->create();
    $clerk = Clerk::create(['name' => 'Rizky', 'is_active' => true]);
    $event = Event::create(['name' => 'Kejurda Panitera 2026', 'slug' => 'kejurda-panitera-2026', 'venue' => 'GOR Kertajaya', 'city' => 'Surabaya', 'start_date' => '2026-10-01', 'end_date' => '2026-10-03']);

    $this->actingAs($user)->post("/admin/master/event/{$event->id}/clerk", ['clerk_id' => $clerk->id, 'role' => 'timekeeper'])->assertRedirect();

    $this->assertDatabaseHas('clerk_event', ['clerk_id' => $clerk->id, 'event_id' => $event->id, 'role' => 'timekeeper']);

    $this->actingAs($user)->post("/admin/master/event/{$event->id}/clerk", ['create_new' => true, 'name' => 'Ayu', 'employee_number' => 'PAN-CEPAT-001', 'role' => 'operator'])->assertRedirect();

    $this->assertDatabaseHas('clerks', ['name' => 'Ayu', 'employee_number' => 'PAN-CEPAT-001']);
});
