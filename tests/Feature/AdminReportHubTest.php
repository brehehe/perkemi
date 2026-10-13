<?php

use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('the report hub exposes every requested report for the selected event', function (string $report): void {
    $user = User::factory()->create();
    $event = reportEvent('hub');

    $this->actingAs($user)
        ->get(route('admin.laporan.index', ['event_id' => $event->id, 'report' => $report]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Report/Index')
            ->where('activeEvent.id', $event->id)
            ->where('dataset.key', $report)
            ->has('reportOptions', 8)
            ->has('dataset.columns')
            ->has('dataset.summary'));
})->with([
    'hasil juara' => 'champions',
    'skor menyeluruh' => 'all-scores',
    'rekap embu' => 'embu-recap',
    'rekap randori' => 'randori-recap',
    'penilaian wasit' => 'referee-scores',
    'analisis per wasit' => 'referee-analysis',
    'rekapitulasi embu' => 'embu-summary',
    'rekap penilaian' => 'scoring-summary',
]);

test('the report hub keeps the explicitly selected event', function (): void {
    $user = User::factory()->create();
    reportEvent('other');
    $selectedEvent = reportEvent('selected');

    $this->actingAs($user)
        ->get(route('admin.laporan.index', ['event_id' => $selectedEvent->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeEvent.id', $selectedEvent->id)
            ->has('events', 2));
});

test('the selected report can be exported as a native Excel workbook', function (): void {
    $user = User::factory()->create();
    $event = reportEvent('export');

    $response = $this->actingAs($user)
        ->get(route('admin.laporan.export', [
            'event_id' => $event->id,
            'report' => 'scoring-summary',
        ]));

    $response->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    expect($response->headers->get('cache-control'))->toContain('no-store')
        ->and(substr($response->getContent(), 0, 2))->toBe('PK');
});

test('the all scores report only shows verified results with a detail print action', function (): void {
    $user = User::factory()->create();
    $event = reportEvent('verified-scores');
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court Laporan',
        'order' => 1,
        'is_active' => true,
    ]);
    $verifiedEmbuMatch = reportMatch($event, $court, 'embu', 1);
    $draftEmbuMatch = reportMatch($event, $court, 'embu', 2);
    $verifiedRandoriMatch = reportMatch($event, $court, 'randori', 3);
    $draftRandoriMatch = reportMatch($event, $court, 'randori', 4);

    $verifiedEmbu = EmbuScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $verifiedEmbuMatch->id,
        'status' => 'verified',
        'updated_at' => now()->subMinutes(2),
    ]);
    EmbuScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $draftEmbuMatch->id,
        'status' => 'draft',
        'updated_at' => now(),
    ]);
    $verifiedRandori = RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $verifiedRandoriMatch->id,
        'status' => 'verified',
        'updated_at' => now()->subMinute(),
    ]);
    RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $draftRandoriMatch->id,
        'status' => 'draft',
        'updated_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'all-scores']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('dataset.rows', 2)
            ->where('dataset.rows.0.type', 'Randori')
            ->where('dataset.rows.0.status', 'Verified')
            ->where('dataset.rows.0.print_url', route('admin.laporan.print.randori', ['randoriScore' => $verifiedRandori, 'event_id' => $event->id], false))
            ->where('dataset.rows.1.type', 'Embu')
            ->where('dataset.rows.1.status', 'Verified')
            ->where('dataset.rows.1.print_url', route('admin.laporan.print.embu', ['embuScore' => $verifiedEmbu, 'event_id' => $event->id], false)));
});

test('individual Embu and Randori report prints include their recorded signatures', function (): void {
    $user = User::factory()->create();
    $event = reportEvent('detail-print');
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court Cetak',
        'order' => 1,
        'is_active' => true,
    ]);
    $embuMatch = reportMatch($event, $court, 'embu', 1);
    $randoriMatch = reportMatch($event, $court, 'randori', 2);
    $referee = Referee::query()->create([
        'name' => 'Wasit Cetak Embu',
        'gender' => 'male',
        'is_active' => true,
    ]);
    $signature = 'data:image/png;base64,'.base64_encode('report-signature');
    $embuScore = EmbuScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'verified_by' => $user->id,
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'user_id' => $user->id,
        'signature' => $signature,
    ]);
    $randoriScore = RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $randoriMatch->id,
        'verified_by' => $user->id,
        'signatures' => array_fill_keys(RandoriScore::SignatureKeys, $signature),
        'signature_names' => collect(RandoriScore::SignatureKeys)
            ->mapWithKeys(fn (string $key): array => [$key => str($key)->headline()->toString()])
            ->all(),
    ]);

    $this->actingAs($user)
        ->get(route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'embu-recap']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('dataset.rows.0.status', 'Verified')
            ->where('dataset.rows.0.print_url', route('admin.laporan.print.embu', ['embuScore' => $embuScore, 'event_id' => $event->id], false)));

    $this->actingAs($user)
        ->get(route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'randori-recap']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('dataset.rows.0.status', 'Verified')
            ->where('dataset.rows.0.print_url', route('admin.laporan.print.randori', ['randoriScore' => $randoriScore, 'event_id' => $event->id], false)));

    $this->actingAs($user)
        ->get(route('admin.laporan.print.embu', ['embuScore' => $embuScore, 'event_id' => $event->id]))
        ->assertOk()
        ->assertSee('Rekap Resmi Embu')
        ->assertSee('Wasit Cetak Embu')
        ->assertSee('Rincian 10 Aspek Penilaian Embu')
        ->assertSee('Serangan (Kougeki)')
        ->assertSee('Bertahan (Bougyo)')
        ->assertSee($signature, false);

    $this->actingAs($user)
        ->get(route('admin.laporan.print.randori', ['randoriScore' => $randoriScore, 'event_id' => $event->id]))
        ->assertOk()
        ->assertSee('Pengesahan 6 Pihak')
        ->assertSee($signature, false);

    $otherEvent = reportEvent('other-print-event');

    $this->actingAs($user)
        ->get(route('admin.laporan.print.embu', ['embuScore' => $embuScore, 'event_id' => $otherEvent->id]))
        ->assertNotFound();
});

function reportEvent(string $suffix): Event
{
    return Event::query()->create([
        'name' => 'Event Laporan '.str($suffix)->headline(),
        'slug' => 'event-laporan-'.$suffix,
        'venue' => 'GOR Laporan',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => $suffix === 'selected',
    ]);
}

function reportMatch(Event $event, EventCourt $court, string $type, int $sequence): TournamentMatch
{
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => ucfirst($type).' Laporan '.$sequence,
        'type' => $type,
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => $type === 'embu' ? 2 : 1,
        'order' => $sequence,
        'is_active' => true,
    ]);
    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);

    return TournamentMatch::factory()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'match_sequence' => $sequence,
        'participant_label' => 'Tim Laporan '.$sequence,
        'red_label' => 'Atlet AKA '.$sequence,
        'blue_label' => 'Atlet SHIRO '.$sequence,
        'scheduled_start_at' => '2026-11-07 09:00:00',
    ]);
}
