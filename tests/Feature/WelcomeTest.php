<?php

use App\Enums\EventStatus;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function directoryEvent(string $slug, array $attributes = []): Event
{
    return Event::query()->create(array_merge([
        'name' => 'Kejuaraan '.$slug,
        'slug' => $slug,
        'venue' => 'Gelanggang pertandingan',
        'city' => 'Ngawi',
        'province' => 'Jawa Timur',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'registration_start' => '2026-09-15',
        'registration_end' => '2026-10-19',
        'status' => EventStatus::OpenRegistration,
        'is_paid' => false,
    ], $attributes));
}

function directoryContingent(Event $event, string $name): Contingent
{
    return $event->contingents()->create([
        'user_id' => User::factory()->create()->id,
        'name' => $name,
        'city' => 'Ngawi',
        'manager_name' => 'Pengelola kontingen',
        'phone' => '081234567890',
    ]);
}

test('homepage lists public events and counts their live database records without personal data', function () {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $event = directoryEvent('popda', ['is_active' => true, 'cover_image_path' => 'event-covers/popda.png']);
    $draft = directoryEvent('draft', ['status' => EventStatus::Draft, 'is_active' => true]);
    $deleted = directoryEvent('deleted');
    $deleted->delete();
    $contingent = directoryContingent($event, 'Kontingen terdaftar');
    $draftContingent = directoryContingent($draft, 'Kontingen draft');
    $deletedContingent = directoryContingent($event, 'Kontingen dihapus');
    Athlete::query()->create(['contingent_id' => $contingent->id, 'name' => 'Atlet terdaftar']);
    Athlete::query()->create(['contingent_id' => $draftContingent->id, 'name' => 'Atlet draft']);
    Athlete::query()->create(['contingent_id' => $deletedContingent->id, 'name' => 'Atlet kontingen dihapus']);
    Athlete::query()->create(['contingent_id' => $contingent->id, 'name' => 'Atlet dihapus'])->delete();
    $deletedContingent->delete();
    foreach ([[$event, true], [$event, false], [$draft, true], [$deleted, true]] as [$categoryEvent, $active]) {
        EventMatchCategory::query()->create([
            'event_id' => $categoryEvent->id, 'name' => 'Embu', 'type' => 'embu', 'gender' => 'male', 'is_active' => $active,
        ]);
    }

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->component('Welcome')
        ->where('stats', ['events' => 1, 'peserta' => 1, 'nomor' => 1, 'kontingen' => 1])
        ->where('events.total', 1)
        ->where('events.data.0.id', $event->id)
        ->where('events.data.0.fee_per_athlete_formatted', 'Gratis')
        ->where('events.data.0.match_categories_count', 1)
        ->where('events.data.0.contingents_count', 1)
        ->where('events.data.0.url', route('event.public.show', ['slug' => 'popda']))
        ->where('featuredEvent.id', $event->id)
        ->where('featuredEvent.cover_image_url', fn ($url) => str_ends_with($url, '/event-covers/popda.png'))
        ->missing('events.data.0.contact_phone')
        ->missing('events.data.0.contingents')
        ->missing('techniquesByLevel'));
});

test('event phases follow inclusive calendar dates and registration windows', function (array $attributes, string $phase, string $registrationState) {
    $this->travelTo(now()->setDate(2026, 10, 4)->setTime(23, 30));
    directoryEvent('calendar', $attributes);

    $this->get('/?status='.$phase)->assertInertia(fn (Assert $page) => $page
        ->where('events.total', 1)
        ->where('events.data.0.phase', $phase)
        ->where('events.data.0.registration_state', $registrationState)
        ->where('events.data.0.registration_url', $registrationState === 'open' ? route('event.public.register', ['slug' => 'calendar']) : null)
        ->where('statusCounts.'.$phase, 1));
})->with([
    'future event with registration open' => [[], 'upcoming', 'open'],
    'registration has not started' => [['registration_start' => '2026-10-05'], 'upcoming', 'scheduled'],
    'registration deadline passed' => [['registration_end' => '2026-10-03'], 'upcoming', 'closed'],
    'registration opens today' => [['registration_start' => '2026-10-04'], 'upcoming', 'open'],
    'registration closes today' => [['registration_end' => '2026-10-04'], 'upcoming', 'open'],
    'first competition day' => [['start_date' => '2026-10-04', 'end_date' => '2026-10-06'], 'ongoing', 'open'],
    'last competition day' => [['start_date' => '2026-10-01', 'end_date' => '2026-10-04', 'status' => EventStatus::Ongoing], 'ongoing', 'closed'],
    'past event with stale registration status' => [['start_date' => '2026-10-01', 'end_date' => '2026-10-03'], 'completed', 'closed'],
    'manually completed event' => [['status' => EventStatus::Completed], 'completed', 'closed'],
    'closed registration for future event' => [['status' => EventStatus::Closed], 'upcoming', 'closed'],
]);

test('search and phase filters preserve global counts and exclude drafts', function () {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $event = directoryEvent('public-surabaya', ['city' => 'Surabaya']);
    directoryEvent('public-ngawi');
    directoryEvent('past-surabaya', ['city' => 'Surabaya', 'start_date' => '2025-11-06', 'end_date' => '2025-11-09']);
    directoryEvent('draft-surabaya', ['city' => 'Surabaya', 'status' => EventStatus::Draft]);

    $this->get('/?search=SURABAYA&status=upcoming')->assertInertia(fn (Assert $page) => $page
        ->where('events.total', 1)
        ->where('events.data.0.id', $event->id)
        ->where('statusCounts', ['all' => 3, 'upcoming' => 2, 'ongoing' => 0, 'completed' => 1])
        ->where('filters', ['search' => 'SURABAYA', 'status' => 'upcoming']));
});

test('directory paginates events and retains the search and status in navigation', function () {
    $this->travelTo(now()->setDate(2026, 10, 4));
    foreach (range(1, 10) as $index) {
        directoryEvent('event-'.$index);
    }

    $this->get('/?search=Ngawi&status=upcoming')->assertInertia(fn (Assert $page) => $page
        ->has('events.data', 9)
        ->where('events.total', 10)
        ->where('events.next_page_url', fn (string $url) => str_contains($url, 'search=Ngawi') && str_contains($url, 'status=upcoming') && str_contains($url, 'page=2')));

    $this->get('/?search=Ngawi&status=upcoming&page=2')->assertInertia(fn (Assert $page) => $page
        ->has('events.data', 1)
        ->where('events.current_page', 2));
});

test('empty directory has real zero counts and accepts malformed display filters safely', function () {
    $this->get('/?search[]=invalid&status[]=invalid')->assertInertia(fn (Assert $page) => $page
        ->where('stats', ['events' => 0, 'peserta' => 0, 'nomor' => 0, 'kontingen' => 0])
        ->where('featuredEvent', null)
        ->where('events.total', 0)
        ->where('filters', ['search' => '', 'status' => 'all']));
});

test('homepage reflects changes to event information without cached sample data', function () {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $event = directoryEvent('updated', ['is_paid' => true, 'fee_per_athlete' => 125000]);
    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('events.data.0.fee_per_athlete_formatted', 'Rp 125.000'));

    $event->update(['name' => 'Nama kejuaraan diperbarui', 'status' => EventStatus::Completed]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('events.data.0.name', 'Nama kejuaraan diperbarui')
        ->where('events.data.0.phase', 'completed')
        ->where('events.data.0.registration_url', null));
});

test('a draft selected as the homepage event falls back to the public directory', function () {
    $event = directoryEvent('private', ['status' => EventStatus::Draft]);
    SiteSetting::query()->create(['home_landing_mode' => SiteSetting::HomeFeaturedEvent, 'featured_event_id' => $event->id]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->component('Welcome')
        ->where('featuredEvent', null)
        ->where('events.total', 0));
});
