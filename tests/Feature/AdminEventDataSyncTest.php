<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use App\Services\Admin\Event\EventDataSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

test('admin can export event package as json download', function () {
    $role = Role::findOrCreate('Super Admin', 'web');
    $user = User::factory()->create();
    $user->assignRole($role);

    $event = Event::query()->create([
        'name' => 'Event Ekspor Test',
        'slug' => 'event-ekspor-test',
        'city' => 'Malang',
        'venue' => 'GOR Bimasakti',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court A',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Dewasa',
        'type' => 'randori',
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
    ]);

    TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 1,
        'phase' => 'preliminary',
        'round_level' => 1,
        'round_label' => 'Babak 1',
        'status' => 'ready',
        'call_status' => 'waiting',
        'is_bye' => false,
    ]);

    $response = $this->actingAs($user)
        ->get(route('admin.master.event.export-package', ['event' => $event->id]));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/json; charset=UTF-8');

    $content = $response->streamedContent();
    $package = json_decode($content, true);

    expect($package['format'])->toBe(EventDataSyncService::ExportFormat)
        ->and($package['event_id'])->toBe($event->id)
        ->and($package['counts']['courts'])->toBe(1)
        ->and($package['counts']['matches'])->toBe(1);
});

test('admin can import event package and restore matches and courts', function () {
    $role = Role::findOrCreate('Super Admin', 'web');
    $user = User::factory()->create();
    $user->assignRole($role);

    $event = Event::query()->create([
        'name' => 'Event Asli Offline',
        'slug' => 'event-asli-offline',
        'city' => 'Kediri',
        'venue' => 'GOR Jayabaya',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court Kediri 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Tandoku',
        'type' => 'embu',
    ]);

    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
    ]);

    TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'match_sequence' => 10,
        'phase' => 'final',
        'round_level' => 1,
        'round_label' => 'Babak Final',
        'status' => 'completed',
        'call_status' => 'completed',
        'is_bye' => false,
    ]);

    $syncService = app(EventDataSyncService::class);
    $package = $syncService->exportEvent($event);

    $jsonString = json_encode($package);
    $uploadedFile = UploadedFile::fake()->createWithContent('offline-export.json', $jsonString);

    $response = $this->actingAs($user)
        ->post(route('admin.master.event.import-package'), [
            'package_file' => $uploadedFile,
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('events', ['id' => $event->id, 'name' => 'Event Asli Offline']);
    $this->assertDatabaseHas('event_courts', ['event_id' => $event->id, 'name' => 'Court Kediri 1']);
    $this->assertDatabaseHas('tournament_matches', ['event_id' => $event->id, 'match_sequence' => 10, 'status' => 'completed']);
});

test('export and import cli commands work successfully', function () {
    $event = Event::query()->create([
        'name' => 'Event CLI Test',
        'slug' => 'event-cli-test',
        'city' => 'Madiun',
        'venue' => 'GOR Wilis',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $outputPath = storage_path('app/exports/cli-test.json');

    $this->artisan('perkemi:export-event', [
        'event' => $event->id,
        '--output' => $outputPath,
    ])->assertSuccessful();

    expect(file_exists($outputPath))->toBeTrue();

    $this->artisan('perkemi:import-event', [
        'file' => $outputPath,
        '--force' => true,
    ])->assertSuccessful();

    if (file_exists($outputPath)) {
        unlink($outputPath);
    }
});

test('import handles existing staff with different uuid and maps relationships safely', function () {
    $existingReferee = Referee::query()->create([
        'name' => 'Wasit Uji Coba',
        'gender' => 'male',
        'license_number' => 'TEST.LIC.001',
        'is_active' => true,
    ]);

    $existingEvent = Event::query()->create([
        'name' => 'Event Target DB',
        'slug' => 'event-sync-slug',
        'city' => 'Surabaya',
        'venue' => 'GOR Kertajaya',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $differentEventId = (string) Str::uuid();
    $differentRefereeId = (string) Str::uuid();

    $package = [
        'format' => EventDataSyncService::ExportFormat,
        'version' => EventDataSyncService::Version,
        'data' => [
            'event' => [
                'id' => $differentEventId,
                'name' => 'Event Target DB (Updated)',
                'slug' => 'event-sync-slug',
                'city' => 'Surabaya',
                'venue' => 'GOR Kertajaya',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(2)->toDateString(),
                'is_active' => true,
            ],
            'referees' => [
                [
                    'id' => $differentRefereeId,
                    'name' => 'Wasit Uji Coba (Export)',
                    'gender' => 'male',
                    'license_number' => 'TEST.LIC.001',
                    'is_active' => true,
                ],
            ],
            'event_referee' => [
                [
                    'event_id' => $differentEventId,
                    'referee_id' => $differentRefereeId,
                    'role' => 'wasit_tatami',
                    'is_active' => true,
                ],
            ],
        ],
    ];

    $syncService = app(EventDataSyncService::class);
    $result = $syncService->importEvent($package);

    expect($result['event_id'])->toBe($existingEvent->id);

    $this->assertDatabaseHas('events', [
        'id' => $existingEvent->id,
        'name' => 'Event Target DB (Updated)',
    ]);

    $this->assertDatabaseHas('event_referee', [
        'event_id' => $existingEvent->id,
        'referee_id' => $existingReferee->id,
    ]);
});
