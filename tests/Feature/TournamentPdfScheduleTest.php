<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can export tournament schedule pdf with court and type filters', function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('Super Admin');

    $event = Event::query()->create([
        'name' => 'Kejuaraan Perkemi Jawa Timur',
        'slug' => 'kejuaraan-perkemi-jatim',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-08',
        'match_duration_minutes' => 7,
        'minimum_rest_minutes' => 10,
        'status' => 'ongoing',
        'is_active' => true,
    ]);

    $court1 = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);

    $court2 = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 2',
        'order' => 2,
        'is_active' => true,
    ]);

    $session = Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-07 08:30:00',
        'end_time' => '2026-11-07 12:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);

    $embuCategory = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Pasangan Putra Kyu III',
        'type' => 'embu',
        'gender' => 'male',
        'target_participants' => 8,
    ]);

    $randoriCategory = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 60 kg',
        'type' => 'randori',
        'gender' => 'male',
        'target_participants' => 8,
    ]);

    $embuDrawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'tournament_format' => 'pool',
        'total_participants' => 8,
        'is_final' => true,
    ]);

    $randoriDrawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'tournament_format' => 'single_elimination',
        'total_participants' => 8,
        'is_final' => true,
    ]);

    TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $embuDrawing->id,
        'event_court_id' => $court1->id,
        'rundown_id' => $session->id,
        'event_match_category_id' => $embuCategory->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 1,
        'bracket_position' => 1,
        'is_bye' => false,
        'scheduled_start_at' => '2026-11-07 08:30:00',
        'scheduled_end_at' => '2026-11-07 08:37:00',
        'status' => 'scheduled',
        'participant_label' => 'Kota Surabaya · Tim 1',
        'metadata' => ['members' => ['Atlet A', 'Atlet B']],
    ]);

    TournamentMatch::query()->create([
        'event_id' => $event->id,
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_court_id' => $court2->id,
        'rundown_id' => $session->id,
        'event_match_category_id' => $randoriCategory->id,
        'phase' => 'preliminary',
        'round_label' => 'Babak Penyisihan',
        'match_sequence' => 2,
        'bracket_position' => 2,
        'is_bye' => false,
        'scheduled_start_at' => '2026-11-07 08:30:00',
        'scheduled_end_at' => '2026-11-07 08:37:00',
        'status' => 'scheduled',
    ]);

    // Test 1: Full schedule in HTML preview (separated mode)
    $response = $this->actingAs($user)->get("/admin/pertandingan/jadwal/pdf?event_id={$event->id}&mode=separated&format=html");
    $response->assertOk();
    $response->assertSee('Jadwal Nomor Embu');
    $response->assertSee('Jadwal Nomor Randori');
    $response->assertSee('Kota Surabaya · Tim 1');
    $response->assertSee('Atlet A, Atlet B');

    // Test 2: Filter per court in HTML
    $responseCourt1 = $this->actingAs($user)->get("/admin/pertandingan/jadwal/pdf?event_id={$event->id}&court_id={$court1->id}&format=html");
    $responseCourt1->assertOk();
    $responseCourt1->assertSee('Court 1');
    $responseCourt1->assertSee('Gelanggang / Court:');
    $responseCourt1->assertSee('Embu Pasangan Putra Kyu III');
    $responseCourt1->assertDontSee('Randori Putra Kelas 60 kg');

    // Test 3: Filter per type (Embu only) in HTML
    $responseEmbu = $this->actingAs($user)->get("/admin/pertandingan/jadwal/pdf?event_id={$event->id}&type=embu&format=html");
    $responseEmbu->assertOk();
    $responseEmbu->assertSee('KHUSUS NOMOR PERTANDINGAN EMBU');
    $responseEmbu->assertSee('Kontingen, Tim &amp; Susunan Atlet (Peserta Embu)', false);
    $responseEmbu->assertDontSee('Sudut Merah (Aka)');

    // Test 4: Filter per type (Randori only) in HTML
    $responseRandori = $this->actingAs($user)->get("/admin/pertandingan/jadwal/pdf?event_id={$event->id}&type=randori&format=html");
    $responseRandori->assertOk();
    $responseRandori->assertSee('KHUSUS NOMOR PERTANDINGAN RANDORI');
    $responseRandori->assertSee('Sudut Merah (Aka)');
    $responseRandori->assertSee('Sudut Biru (Shiro)');

    // Test 5: Real PDF download produces application/pdf with court name in filename
    $responsePdf = $this->actingAs($user)->get("/admin/pertandingan/jadwal/pdf?event_id={$event->id}&court_id={$court1->id}");
    $responsePdf->assertOk();
    $responsePdf->assertHeader('content-type', 'application/pdf');
    expect($responsePdf->headers->get('content-disposition'))->toContain('court_1');

    // Test 6: Break / ISHOMA is displayed when present
    Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-07 12:00:00',
        'end_time' => '2026-11-07 13:30:00',
        'name' => 'ISHOMA',
        'type' => 'Istirahat',
        'is_match_session' => false,
        'order' => 2,
    ]);

    $responseWithBreak = $this->actingAs($user)->get("/admin/pertandingan/jadwal/pdf?event_id={$event->id}&format=html");
    $responseWithBreak->assertOk();
    $responseWithBreak->assertSee('JEDA RESMI');
    $responseWithBreak->assertSee('ISHOMA');
    $responseWithBreak->assertSee('12:00 &ndash; 13:30 WIB', false);

    $schedulePage = $this->actingAs($user)->get("/admin/pertandingan/jadwal?event_id={$event->id}");
    $schedulePage->assertOk();
    $schedulePage->assertInertia(fn ($page) => $page
        ->component('Admin/Tournament/Schedule')
        ->has('breaks', 1)
        ->where('breaks.0.name', 'ISHOMA')
        ->where('sessions.0.break_after.name', 'ISHOMA')
    );
});
