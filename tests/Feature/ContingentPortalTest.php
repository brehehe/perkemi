<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Official;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'kontingen', 'guard_name' => 'web']);
});

function portalEvent(string $name, string $slug, bool $active = false): Event
{
    return Event::create([
        'name' => $name,
        'slug' => $slug,
        'venue' => 'GOR Uji',
        'city' => 'Surabaya',
        'start_date' => '2026-11-06',
        'end_date' => '2026-11-09',
        'is_active' => $active,
        'is_paid' => false,
    ]);
}

function portalContingent(User $user, Event $event, string $name): Contingent
{
    return Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => $name,
        'city' => 'Surabaya',
        'manager_name' => 'Manajer '.$name,
        'phone' => '081234567890',
    ]);
}

test('guest is redirected to login from contingent portal', function () {
    $this->get('/kontingen/registrasi')->assertRedirect(route('login'));
});

test('only a contingent account with owned data may access the portal', function () {
    $event = portalEvent('POPDA', 'popda');
    $user = User::factory()->create();
    $user->assignRole('kontingen');

    $this->actingAs($user)->get('/kontingen/registrasi')->assertForbidden();

    portalContingent($user, $event, 'Kontingen Uji');

    $this->actingAs($user)->get('/kontingen/registrasi')->assertOk();
});

test('contingent portal exposes six separated pages scoped to the signed in contingent', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $otherOwner = User::factory()->create();
    $event = portalEvent('POPDA Jatim 2026', 'popda-jatim-2026', true);
    $ownContingent = portalContingent($owner, $event, 'Kontingen Sendiri');
    $otherContingent = portalContingent($otherOwner, $event, 'Kontingen Lain');
    $ownRegistration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $ownContingent->id,
        'registration_number' => 'REG-OWN-001',
    ]);
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $otherContingent->id,
        'registration_number' => 'REG-OTHER-001',
    ]);
    Athlete::create(['contingent_id' => $ownContingent->id, 'name' => 'Atlet Sendiri', 'gender' => 'L']);
    Athlete::create(['contingent_id' => $otherContingent->id, 'name' => 'Atlet Lain', 'gender' => 'P']);
    Official::create(['contingent_id' => $ownContingent->id, 'name' => 'Official Sendiri', 'role' => 'Pelatih']);
    Official::create(['contingent_id' => $otherContingent->id, 'name' => 'Official Lain', 'role' => 'Pelatih']);

    $this->actingAs($owner)->withSession(['tenant_event_id' => $event->id])
        ->get('/kontingen/registrasi')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'registration')
            ->where('portal.contingent.id', $ownContingent->id)
            ->where('registration.id', $ownRegistration->id));

    $this->actingAs($owner)->get('/kontingen/jadwal')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'schedule'));
    $this->actingAs($owner)->get('/kontingen/hasil')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'results'));
    $this->actingAs($owner)->get('/kontingen/atlet')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'athletes')
            ->has('athletes', 1)->where('athletes.0.name', 'Atlet Sendiri'));
    $this->actingAs($owner)->get('/kontingen/official')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'officials')
            ->has('officials', 1)->where('officials.0.name', 'Official Sendiri'));
    $this->actingAs($owner)->get('/kontingen/riwayat-pendaftaran')
        ->assertInertia(fn (Assert $page) => $page->component('Contingent/Portal')->where('section', 'history')
            ->has('registrations', 1)->where('registrations.0.id', $ownRegistration->id));
});

test('legacy admin registration URLs redirect contingent role to its dedicated portal', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $event = portalEvent('POPDA Redirect', 'popda-redirect', true);
    portalContingent($owner, $event, 'Kontingen Redirect');

    $this->actingAs($owner)->withSession(['tenant_event_id' => $event->id])
        ->get('/admin/pendaftaran/registrasi')
        ->assertRedirect(route('kontingen.registrasi'));

    $this->actingAs($owner)->withSession(['tenant_event_id' => $event->id])
        ->get('/admin/pendaftaran/nomor-pertandingan')
        ->assertRedirect(route('kontingen.registrasi'));
});

test('opening an owned registration switches event context before entering its wizard', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $currentEvent = portalEvent('Event Aktif', 'event-aktif', true);
    $historyEvent = portalEvent('Event Riwayat', 'event-riwayat');
    portalContingent($owner, $currentEvent, 'Kontingen Aktif');
    $historyContingent = portalContingent($owner, $historyEvent, 'Kontingen Riwayat');
    $registration = Registration::create([
        'event_id' => $historyEvent->id,
        'contingent_id' => $historyContingent->id,
        'registration_number' => 'REG-HISTORY-001',
    ]);

    $this->actingAs($owner)->withSession(['tenant_event_id' => $currentEvent->id])
        ->get(route('kontingen.registrasi.detail', ['registration' => $registration, 'step' => 3]))
        ->assertRedirect(route('admin.pendaftaran.registrasi.detail', [
            'registration' => $registration,
            'step' => 3,
        ]))
        ->assertSessionHas('tenant_event_id', $historyEvent->id);
});

test('contingent can view schedules and results for each owned event', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $firstEvent = portalEvent('Event Pertama', 'event-pertama', true);
    $secondEvent = portalEvent('Event Kedua', 'event-kedua');
    $firstContingent = portalContingent($owner, $firstEvent, 'Kontingen Pertama');
    $secondContingent = portalContingent($owner, $secondEvent, 'Kontingen Kedua');
    $firstRegistration = Registration::create([
        'event_id' => $firstEvent->id,
        'contingent_id' => $firstContingent->id,
        'registration_number' => 'REG-EVENT-PERTAMA',
    ]);
    $firstAthlete = Athlete::create(['contingent_id' => $firstContingent->id, 'name' => 'Atlet Pertama', 'gender' => 'L']);
    $secondAthlete = Athlete::create(['contingent_id' => $secondContingent->id, 'name' => 'Atlet Kedua', 'gender' => 'P']);
    Rundown::create([
        'event_id' => $firstEvent->id,
        'date' => '2026-11-06 08:00:00',
        'name' => 'Rundown Pertama',
        'type' => 'match',
    ]);
    Rundown::create([
        'event_id' => $secondEvent->id,
        'date' => '2026-11-07 08:00:00',
        'name' => 'Rundown Kedua',
        'type' => 'match',
    ]);
    TournamentResult::create([
        'event_id' => $firstEvent->id,
        'contingent_id' => $firstContingent->id,
        'athlete_id' => $firstAthlete->id,
        'contingent_name' => $firstContingent->name,
        'rank' => 1,
        'match_category' => 'Randori Putra',
    ]);
    TournamentResult::create([
        'event_id' => $secondEvent->id,
        'contingent_id' => $secondContingent->id,
        'athlete_id' => $secondAthlete->id,
        'contingent_name' => $secondContingent->name,
        'rank' => 2,
        'match_category' => 'Randori Putri',
    ]);

    $this->actingAs($owner)->withSession(['tenant_event_id' => $firstEvent->id])
        ->get('/kontingen/jadwal?event_id='.$secondEvent->id)
        ->assertSessionHas('tenant_event_id', $secondEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'schedule')
            ->where('portal.event.id', $secondEvent->id)
            ->where('portal.event.status_label', 'Pendaftaran Buka')
            ->has('portal.event_options', 2)
            ->has('rundowns', 1)
            ->where('rundowns.0.name', 'Rundown Kedua'));

    $this->actingAs($owner)->get('/kontingen/hasil?event_id='.$firstEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'results')
            ->where('portal.event.id', $firstEvent->id)
            ->has('results', 1)
            ->where('results.0.athlete.name', 'Atlet Pertama')
            ->where('medal_summary.gold', 1)
            ->where('medal_summary.silver', 0));

    $this->actingAs($owner)->get('/kontingen/registrasi?event_id='.$secondEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'registration')
            ->where('portal.event.id', $secondEvent->id)
            ->where('registration', null)
            ->has('registration_events', 2)
            ->where('registration_events.0.id', $firstEvent->id)
            ->where('registration_events.0.registration.id', $firstRegistration->id)
            ->where('registration_events.0.action_label', 'Lihat Registrasi')
            ->where('registration_events.1.id', $secondEvent->id)
            ->where('registration_events.1.registration', null)
            ->where('registration_events.1.action_label', 'Mulai Registrasi'));

    $this->actingAs($owner)->get(route('kontingen.registrasi.start', $secondEvent))
        ->assertRedirect(route('admin.pendaftaran.registrasi.create', ['event_id' => $secondEvent->id]))
        ->assertSessionHas('tenant_event_id', $secondEvent->id);
    $this->actingAs($owner)->get(route('kontingen.registrasi.start', $firstEvent))
        ->assertRedirect(route('admin.pendaftaran.registrasi.detail', [
            'registration' => $firstRegistration,
            'step' => 1,
        ]));

    $unownedEvent = portalEvent('Event Bukan Milik', 'event-bukan-milik');
    $this->actingAs($owner)->get('/kontingen/hasil?event_id='.$unownedEvent->id)->assertNotFound();
    $this->actingAs($owner)->get(route('kontingen.registrasi.start', $unownedEvent))->assertNotFound();
});

test('contingent has separate embu and randori reports limited to its own participants', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $otherOwner = User::factory()->create();
    $otherOwner->assignRole('kontingen');
    $event = portalEvent('Event Laporan', 'event-laporan', true);
    $court = EventCourt::create(['event_id' => $event->id, 'name' => 'Court Laporan', 'order' => 1, 'is_active' => true]);
    $ownContingent = portalContingent($owner, $event, 'Kontingen Laporan');
    $otherContingent = portalContingent($otherOwner, $event, 'Kontingen Lawan');
    $ownAthlete = Athlete::create(['contingent_id' => $ownContingent->id, 'name' => 'Atlet Milik', 'gender' => 'L']);
    $otherAthlete = Athlete::create(['contingent_id' => $otherContingent->id, 'name' => 'Atlet Lawan', 'gender' => 'L']);

    $embuCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Tandoku Putra',
        'type' => 'embu',
        'gender' => 'male',
    ]);
    $ownEmbuEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $ownAthlete->id,
        'event_match_category_id' => $embuCategory->id,
    ]);
    $embuDrawing = TournamentDrawing::factory()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'bracket_type' => 'embu_direct_final',
    ]);
    $embuMatch = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $embuDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'event_court_id' => $court->id,
        'participant_entry_id' => $ownEmbuEntry->id,
        'participant_label' => 'Atlet Milik',
        'match_sequence' => 1,
    ]);
    $embuScore = EmbuScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'final_score' => 245,
    ]);
    $referee = Referee::create(['name' => 'Wasit Kontingen', 'gender' => 'male', 'is_active' => true]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $embuMatch->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'user_id' => $owner->id,
        'judge_number' => 1,
    ]);

    $randoriCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 55 kg',
        'type' => 'randori',
        'gender' => 'male',
    ]);
    $ownRandoriEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $ownAthlete->id,
        'event_match_category_id' => $randoriCategory->id,
    ]);
    $otherRandoriEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $otherAthlete->id,
        'event_match_category_id' => $randoriCategory->id,
    ]);
    $randoriDrawing = TournamentDrawing::factory()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'bracket_type' => 'single_elimination',
    ]);
    $randoriMatch = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $randoriDrawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'red_entry_id' => $ownRandoriEntry->id,
        'blue_entry_id' => $otherRandoriEntry->id,
        'red_label' => 'Atlet Milik',
        'blue_label' => 'Atlet Lawan',
        'match_sequence' => 2,
    ]);
    RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $randoriMatch->id,
        'aka_total' => 15,
        'shiro_total' => 5,
        'winner_corner' => 'aka',
    ]);

    $this->actingAs($owner)->get('/kontingen/hasil/embu?event_id='.$event->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'embu-results')
            ->has('embu_results', 1)
            ->where('embu_results.0.final_score', 245)
            ->has('embu_results.0.judges', 1)
            ->where('embu_results.0.judges.0.aspect_labels.goho_attack', 'GOHO 1 · Serangan (Kougeki)')
            ->where('embu_results.0.print_url', route('kontingen.hasil.embu.print', [
                'embuScore' => $embuScore,
                'event_id' => $event->id,
            ], false)));

    $this->actingAs($owner)
        ->get(route('kontingen.hasil.embu.print', ['embuScore' => $embuScore, 'event_id' => $event->id]))
        ->assertOk()
        ->assertSee('Rincian 10 Aspek Penilaian Embu')
        ->assertSee('Serangan (Kougeki)');

    $this->actingAs($otherOwner)
        ->get(route('kontingen.hasil.embu.print', ['embuScore' => $embuScore, 'event_id' => $event->id]))
        ->assertNotFound();

    $this->actingAs($owner)->get('/kontingen/hasil/randori?event_id='.$event->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Contingent/Portal')
            ->where('section', 'randori-results')
            ->has('randori_results', 1)
            ->where('randori_results.0.is_winner', true)
            ->where('randori_results.0.own_corner', 'aka'));
});

test('contingent athlete and official masters use source data independent from event query', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $firstEvent = portalEvent('Event Master Satu', 'event-master-satu', true);
    $secondEvent = portalEvent('Event Master Dua', 'event-master-dua');
    $source = portalContingent($owner, $firstEvent, 'Kontingen Master');
    $copy = Contingent::create([
        'event_id' => $secondEvent->id,
        'source_contingent_id' => $source->id,
        'user_id' => $owner->id,
        'name' => 'Kontingen Master',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Master',
        'phone' => '081234567890',
    ]);
    Athlete::create([
        'contingent_id' => $source->id,
        'name' => 'Atlet Master',
        'nik' => '3578000000000002',
        'gender' => 'L',
    ]);
    Athlete::create([
        'contingent_id' => $copy->id,
        'name' => 'Atlet Salinan Event',
        'nik' => '3578000000000002',
        'gender' => 'L',
    ]);
    Official::create(['contingent_id' => $source->id, 'name' => 'Official Master', 'role' => 'Pelatih', 'id_card_number' => 'ID-PRIVATE']);
    Official::create(['contingent_id' => $copy->id, 'name' => 'Official Salinan Event', 'role' => 'Pelatih']);

    $this->actingAs($owner)->get('/kontingen/atlet?event_id='.$secondEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->where('section', 'athletes')
            ->has('athletes', 1)
            ->where('athletes.0.name', 'Atlet Master')
            ->where('athletes.0.nik', '3578000000000002'));

    $this->actingAs($owner)->get('/kontingen/official?event_id='.$secondEvent->id)
        ->assertInertia(fn (Assert $page) => $page
            ->where('section', 'officials')
            ->has('officials', 1)
            ->where('officials.0.name', 'Official Master')
            ->missing('officials.0.id_card_number'));
});

test('contingent can create update and delete its master athlete without event context', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $firstEvent = portalEvent('Event Master Atlet Satu', 'event-master-atlet-satu', true);
    $secondEvent = portalEvent('Event Master Atlet Dua', 'event-master-atlet-dua');
    $source = portalContingent($owner, $firstEvent, 'Kontingen Master Atlet');
    Contingent::create([
        'event_id' => $secondEvent->id,
        'source_contingent_id' => $source->id,
        'user_id' => $owner->id,
        'name' => 'Kontingen Master Atlet',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Master Atlet',
        'phone' => '081234567890',
    ]);

    $this->actingAs($owner)->post('/kontingen/atlet', [
        'name' => 'Atlet Master Baru',
        'nik' => '3578000000000011',
        'kenshi_number' => 'KENSHI-0011',
        'gender' => 'male',
        'birth_place' => 'Surabaya',
        'birth_date' => '2010-01-10',
        'kyu_dan' => 'Kyu 3',
        'weight' => 55,
        'height' => 165,
    ])->assertRedirect()->assertSessionHas('success');

    $athlete = Athlete::query()->where('name', 'Atlet Master Baru')->firstOrFail();
    expect($athlete->contingent_id)->toBe($source->id);

    $this->actingAs($owner)->put('/kontingen/atlet/'.$athlete->id, [
        'name' => 'Atlet Master Diperbarui',
        'nik' => '3578000000000011',
        'kenshi_number' => 'KENSHI-0011',
        'gender' => 'male',
        'birth_place' => 'Surabaya',
        'birth_date' => '2010-01-10',
        'kyu_dan' => 'Kyu 2',
        'weight' => 56,
        'height' => 166,
    ])->assertRedirect()->assertSessionHas('success');

    $this->assertDatabaseHas('athletes', [
        'id' => $athlete->id,
        'contingent_id' => $source->id,
        'name' => 'Atlet Master Diperbarui',
        'kyu_dan' => 'Kyu 2',
    ]);

    $this->actingAs($owner)
        ->delete('/kontingen/atlet/'.$athlete->id)
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertSoftDeleted($athlete);
});

test('contingent can create update and delete its master official without event context', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $event = portalEvent('Event Master Official', 'event-master-official', true);
    $source = portalContingent($owner, $event, 'Kontingen Master Official');

    $this->actingAs($owner)->post('/kontingen/official', [
        'name' => 'Official Master Baru',
        'role' => 'Pelatih',
        'gender' => 'female',
        'phone' => '081234567800',
        'email' => 'official@example.test',
    ])->assertRedirect()->assertSessionHas('success');

    $official = Official::query()->where('name', 'Official Master Baru')->firstOrFail();
    expect($official->contingent_id)->toBe($source->id);

    $this->actingAs($owner)->put('/kontingen/official/'.$official->id, [
        'name' => 'Official Master Diperbarui',
        'role' => 'Manajer',
        'gender' => 'female',
        'phone' => '081234567801',
        'email' => 'official@example.test',
        'notes' => 'Kontak utama kontingen.',
    ])->assertRedirect()->assertSessionHas('success');

    $this->assertDatabaseHas('officials', [
        'id' => $official->id,
        'contingent_id' => $source->id,
        'name' => 'Official Master Diperbarui',
        'role' => 'Manajer',
    ]);

    $this->actingAs($owner)
        ->delete('/kontingen/official/'.$official->id)
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertSoftDeleted($official);
});

test('contingent cannot mutate another contingents master records', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $otherOwner = User::factory()->create();
    $otherOwner->assignRole('kontingen');
    $event = portalEvent('Event Isolasi Master', 'event-isolasi-master', true);
    portalContingent($owner, $event, 'Kontingen Pemilik');
    $otherContingent = portalContingent($otherOwner, $event, 'Kontingen Lain');
    $otherAthlete = Athlete::create([
        'contingent_id' => $otherContingent->id,
        'name' => 'Atlet Kontingen Lain',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 3',
    ]);
    $otherOfficial = Official::create([
        'contingent_id' => $otherContingent->id,
        'name' => 'Official Kontingen Lain',
        'role' => 'Pelatih',
        'gender' => 'male',
    ]);

    $this->actingAs($owner)->put('/kontingen/atlet/'.$otherAthlete->id, [
        'name' => 'Percobaan Perubahan',
        'gender' => 'male',
        'kyu_dan' => 'Kyu 2',
    ])->assertNotFound();
    $this->actingAs($owner)->delete('/kontingen/atlet/'.$otherAthlete->id)->assertNotFound();
    $this->actingAs($owner)->put('/kontingen/official/'.$otherOfficial->id, [
        'name' => 'Percobaan Perubahan',
        'role' => 'Manajer',
        'gender' => 'male',
    ])->assertNotFound();
    $this->actingAs($owner)->delete('/kontingen/official/'.$otherOfficial->id)->assertNotFound();

    $this->assertDatabaseHas('athletes', ['id' => $otherAthlete->id, 'name' => 'Atlet Kontingen Lain']);
    $this->assertDatabaseHas('officials', ['id' => $otherOfficial->id, 'name' => 'Official Kontingen Lain']);
});

test('contingent master forms validate required and sensitive identity fields', function () {
    $owner = User::factory()->create();
    $owner->assignRole('kontingen');
    $event = portalEvent('Event Validasi Master', 'event-validasi-master', true);
    portalContingent($owner, $event, 'Kontingen Validasi');

    $this->actingAs($owner)->post('/kontingen/atlet', [
        'name' => '',
        'nik' => '123',
        'gender' => 'invalid',
        'kyu_dan' => '',
    ])->assertSessionHasErrors(['name', 'nik', 'gender', 'kyu_dan']);

    $this->actingAs($owner)->post('/kontingen/official', [
        'name' => '',
        'role' => '',
        'gender' => 'invalid',
        'email' => 'bukan-email',
    ])->assertSessionHasErrors(['name', 'role', 'gender', 'email']);

    $this->assertDatabaseCount('athletes', 0);
    $this->assertDatabaseCount('officials', 0);
});
