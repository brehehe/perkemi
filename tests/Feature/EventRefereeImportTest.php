<?php

use App\Models\Event;
use App\Models\Referee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

function createRefereeImportEvent(string $suffix = 'utama'): Event
{
    return Event::create([
        'name' => "Event Import Wasit {$suffix}",
        'slug' => "event-import-wasit-{$suffix}",
        'venue' => 'GOR Import',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
}

test('event referee template can be downloaded', function () {
    $event = createRefereeImportEvent();

    $response = $this->actingAs(User::factory()->create())
        ->get(route('admin.master.event.referee-import.template', $event, false));

    $response
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8')
        ->assertHeader('content-disposition', 'attachment; filename="template-wasit-'.$event->slug.'.csv"');

    expect($response->getContent())
        ->toStartWith("\xEF\xBB\xBF")
        ->toContain('name,gender')
        ->toContain('phone,email,password,role');
});

test('event referee import creates login and does not duplicate repeated rows', function () {
    Role::findOrCreate('Wasit', 'web');
    $admin = User::factory()->create();
    $event = createRefereeImportEvent();
    $csv = implode("\n", [
        'name,gender,dan_grade,license_number,certification_level,region,phone,email,password,role',
        'Sensei Import Event,male,Dan IV,WST-EVT-01,Nasional A,Jawa Timur,081234567890,wasit.event@example.test,WasitAman123!,referee',
        'Sensei Import Event,male,Dan IV,WST-EVT-01,Nasional A,Jawa Timur,+62 812-3456-7890,wasit.event@example.test,,chief',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.master.event.referee-import.store', $event, false), [
            'file' => UploadedFile::fake()->createWithContent('wasit-event.csv', $csv),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $referee = Referee::query()->where('license_number', 'WST-EVT-01')->firstOrFail();
    $login = User::query()->where('email', 'wasit.event@example.test')->firstOrFail();

    expect(Referee::query()->where('email', 'wasit.event@example.test')->count())->toBe(1)
        ->and($login->phone)->toBe('6281234567890')
        ->and($login->hasRole('Wasit'))->toBeTrue()
        ->and($referee->user_id)->toBe($login->id);

    $this->assertDatabaseHas('event_referee', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'role' => 'chief',
    ]);
    $this->assertDatabaseHas('event_user', [
        'event_id' => $event->id,
        'user_id' => $login->id,
        'access_role' => Event::AccessRoleStaff,
    ]);
});

test('event referee import reuses an existing referee by name', function () {
    $admin = User::factory()->create();
    $event = createRefereeImportEvent();
    $referee = Referee::create([
        'name' => 'Sensei Sudah Ada',
        'gender' => 'male',
        'region' => 'Jawa Barat',
        'is_active' => true,
    ]);
    $csv = implode("\n", [
        'name,gender,dan_grade,license_number,certification_level,region,phone,email,password,role',
        'sensei sudah ada,male,Dan III,WST-LAMA-01,Nasional B,Jawa Barat,,,,judge',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.master.event.referee-import.store', $event, false), [
            'file' => UploadedFile::fake()->createWithContent('wasit-existing.csv', $csv),
        ])
        ->assertSessionHasNoErrors();

    expect(Referee::query()->count())->toBe(1)
        ->and($referee->fresh()->license_number)->toBe('WST-LAMA-01');
    $this->assertDatabaseHas('event_referee', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'role' => 'judge',
    ]);
});

test('conflicting event referee identifiers roll back the import', function () {
    $admin = User::factory()->create();
    $event = createRefereeImportEvent();
    Referee::create([
        'name' => 'Wasit Email',
        'gender' => 'male',
        'email' => 'konflik@example.test',
        'is_active' => true,
    ]);
    Referee::create([
        'name' => 'Wasit Telepon',
        'gender' => 'female',
        'phone' => '081355566677',
        'is_active' => true,
    ]);
    $csv = implode("\n", [
        'name,gender,phone,email,role',
        'Wasit Konflik,male,081355566677,konflik@example.test,referee',
    ]);

    $this->actingAs($admin)
        ->from(route('admin.master.event.detail', $event, false))
        ->post(route('admin.master.event.referee-import.store', $event, false), [
            'file' => UploadedFile::fake()->createWithContent('wasit-konflik.csv', $csv),
        ])
        ->assertRedirect(route('admin.master.event.detail', $event, false))
        ->assertSessionHasErrors('file');

    expect($event->referees()->count())->toBe(0)
        ->and(Referee::query()->count())->toBe(2);
});

test('event responsible cannot import referees into another event', function () {
    $event = createRefereeImportEvent('milik-sendiri');
    $otherEvent = createRefereeImportEvent('event-lain');
    $responsible = User::factory()->create();
    $event->users()->attach($responsible, ['access_role' => Event::AccessRoleResponsible]);
    $csv = "name,gender,role\nWasit Tidak Sah,male,referee";

    $this->actingAs($responsible)
        ->post(route('admin.master.event.referee-import.store', $otherEvent, false), [
            'file' => UploadedFile::fake()->createWithContent('wasit.csv', $csv),
        ])
        ->assertNotFound();

    expect(Referee::query()->where('name', 'Wasit Tidak Sah')->exists())->toBeFalse();
});
