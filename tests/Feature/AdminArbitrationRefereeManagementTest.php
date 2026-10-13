<?php

use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\Referee;
use App\Models\Role;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
});

test('admin arbitration pages accept the all event option', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('all-option');

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.wasit', ['event_id' => 'all']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Referee')
            ->where('activeEvent.id', $event->id));
});

test('admin filters event referees using status tabs', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('filter');
    $activeReferee = arbitrationReferee('Wasit Aktif', true);
    $inactiveReferee = arbitrationReferee('Wasit Tidak Aktif', false);
    $event->referees()->attach($activeReferee, ['role' => 'chief']);
    $event->referees()->attach($inactiveReferee, ['role' => 'judge']);

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.wasit', ['event_id' => $event->id, 'status' => 'inactive']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Referee')
            ->where('filters.status', 'inactive')
            ->where('stats.total_referees', 2)
            ->where('stats.active_referees', 1)
            ->where('stats.inactive_referees', 1)
            ->has('referees', 1)
            ->where('referees.0.id', $inactiveReferee->id)
            ->where('canManageEventReferees', true));
});

test('admin can add and update a referee directly inside an event', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('crud');

    $this->actingAs($admin)
        ->post(route('admin.arbitrase.wasit.store', ['event_id' => $event->id]), [
            'name' => 'Sensei Referee Event',
            'gender' => 'female',
            'dan_grade' => 'Dan IV',
            'license_number' => 'EVENT-REF-001',
            'certification_level' => 'Wasit Nasional A',
            'region' => 'Jawa Timur',
            'phone' => '081234567890',
            'email' => 'event.referee@example.test',
            'notes' => 'Siap bertugas.',
            'is_active' => true,
            'role' => 'chief',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $referee = Referee::query()->where('license_number', 'EVENT-REF-001')->firstOrFail();
    $this->assertDatabaseHas('event_referee', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'role' => 'chief',
    ]);

    $this->actingAs($admin)
        ->put(route('admin.arbitrase.wasit.update', ['referee' => $referee, 'event_id' => $event->id]), [
            'name' => 'Sensei Referee Diperbarui',
            'gender' => 'female',
            'dan_grade' => 'Dan V',
            'license_number' => 'EVENT-REF-001',
            'certification_level' => 'Wasit Nasional A',
            'region' => 'Jawa Timur',
            'phone' => '081234567890',
            'email' => 'event.referee@example.test',
            'notes' => 'Data diperbarui.',
            'is_active' => false,
            'role' => 'reserve',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($referee->refresh()->name)->toBe('Sensei Referee Diperbarui')
        ->and($referee->is_active)->toBeFalse();
    $this->assertDatabaseHas('event_referee', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'role' => 'reserve',
    ]);
});

test('admin can save a referee profile photo for public and monitor displays', function () {
    Storage::fake('public');
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('photo');

    $this->actingAs($admin)
        ->post(route('admin.arbitrase.wasit.store', ['event_id' => $event->id]), [
            'source' => 'new',
            'name' => 'Wasit Dengan Foto',
            'gender' => 'male',
            'profile_photo' => UploadedFile::fake()->image('wasit.jpg', 600, 600),
            'is_active' => true,
            'role' => 'judge',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $referee = Referee::query()->where('name', 'Wasit Dengan Foto')->firstOrFail();

    expect($referee->profile_photo_path)->not->toBeNull();
    Storage::disk('public')->assertExists($referee->profile_photo_path);

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.wasit', ['event_id' => $event->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('referees.0.photo_url', fn ($value): bool => is_string($value) && str_contains($value, 'referee-photos/')));
});

test('admin can attach an existing master referee without creating a duplicate', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('existing');
    $referee = arbitrationReferee('Wasit Master Tersedia');

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.wasit', ['event_id' => $event->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeEvent.id', $event->id)
            ->has('events')
            ->has('availableReferees', 1)
            ->where('availableReferees.0.id', $referee->id));

    $this->actingAs($admin)
        ->post(route('admin.arbitrase.wasit.store', ['event_id' => $event->id]), [
            'source' => 'existing',
            'referee_id' => $referee->id,
            'role' => 'judge',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(Referee::query()->count())->toBe(1);
    $this->assertDatabaseHas('event_referee', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'role' => 'judge',
    ]);
});

test('removing a referee from an event clears court assignment but preserves the master record', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('remove');
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);
    $referee = arbitrationReferee('Wasit Dihapus');
    $event->referees()->attach($referee, ['role' => 'judge']);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => 'judge_side_1',
    ]);

    $this->actingAs($admin)
        ->delete(route('admin.arbitrase.wasit.destroy', ['referee' => $referee, 'event_id' => $event->id]))
        ->assertRedirect();

    $this->assertDatabaseMissing('event_referee', ['event_id' => $event->id, 'referee_id' => $referee->id]);
    $this->assertDatabaseMissing('event_court_assignments', ['event_court_id' => $court->id, 'staff_id' => $referee->id]);
    $this->assertDatabaseHas('referees', ['id' => $referee->id]);
});

test('an event referee cannot be edited through another event context', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('owned');
    $otherEvent = arbitrationEvent('other');
    $referee = arbitrationReferee('Wasit Event Lain');
    $otherEvent->referees()->attach($referee, ['role' => 'judge']);

    $this->actingAs($admin)
        ->put(route('admin.arbitrase.wasit.update', ['referee' => $referee, 'event_id' => $event->id]), [
            'name' => 'Tidak Boleh Berubah',
            'gender' => 'male',
            'is_active' => true,
            'role' => 'judge',
        ])
        ->assertNotFound();
});

test('event staff without management access cannot change referee data', function () {
    $staff = User::factory()->create();
    $event = arbitrationEvent('staff-access');
    $event->users()->attach($staff, ['access_role' => Event::AccessRoleStaff]);

    $this->actingAs($staff)
        ->post(route('admin.arbitrase.wasit.store', ['event_id' => $event->id]), [
            'name' => 'Wasit Tanpa Izin',
            'gender' => 'male',
            'is_active' => true,
            'role' => 'judge',
        ])
        ->assertForbidden();

    expect(Referee::query()->where('name', 'Wasit Tanpa Izin')->exists())->toBeFalse();
});

test('admin scoring menu renders the event judge score report', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('report');
    $court = EventCourt::query()->create(['event_id' => $event->id, 'name' => 'Court 1', 'order' => 1, 'is_active' => true]);
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Pasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 2,
        'order' => 1,
        'is_active' => true,
    ]);
    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);
    $match = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'participant_label' => 'Kontingen A · Tim 1',
        'match_sequence' => 1,
    ]);
    $referee = arbitrationReferee('Wasit Pelapor');
    $event->referees()->attach($referee, ['role' => 'chief']);
    $judgeScore = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'user_id' => $admin->id,
        'role' => 'chief',
        'total_score' => 84,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.scoring', ['event_id' => $event->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/ScoreReport')
            ->where('activeEvent.id', $event->id)
            ->where('summary.total', 1)
            ->where('summary.submitted', 1)
            ->has('scores.data', 1)
            ->where('scores.data.0.referee_name', 'Wasit Pelapor')
            ->where('scores.data.0.total_score', 84));

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.scoring.print.embu', ['embuJudgeScore' => $judgeScore, 'event_id' => $event->id]))
        ->assertOk()
        ->assertSee('Lembar Nilai Embu')
        ->assertSee('GOHO 1 · Serangan (Kougeki)')
        ->assertSee('EKSPRESI 4 · Nafas, Pandangan Mata &amp; Zanshin', false);

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.scoring.export', ['event_id' => $event->id, 'type' => 'embu']))
        ->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    $this->actingAs($admin)
        ->get(route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'referee-scores']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('dataset.key', 'referee-scores')
            ->has('dataset.rows', 1)
            ->where('dataset.rows.0.referee', 'Wasit Pelapor'));
});

test('admin scoring report renders randori opponents and six signatures', function () {
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $event = arbitrationEvent('randori-report');
    $court = EventCourt::query()->create(['event_id' => $event->id, 'name' => 'Court 2', 'order' => 2, 'is_active' => true]);
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 1,
        'order' => 1,
        'is_active' => true,
    ]);
    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'published',
        'participant_count' => 2,
        'contingent_count' => 2,
    ]);
    $match = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'red_label' => 'Atlet AKA',
        'blue_label' => 'Atlet SHIRO',
        'match_sequence' => 3,
    ]);
    $signatures = collect(RandoriScore::SignatureKeys)->mapWithKeys(fn (string $key): array => [$key => 'data:image/png;base64,'.$key])->all();
    $signatureNames = collect(RandoriScore::SignatureKeys)->mapWithKeys(fn (string $key): array => [$key => str($key)->headline()->toString()])->all();
    $randoriScore = RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'submitted_by' => $admin->id,
        'verified_by' => $admin->id,
        'signatures' => $signatures,
        'signature_names' => $signatureNames,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.scoring', ['event_id' => $event->id, 'type' => 'randori']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/ScoreReport')
            ->where('filters.type', 'randori')
            ->where('summary.randori', 1)
            ->has('scores.data', 1)
            ->where('scores.data.0.aka_label', 'Atlet AKA')
            ->where('scores.data.0.shiro_label', 'Atlet SHIRO')
            ->where('scores.data.0.signed_count', 6));

    $this->actingAs($admin)
        ->get(route('admin.arbitrase.scoring.print.randori', ['randoriScore' => $randoriScore, 'event_id' => $event->id]))
        ->assertOk()
        ->assertSee('Lembar Nilai Randori')
        ->assertSee('Atlet AKA')
        ->assertSee('Atlet SHIRO');

    $this->actingAs($admin)
        ->get(route('admin.laporan.index', ['event_id' => $event->id, 'report' => 'randori-recap']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('dataset.key', 'randori-recap')
            ->has('dataset.rows', 1)
            ->where('dataset.rows.0.aka', 'Atlet AKA')
            ->where('dataset.rows.0.signatures', '6/6'));
});

function arbitrationEvent(string $suffix): Event
{
    return Event::query()->create([
        'name' => 'Event Arbitrase '.str($suffix)->headline(),
        'slug' => 'event-arbitrase-'.$suffix,
        'venue' => 'GOR Arbitrase',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);
}

function arbitrationReferee(string $name, bool $isActive = true): Referee
{
    return Referee::query()->create([
        'name' => $name,
        'gender' => 'male',
        'is_active' => $isActive,
    ]);
}
