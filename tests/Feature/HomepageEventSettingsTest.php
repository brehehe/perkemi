<?php

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\Role;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function homepageEvent(array $attributes = []): Event
{
    return Event::query()->create(array_merge([
        'name' => 'POPDA Jatim 2026',
        'slug' => 'popda-jatim-2026',
        'venue' => 'SMKN 1 Geneng',
        'city' => 'Ngawi',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'status' => EventStatus::OpenRegistration,
        'is_active' => true,
        'is_paid' => false,
    ], $attributes));
}

test('default homepage mode keeps the existing landing page', function () {
    SiteSetting::query()->create(['home_landing_mode' => SiteSetting::HomeDefault]);

    $this->get('/')->assertOk()->assertInertia(
        fn (Assert $page) => $page->component('Welcome'),
    );
});

test('featured event mode renders the selected event landing at the homepage', function () {
    $event = homepageEvent();
    SiteSetting::query()->create([
        'home_landing_mode' => SiteSetting::HomeFeaturedEvent,
        'featured_event_id' => $event->id,
    ]);

    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Public/Event/Show')
        ->where('event.id', $event->id)
        ->where('event.is_paid', false)
        ->where('isHomepage', true));
});

test('admin can choose the homepage event mode', function () {
    $role = Role::query()->create(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole($role);
    $event = homepageEvent();

    $this->actingAs($admin)->put('/admin/master/event/homepage-settings', [
        'home_landing_mode' => SiteSetting::HomeFeaturedEvent,
        'featured_event_id' => $event->id,
    ])->assertRedirect();

    $this->assertDatabaseHas('site_settings', [
        'id' => 1,
        'home_landing_mode' => SiteSetting::HomeFeaturedEvent,
        'featured_event_id' => $event->id,
    ]);
});
