<?php

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can upload and remove an optional event cover image', function () {
    Storage::fake('public');

    $role = Role::query()->create(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole($role);
    $event = Event::query()->create([
        'name' => 'POPDA Jatim 2026',
        'slug' => 'popda-cover-test',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'status' => EventStatus::OpenRegistration,
        'is_active' => true,
    ]);

    $this->actingAs($admin)->post("/admin/master/event/{$event->id}/cover", [
        'cover_image' => UploadedFile::fake()->image('popda-cover.jpg', 1200, 1500),
    ])->assertRedirect();

    $event->refresh();
    expect($event->cover_image_path)->not->toBeNull();
    Storage::disk('public')->assertExists($event->cover_image_path);

    $this->get('/event/popda-cover-test')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Public/Event/Show')
        ->where('event.cover_image_url', Storage::disk('public')->url($event->cover_image_path)));

    $oldPath = $event->cover_image_path;
    $this->actingAs($admin)->delete("/admin/master/event/{$event->id}/cover")->assertRedirect();

    expect($event->fresh()->cover_image_path)->toBeNull();
    Storage::disk('public')->assertMissing($oldPath);
});
