<?php

use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('event detail page includes arbitrationSummary prop', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda Shorinji Kempo Jatim 2026',
        'slug' => 'kejurda-jatim-2026',
        'edition' => 'Ke-XVIII',
        'venue' => 'GOR Gelora Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-10-24',
        'end_date' => '2026-10-26',
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get(route('admin.master.event.detail', $event))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Event/Detail')
            ->has('arbitrationSummary')
            ->has('arbitrationPersonnel')
            ->where('arbitrationSummary.total_matches', 0)
            ->where('arbitrationSummary.attendance_count', 0)
        );
});

test('admin can export unified arbitration workbook containing 4 sheets', function () {
    $user = User::factory()->create();

    $event = Event::create([
        'name' => 'Kejurda Shorinji Kempo Jatim 2026',
        'slug' => 'kejurda-jatim-2026',
        'edition' => 'Ke-XVIII',
        'venue' => 'GOR Gelora Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-10-24',
        'end_date' => '2026-10-26',
        'is_active' => true,
    ]);

    $court = EventCourt::create([
        'event_id' => $event->id,
        'name' => 'Court 1 (Utama)',
        'order' => 1,
        'is_active' => true,
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Dewasa',
        'type' => 'embu',
        'gender' => 'male',
        'order' => 1,
        'is_active' => true,
    ]);

    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'completed',
        'bracket_type' => 'pool',
    ]);

    $match = TournamentMatch::create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $drawing->id,
        'event_court_id' => $court->id,
        'event_match_category_id' => $category->id,
        'phase' => 'final',
        'match_sequence' => 1,
        'round_label' => 'Babak Final',
        'participant_label' => 'Kenshi A & B (Surabaya)',
        'status' => 'completed',
    ]);

    $referee = Referee::create([
        'name' => 'Sensei Hartono',
        'dan_grade' => 'IV Dan',
        'license_number' => 'WAS-001',
        'certification_level' => 'Nasional A',
        'region' => 'Jawa Timur',
        'is_active' => true,
    ]);

    RefereeAttendance::create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => '2026-10-24',
        'checked_in_at' => now(),
        'is_present' => true,
        'method' => 'qr',
    ]);

    EmbuJudgeScore::create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'judge_number' => 1,
        'role' => 'judge',
        'aspect_scores' => [],
        'technique_subtotal' => 150,
        'expression_subtotal' => 110,
        'total_score' => 260,
        'status' => 'submitted',
    ]);

    $response = $this->actingAs($user)
        ->get(route('admin.master.event.arbitration.export', $event));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('Content-Disposition'))->toContain('laporan-lengkap-arbitrase-kejurda-shorinji-kempo-jatim-2026');

    // Verify OpenXML format and 12 sheets
    $tempFile = tempnam(sys_get_temp_dir(), 'test_export_arb_');
    file_put_contents($tempFile, $response->getContent());

    $zip = new ZipArchive;
    $opened = $zip->open($tempFile);
    expect($opened)->toBeTrue();

    // Check entry exists for sheets 1 to 12
    for ($i = 1; $i <= 12; $i++) {
        expect($zip->locateName("xl/worksheets/sheet{$i}.xml"))->not()->toBeFalse();
    }

    $workbookXml = $zip->getFromName('xl/workbook.xml');
    expect($workbookXml)->toContain('name="Dewan Arbitrase"')
        ->and($workbookXml)->toContain('name="Wasit &amp; Juri"')
        ->and($workbookXml)->toContain('name="History Kehadiran"')
        ->and($workbookXml)->toContain('name="History Penilaian"')
        ->and($workbookXml)->toContain('name="Jadwal Pertandingan"')
        ->and($workbookXml)->toContain('name="Hasil Juara"')
        ->and($workbookXml)->toContain('name="Kelompok Umur"')
        ->and($workbookXml)->toContain('name="Lapangan (Court)"')
        ->and($workbookXml)->toContain('name="Nomer Pertandingan"')
        ->and($workbookXml)->toContain('name="Sesi &amp; Rundown"')
        ->and($workbookXml)->toContain('name="Panitera &amp; Korlap"')
        ->and($workbookXml)->toContain('name="Informasi Event"');

    $zip->close();
    unlink($tempFile);
});

test('admin can export unified arbitration workbook from default active event route', function () {
    $user = User::factory()->create();

    Event::create([
        'name' => 'Kejurda Shorinji Kempo Jatim 2026',
        'slug' => 'kejurda-jatim-2026',
        'edition' => 'Ke-XVIII',
        'venue' => 'GOR Gelora Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-10-24',
        'end_date' => '2026-10-26',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)
        ->get(route('admin.master.event.arbitration.export.default'));

    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});
