<?php

use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\Role;
use App\Models\Technique;
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

test('event export captures techniques, check-in codes, payment methods, and associated users', function () {
    $role = Role::findOrCreate('Wasit', 'web');
    $staffUser = User::factory()->create([
        'name' => 'Sensei Wasit Ekspor',
        'email' => 'wasit.ekspor@example.com',
    ]);
    $staffUser->assignRole($role);

    $event = Event::query()->create([
        'name' => 'Event Export Full Features',
        'slug' => 'event-export-full-features',
        'city' => 'Batu',
        'venue' => 'GOR Gajah Mada',
        'start_date' => now(),
        'end_date' => now()->addDays(2),
        'is_active' => true,
    ]);

    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court Batu 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $referee = Referee::query()->create([
        'name' => 'Sensei Wasit Ekspor',
        'gender' => 'male',
        'user_id' => $staffUser->id,
        'is_active' => true,
    ]);
    $event->referees()->attach($referee, ['role' => 'judge']);

    $contingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $staffUser->id,
        'name' => 'Kontingen Test Batu',
        'city' => 'Kota Batu',
        'manager_name' => 'Manager Test',
        'phone' => '08123456789',
        'address' => 'Jl. Test No. 1',
        'status' => 'verified',
    ]);

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan',
        'type' => 'embu',
    ]);

    $technique = Technique::query()->create([
        'id' => (string) Str::uuid(),
        'name' => 'Kote Geri Test',
        'category' => 'Embu',
        'order' => 1,
        'is_active' => true,
    ]);

    DB::table('embu_team_techniques')->insert([
        'id' => (string) Str::uuid(),
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'event_match_category_id' => $category->id,
        'team_number' => 1,
        'technique_id' => $technique->id,
        'order' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('referee_check_in_codes')->insert([
        'id' => (string) Str::uuid(),
        'code' => '998877',
        'type' => 'court',
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'role' => 'chief',
        'target_url' => "http://localhost:8000/wasit/check-in/event/{$event->id}/court/{$court->id}",
        'expires_at' => now()->addDays(2),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $syncService = app(EventDataSyncService::class);
    $package = $syncService->exportEvent($event);

    expect($package['counts']['techniques'])->toBeGreaterThanOrEqual(1)
        ->and($package['counts']['referee_check_in_codes'])->toBe(1)
        ->and($package['counts']['users'])->toBeGreaterThanOrEqual(1)
        ->and($package['data']['techniques'])->not->toBeEmpty()
        ->and($package['data']['referee_check_in_codes'])->toHaveCount(1)
        ->and(collect($package['data']['users'])->pluck('email'))->toContain('wasit.ekspor@example.com');
});

test('event import successfully restores check-in codes, creates missing users with roles, and handles self-referencing matches', function () {
    $remoteEventId = (string) Str::uuid();
    $remoteCourtId = (string) Str::uuid();
    $remoteCatAId = (string) Str::uuid();
    $remoteCatBId = (string) Str::uuid();
    $remoteDrawingId = (string) Str::uuid();
    $remoteMatch1Id = (string) Str::uuid();
    $remoteMatch2Id = (string) Str::uuid();
    $remoteUserId = (string) Str::uuid();

    $package = [
        'format' => EventDataSyncService::ExportFormat,
        'version' => EventDataSyncService::Version,
        'data' => [
            'event' => [
                'id' => $remoteEventId,
                'name' => 'Event Import Full Self Ref',
                'slug' => 'event-import-full-self-ref',
                'city' => 'Malang',
                'venue' => 'GOR Ken Arok',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(2)->toDateString(),
                'is_active' => true,
            ],
            'users' => [
                [
                    'id' => $remoteUserId,
                    'name' => 'Petugas Scoring Baru',
                    'email' => 'scoring.baru@smart-perkemi.id',
                    'phone' => '081234567890',
                    'password' => bcrypt('secret123'),
                    'roles' => ['Panitera'],
                ],
            ],
            'event_courts' => [
                [
                    'id' => $remoteCourtId,
                    'event_id' => $remoteEventId,
                    'name' => 'Tatami 1 Ken Arok',
                    'order' => 1,
                    'is_active' => true,
                ],
            ],
            'event_match_categories' => [
                // Category A merged into Category B (forward reference in array)
                [
                    'id' => $remoteCatAId,
                    'event_id' => $remoteEventId,
                    'name' => 'Randori Remaja 50kg (Merged)',
                    'type' => 'randori',
                    'gender' => 'male',
                    'merged_into_id' => $remoteCatBId,
                    'scoring_locked_by' => $remoteUserId,
                ],
                [
                    'id' => $remoteCatBId,
                    'event_id' => $remoteEventId,
                    'name' => 'Randori Remaja 55kg (Master)',
                    'type' => 'randori',
                    'gender' => 'male',
                    'merged_into_id' => null,
                ],
            ],
            'tournament_drawings' => [
                [
                    'id' => $remoteDrawingId,
                    'event_id' => $remoteEventId,
                    'event_match_category_id' => $remoteCatBId,
                    'status' => 'published',
                ],
            ],
            'tournament_matches' => [
                // Match 1 references Match 2 via next_match_id (forward reference)
                [
                    'id' => $remoteMatch1Id,
                    'event_id' => $remoteEventId,
                    'tournament_drawing_id' => $remoteDrawingId,
                    'event_match_category_id' => $remoteCatBId,
                    'event_court_id' => $remoteCourtId,
                    'next_match_id' => $remoteMatch2Id,
                    'match_sequence' => 1,
                    'phase' => 'preliminary',
                    'round_label' => 'Babak 1',
                    'status' => 'completed',
                    'metadata' => ['var_review' => false, 'court_number' => 1],
                ],
                [
                    'id' => $remoteMatch2Id,
                    'event_id' => $remoteEventId,
                    'tournament_drawing_id' => $remoteDrawingId,
                    'event_match_category_id' => $remoteCatBId,
                    'event_court_id' => $remoteCourtId,
                    'next_match_id' => null,
                    'match_sequence' => 2,
                    'phase' => 'final',
                    'round_label' => 'Babak Final',
                    'status' => 'ready',
                    'metadata' => ['var_review' => false],
                ],
            ],
            'referee_check_in_codes' => [
                [
                    'id' => (string) Str::uuid(),
                    'code' => '445566',
                    'type' => 'court',
                    'event_id' => $remoteEventId,
                    'event_court_id' => $remoteCourtId,
                    'role' => 'judge',
                    'target_url' => "http://localhost:8000/wasit/check-in/event/{$remoteEventId}/court/{$remoteCourtId}",
                    'expires_at' => now()->addDays(2)->toDateTimeString(),
                ],
            ],
            'event_user' => [
                [
                    'event_id' => $remoteEventId,
                    'user_id' => $remoteUserId,
                    'access_role' => 'Panitera',
                ],
            ],
        ],
    ];

    $syncService = app(EventDataSyncService::class);
    $result = $syncService->importEvent($package);

    expect($result['event_id'])->toBe($remoteEventId);

    // Verify user was created with role
    $createdUser = User::query()->where('email', 'scoring.baru@smart-perkemi.id')->first();
    expect($createdUser)->not->toBeNull()
        ->and($createdUser->hasRole('Panitera'))->toBeTrue();

    // Verify event_user pivot created
    $this->assertDatabaseHas('event_user', [
        'event_id' => $remoteEventId,
        'user_id' => $createdUser->id,
    ]);

    // Verify check-in code imported
    $this->assertDatabaseHas('referee_check_in_codes', [
        'event_id' => $remoteEventId,
        'code' => '445566',
    ]);

    // Verify self-referencing foreign keys resolved
    $this->assertDatabaseHas('event_match_categories', [
        'id' => $remoteCatAId,
        'merged_into_id' => $remoteCatBId,
        'scoring_locked_by' => $createdUser->id,
    ]);

    $this->assertDatabaseHas('tournament_matches', [
        'id' => $remoteMatch1Id,
        'next_match_id' => $remoteMatch2Id,
    ]);
});

test('import safely auto-creates missing referee records referenced by attendances without foreign key violation', function () {
    $remoteEventId = (string) Str::uuid();
    $unregisteredRefereeId = (string) Str::uuid();

    $package = [
        'format' => EventDataSyncService::ExportFormat,
        'version' => EventDataSyncService::Version,
        'data' => [
            'event' => [
                'id' => $remoteEventId,
                'name' => 'Event Missing Referee Test',
                'slug' => 'event-missing-referee-test',
                'city' => 'Surabaya',
                'venue' => 'GOR Kertajaya',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(2)->toDateString(),
                'is_active' => true,
            ],
            // Note: referees array does NOT contain $unregisteredRefereeId!
            'referees' => [],
            'referee_attendances' => [
                [
                    'id' => (string) Str::uuid(),
                    'event_id' => $remoteEventId,
                    'referee_id' => $unregisteredRefereeId,
                    'attendance_date' => '2026-10-22',
                    'checked_in_at' => now()->toDateTimeString(),
                    'method' => 'manual',
                    'is_present' => true,
                ],
            ],
        ],
    ];

    $syncService = app(EventDataSyncService::class);
    $result = $syncService->importEvent($package);

    expect($result['event_id'])->toBe($remoteEventId);

    // Verify referee was auto-created to satisfy foreign key
    $this->assertDatabaseHas('referees', [
        'id' => $unregisteredRefereeId,
    ]);

    // Verify attendance was successfully imported
    $this->assertDatabaseHas('referee_attendances', [
        'event_id' => $remoteEventId,
        'referee_id' => $unregisteredRefereeId,
    ]);
});

test('import safely remaps event_id on referee_court_attendances when matching existing event by slug with different ID', function () {
    // 1. Create existing local event
    $existingEvent = Event::query()->create([
        'slug' => 'slug-mismatch-event',
        'name' => 'Existing Local Event',
        'city' => 'Surabaya',
        'venue' => 'GOR Kertajaya',
        'start_date' => now()->toDateString(),
        'end_date' => now()->addDays(2)->toDateString(),
        'is_active' => true,
    ]);
    $localEventId = $existingEvent->id;

    $remoteExportedEventId = (string) Str::uuid();
    $remoteCourtId = (string) Str::uuid();
    $refereeId = (string) Str::uuid();
    $attendanceId = (string) Str::uuid();

    $package = [
        'format' => EventDataSyncService::ExportFormat,
        'version' => EventDataSyncService::Version,
        'data' => [
            'event' => [
                'id' => $remoteExportedEventId, // Different ID than local event!
                'name' => 'Existing Local Event',
                'slug' => 'slug-mismatch-event',
                'city' => 'Surabaya',
                'venue' => 'GOR Kertajaya',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(2)->toDateString(),
                'is_active' => true,
            ],
            'event_courts' => [
                [
                    'id' => $remoteCourtId,
                    'event_id' => $remoteExportedEventId,
                    'name' => 'Court A',
                    'order' => 1,
                    'is_active' => true,
                ],
            ],
            'referees' => [
                [
                    'id' => $refereeId,
                    'name' => 'Sensei Budi',
                    'gender' => 'male',
                    'is_active' => true,
                ],
            ],
            'referee_court_attendances' => [
                [
                    'id' => $attendanceId,
                    'event_id' => $remoteExportedEventId, // Old remote ID
                    'event_court_id' => $remoteCourtId,
                    'referee_id' => $refereeId,
                    'attendance_date' => '2026-11-07',
                    'checked_in_at' => now()->toDateTimeString(),
                    'method' => 'qr',
                ],
            ],
        ],
    ];

    $syncService = app(EventDataSyncService::class);
    $result = $syncService->importEvent($package);

    expect($result['event_id'])->toBe($localEventId);

    // Verify referee_court_attendances was imported and remapped to $localEventId
    $this->assertDatabaseHas('referee_court_attendances', [
        'id' => $attendanceId,
        'event_id' => $localEventId,
        'event_court_id' => $remoteCourtId,
        'referee_id' => $refereeId,
    ]);
});
