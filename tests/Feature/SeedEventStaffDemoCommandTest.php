<?php

use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('command creates login masters event rosters and court assignments for every active court', function () {
    [$event, $courts] = createStaffDemoEvent();

    $this->artisan('event:seed-official-demo', [
        'event' => $event->id,
        '--password' => 'DemoStaff123!',
    ])->expectsOutputToContain('berhasil dibuat')
        ->assertSuccessful();

    $users = User::query()->where('email', 'like', 'event-staff-demo-%')->get();
    $masterEmails = collect()
        ->merge(Referee::query()->pluck('email'))
        ->merge(Clerk::query()->pluck('email'))
        ->merge(FieldCoordinator::query()->pluck('email'))
        ->sort()
        ->values();

    expect($event->referees()->count())->toBe(10)
        ->and($event->clerks()->count())->toBe(4)
        ->and($event->fieldCoordinators()->count())->toBe(2)
        ->and($event->users()->wherePivot('access_role', Event::AccessRoleStaff)->count())->toBe(16)
        ->and($users)->toHaveCount(16)
        ->and($users->pluck('email')->sort()->values()->all())->toBe($masterEmails->all())
        ->and(EventCourtAssignment::query()->whereIn('event_court_id', $courts->modelKeys())->count())->toBe(16)
        ->and(Hash::check('DemoStaff123!', $users->firstOrFail()->password))->toBeTrue();

    foreach ($courts as $court) {
        expect($court->assignments()->where('staff_type', 'referee')->count())->toBe(5)
            ->and($court->assignments()->where('staff_type', 'clerk')->count())->toBe(2)
            ->and($court->assignments()->where('staff_type', 'field_coordinator')->count())->toBe(1);
    }

    expect($users->filter(fn (User $user): bool => $user->hasRole('Wasit')))->toHaveCount(10)
        ->and($users->filter(fn (User $user): bool => $user->hasRole('Panitera')))->toHaveCount(4)
        ->and($users->filter(fn (User $user): bool => $user->hasRole('Koordinator Lapangan')))->toHaveCount(2)
        ->and(RefereeAttendance::query()->whereBelongsTo($event)->count())->toBe(0);
});

test('delete option removes only data owned by the official demo command', function () {
    [$event, $courts] = createStaffDemoEvent();
    $originalUser = User::factory()->create();
    $event->users()->attach($originalUser->id, ['access_role' => Event::AccessRoleViewer]);
    $originalReferee = Referee::query()->create([
        'name' => 'Wasit Asli',
        'license_number' => 'WST-ASLI-001',
        'email' => 'wasit.asli@example.test',
        'is_active' => true,
    ]);
    $event->referees()->attach($originalReferee->id, ['role' => 'referee']);
    $originalAssignment = EventCourtAssignment::query()->create([
        'event_court_id' => $courts->firstOrFail()->id,
        'staff_type' => 'referee',
        'staff_id' => $originalReferee->id,
        'role' => 'referee',
    ]);

    $this->artisan('event:seed-official-demo', [
        'event' => $event->id,
        '--password' => 'DemoStaff123!',
    ])->assertSuccessful();

    $this->artisan('event:seed-official-demo', [
        'event' => $event->id,
        '--delete' => true,
    ])->expectsOutputToContain('berhasil dihapus')
        ->assertSuccessful();

    expect(User::withTrashed()->where('email', 'like', 'event-staff-demo-%')->count())->toBe(0)
        ->and(Referee::withTrashed()->where('license_number', 'like', 'WST-DMO-%')->count())->toBe(0)
        ->and(Clerk::withTrashed()->where('employee_number', 'like', 'PNT-DMO-%')->count())->toBe(0)
        ->and(FieldCoordinator::withTrashed()->where('coordinator_number', 'like', 'KOR-DMO-%')->count())->toBe(0);

    $this->assertModelExists($originalUser);
    $this->assertModelExists($originalReferee);
    $this->assertModelExists($originalAssignment);
    $this->assertDatabaseHas('event_user', [
        'event_id' => $event->id,
        'user_id' => $originalUser->id,
        'access_role' => Event::AccessRoleViewer,
    ]);
});

test('simple wasit login option creates numbered referee credentials and remains deletable', function () {
    [$event] = createStaffDemoEvent();

    $this->artisan('event:seed-official-demo', [
        'event' => $event->id,
        '--password' => 'DemoStaff123!',
        '--simple-wasit-login' => true,
    ])->expectsOutputToContain('wasit1@example.test sampai wasit10@example.test')
        ->assertSuccessful();

    foreach (range(1, 10) as $number) {
        $user = User::query()->where('email', "wasit{$number}@example.test")->firstOrFail();

        expect($user->hasRole('Wasit'))->toBeTrue()
            ->and(Hash::check("wasit{$number}", $user->password))->toBeTrue();
    }

    $this->artisan('event:seed-official-demo', [
        'event' => $event->id,
        '--delete' => true,
    ])->assertSuccessful();

    expect(User::withTrashed()->whereIn('email', collect(range(1, 10))->map(fn (int $number): string => "wasit{$number}@example.test"))->count())->toBe(0);
});

test('command fails without changing data when event has no active court', function () {
    [$event] = createStaffDemoEvent(false);

    $this->artisan('event:seed-official-demo', [
        'event' => $event->id,
        '--password' => 'DemoStaff123!',
    ])->expectsOutput('Event membutuhkan minimal satu court aktif untuk membagi petugas dummy.')
        ->assertFailed();

    expect(User::query()->where('email', 'like', 'event-staff-demo-%')->count())->toBe(0)
        ->and(Referee::count())->toBe(0)
        ->and(Clerk::count())->toBe(0)
        ->and(FieldCoordinator::count())->toBe(0);
});

/** @return array{Event, Collection<int, EventCourt>} */
function createStaffDemoEvent(bool $courtsAreActive = true): array
{
    $event = Event::query()->create([
        'name' => 'Event Demo Petugas',
        'slug' => 'event-demo-petugas',
        'venue' => 'GOR Demo Petugas',
        'city' => 'Surabaya',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-08',
        'is_active' => true,
    ]);

    foreach (range(1, 2) as $number) {
        EventCourt::query()->create([
            'event_id' => $event->id,
            'name' => "Court {$number}",
            'order' => $number,
            'is_active' => $courtsAreActive,
        ]);
    }

    return [$event, $event->courts()->get()];
}
