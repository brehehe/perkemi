<?php

use App\Enums\RefereeCourtRole;
use App\Events\EmbuJudgeScoreUpdated;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\EventMatchCategory;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAssignmentHistory;
use App\Models\RefereeCourtAttendance;
use App\Models\Role;
use App\Models\Technique;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event as EventFacade;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('event responsible user opens referee management with only their assigned event', function () {
    [$event] = createRefereeWorkflowEvent('responsible');
    createRefereeWorkflowEvent('unassigned');
    Role::findOrCreate('Penanggung Jawab Event', 'web');
    $responsibleUser = User::factory()->create();
    $responsibleUser->assignRole('Penanggung Jawab Event');
    $event->users()->attach($responsibleUser, ['access_role' => Event::AccessRoleResponsible]);

    $this->actingAs($responsibleUser)
        ->get(route('admin.pertandingan.wasit.index', ['event_id' => $event->id], false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/EventReferees')
            ->where('activeEvent.id', $event->id)
            ->has('events', 1)
            ->where('events.0.id', $event->id));
});

test('event responsible user without an event assignment cannot open referee management', function () {
    [$event] = createRefereeWorkflowEvent('unassigned-responsible');
    Role::findOrCreate('Penanggung Jawab Event', 'web');
    $responsibleUser = User::factory()->create();
    $responsibleUser->assignRole('Penanggung Jawab Event');

    $this->actingAs($responsibleUser)
        ->get(route('admin.pertandingan.wasit.index', ['event_id' => $event->id], false))
        ->assertNotFound();
});

test('event responsible user records referee attendance for their assigned event', function () {
    [$event] = createRefereeWorkflowEvent('responsible-attendance');
    $referee = createEventReferee($event, 1);
    Role::findOrCreate('Penanggung Jawab Event', 'web');
    $responsibleUser = User::factory()->create();
    $responsibleUser->assignRole('Penanggung Jawab Event');
    $event->users()->attach($responsibleUser, ['access_role' => Event::AccessRoleResponsible]);

    $this->actingAs($responsibleUser)
        ->put(route('admin.pertandingan.wasit.attendance.update', $referee, false), [
            'event_id' => $event->id,
            'attendance_date' => now()->toDateString(),
            'is_present' => true,
            'notes' => 'Dikonfirmasi penanggung jawab event.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('referee_attendances', [
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'checked_in_by_user_id' => $responsibleUser->id,
        'is_present' => true,
        'notes' => 'Dikonfirmasi penanggung jawab event.',
    ]);
});

test('event responsible user generates five unique present referees for every active court', function () {
    [$event, $courts] = createRefereeWorkflowEvent('generated-panels');
    Role::findOrCreate('Penanggung Jawab Event', 'web');
    $responsibleUser = User::factory()->create();
    $responsibleUser->assignRole('Penanggung Jawab Event');
    $event->users()->attach($responsibleUser, ['access_role' => Event::AccessRoleResponsible]);
    $referees = collect(range(1, 11))->map(fn (int $number): Referee => createEventReferee($event, $number));
    $inactiveReferee = $referees->last();
    $inactiveReferee->update(['is_active' => false]);

    $referees->each(fn (Referee $referee) => RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]));

    $this->actingAs($responsibleUser)
        ->post(route('admin.pertandingan.wasit.courts.generate', absolute: false), [
            'event_id' => $event->id,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $assignments = EventCourtAssignment::query()
        ->whereIn('event_court_id', $courts->modelKeys())
        ->where('staff_type', 'referee')
        ->get();

    expect($assignments)->toHaveCount(10)
        ->and($assignments->pluck('staff_id')->unique())->toHaveCount(10)
        ->and($assignments->pluck('staff_id'))->not->toContain($inactiveReferee->id);

    foreach ($courts as $court) {
        expect($assignments->where('event_court_id', $court->id)->pluck('role')->sort()->values()->all())
            ->toBe(collect(RefereeCourtRole::values())->sort()->values()->all());
    }

    expect(RefereeCourtAssignmentHistory::query()
        ->whereBelongsTo($event)
        ->where('changed_by_user_id', $responsibleUser->id)
        ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
        ->count())->toBe(10);
});

test('generation keeps the current panel when present referees are insufficient', function () {
    [$event, $courts] = createRefereeWorkflowEvent('insufficient-generation');
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $referees = collect(range(1, 5))->map(fn (int $number): Referee => createEventReferee($event, $number));
    $existingAssignment = EventCourtAssignment::query()->create([
        'event_court_id' => $courts->first()->id,
        'staff_type' => 'referee',
        'staff_id' => $referees->first()->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);

    $referees->each(fn (Referee $referee) => RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]));

    $this->actingAs($panitera)
        ->post(route('admin.pertandingan.wasit.courts.generate', absolute: false), [
            'event_id' => $event->id,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors([
            'generate' => 'Dibutuhkan 10 wasit aktif yang hadir untuk 2 court. Saat ini tersedia 5; tambahkan absensi 5 wasit lagi.',
        ]);

    $this->assertModelExists($existingAssignment);
    expect(EventCourtAssignment::query()->count())->toBe(1)
        ->and(RefereeCourtAssignmentHistory::query()->count())->toBe(0);
});

test('Panitera assigns exactly five present referees to the event court', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $referees = collect(range(1, 5))->map(fn (int $number): Referee => createEventReferee($event, $number));

    $referees->each(fn (Referee $referee) => RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]));

    $selectedByRole = collect(RefereeCourtRole::cases())
        ->mapWithKeys(fn (RefereeCourtRole $role, int $index): array => [$role->value => $referees[$index]->id])
        ->all();

    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.courts.panel.update', $courts->first(), false), [
            'event_id' => $event->id,
            'referees' => $selectedByRole,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(EventCourtAssignment::query()
        ->where('event_court_id', $courts->first()->id)
        ->where('staff_type', 'referee')
        ->pluck('role', 'staff_id')
        ->all())->toBe(collect($selectedByRole)->flip()->all())
        ->and(RefereeCourtAssignmentHistory::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($courts->first(), 'court')
            ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
            ->count())->toBe(5);

    $this->actingAs($panitera)
        ->get(route('admin.pertandingan.wasit.index', ['event_id' => $event->id], false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/EventReferees')
            ->where('activeEvent.id', $event->id)
            ->has('roles', 5)
            ->where('stats.total', 5)
            ->where('stats.present', 5)
            ->where('stats.courts_ready', 0)
            ->where('courts.0.panel_complete', true)
            ->where('courts.0.panel_ready', false)
            ->where('courts.0.has_panel', true)
            ->has('courts.0.panel', 5)
            ->has('courts.0.assignment_history', 5));
});

test('Panitera resets a court panel and the referees become available again', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referees = collect(range(1, 5))->map(fn (int $number): Referee => createEventReferee(
        $event,
        $number,
        $number === 1 ? $refereeUser : null,
    ));

    $referees->each(fn (Referee $referee) => RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]));
    $selectedByRole = collect(RefereeCourtRole::cases())
        ->mapWithKeys(fn (RefereeCourtRole $role, int $index): array => [$role->value => $referees[$index]->id])
        ->all();

    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.courts.panel.update', $courts->first(), false), [
            'event_id' => $event->id,
            'referees' => $selectedByRole,
        ])
        ->assertSessionHasNoErrors();

    RefereeCourtAttendance::query()->create([
        'event_id' => $event->id,
        'event_court_id' => $courts->first()->id,
        'referee_id' => $referees->first()->id,
        'attendance_date' => now()->toDateString(),
        'checked_in_at' => now(),
        'method' => 'qr',
    ]);

    $this->actingAs($panitera)
        ->delete(route('admin.pertandingan.wasit.courts.panel.reset', $courts->first(), false), [
            'event_id' => $event->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(EventCourtAssignment::query()->where('event_court_id', $courts->first()->id)->count())->toBe(0)
        ->and(RefereeCourtAttendance::query()->where('event_court_id', $courts->first()->id)->count())->toBe(0)
        ->and(RefereeCourtAssignmentHistory::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($courts->first(), 'court')
            ->where('action', RefereeCourtAssignmentHistory::ActionAssigned)
            ->count())->toBe(5)
        ->and(RefereeCourtAssignmentHistory::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($courts->first(), 'court')
            ->where('action', RefereeCourtAssignmentHistory::ActionReset)
            ->count())->toBe(5);

    $this->actingAs($refereeUser)
        ->get(route('wasit.portal', ['event_id' => $event->id], false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Referee/Portal')
            ->has('assignments', 0));

    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.courts.panel.update', $courts->last(), false), [
            'event_id' => $event->id,
            'referees' => $selectedByRole,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(EventCourtAssignment::query()->where('event_court_id', $courts->last()->id)->count())->toBe(5);
});

test('a referee must attend the event and cannot be assigned to two courts', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $referees = collect(range(1, 6))->map(fn (int $number): Referee => createEventReferee($event, $number));
    $roles = collect(RefereeCourtRole::cases());
    $firstPanel = $roles->mapWithKeys(fn (RefereeCourtRole $role, int $index): array => [$role->value => $referees[$index]->id])->all();

    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.courts.panel.update', $courts->first(), false), [
            'event_id' => $event->id,
            'referees' => $firstPanel,
        ])
        ->assertSessionHasErrors('referees');

    $referees->each(fn (Referee $referee) => RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]));

    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.courts.panel.update', $courts->first(), false), [
            'event_id' => $event->id,
            'referees' => $firstPanel,
        ])
        ->assertSessionHasNoErrors();

    $secondPanel = $roles->mapWithKeys(fn (RefereeCourtRole $role, int $index): array => [
        $role->value => $index === 0 ? $referees[5]->id : $referees[$index]->id,
    ])->all();

    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.courts.panel.update', $courts->last(), false), [
            'event_id' => $event->id,
            'referees' => $secondPanel,
        ])
        ->assertSessionHasErrors('referees');
});

test('Panitera creates an event-scoped referee login account', function () {
    [$event] = createRefereeWorkflowEvent();
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $referee = createEventReferee($event, 1);

    $this->actingAs($panitera)
        ->post(route('admin.pertandingan.wasit.account.store', $referee, false), [
            'event_id' => $event->id,
            'email' => 'wasit.login@example.test',
            'phone' => '081377788899',
            'password' => 'WasitAman123!',
            'password_confirmation' => 'WasitAman123!',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $account = User::query()->where('email', 'wasit.login@example.test')->firstOrFail();

    expect($account->hasRole('Wasit'))->toBeTrue()
        ->and($account->phone)->toBe('6281377788899')
        ->and(Hash::check('WasitAman123!', $account->password))->toBeTrue()
        ->and($referee->fresh()->user_id)->toBe($account->id);

    $this->assertDatabaseHas('event_user', [
        'event_id' => $event->id,
        'user_id' => $account->id,
        'access_role' => Event::AccessRoleStaff,
    ]);
});

test('a referee login lands on the portal for their assigned event', function () {
    [$event] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    createEventReferee($event, 1, $refereeUser);

    $this->post('/login', [
        'email' => $refereeUser->email,
        'password' => 'password',
    ])->assertRedirect(route('wasit.portal'));

    $this->assertAuthenticatedAs($refereeUser);
    expect(session('tenant_event_id'))->toBe($event->id);
});

test('an assigned referee checks in by signed QR before the scoring panel becomes active', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);

    $eventCheckInUrl = URL::temporarySignedRoute('wasit.check-in.event', now()->addHour(), ['event' => $event]);
    $courtCheckInUrl = URL::temporarySignedRoute('wasit.check-in.court', now()->addHour(), [
        'event' => $event,
        'eventCourt' => $court,
    ]);

    $this->actingAs($refereeUser)
        ->get($eventCheckInUrl)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Referee/CheckIn')
            ->where('target.type', 'event')
            ->where('target.is_checked_in', false));

    $this->actingAs($refereeUser)->post($eventCheckInUrl)->assertRedirect();
    expect(RefereeAttendance::query()
        ->whereBelongsTo($event)
        ->whereBelongsTo($referee)
        ->whereDate('attendance_date', now()->toDateString())
        ->where('is_present', true)
        ->where('method', 'qr')
        ->exists())->toBeTrue();

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Scoring')
            ->where('refereeSession.role', 'Wasit Utama')
            ->where('refereeSession.is_checked_in', false));

    $this->actingAs($refereeUser)->post($courtCheckInUrl)->assertRedirect();
    expect(RefereeCourtAttendance::query()
        ->whereBelongsTo($event)
        ->whereBelongsTo($court, 'court')
        ->whereBelongsTo($referee)
        ->whereDate('attendance_date', now()->toDateString())
        ->where('method', 'qr')
        ->exists())->toBeTrue();

    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Pasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => 'embu_direct_final',
        'participant_count' => 4,
        'contingent_count' => 4,
        'generated_at' => now(),
    ]);
    $contingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $refereeUser->id,
        'name' => 'Kontingen Embu Uji',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Uji',
        'phone' => '081234567890',
    ]);
    $athleteOne = Athlete::query()->create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Pertama',
        'gender' => 'L',
    ]);
    $athleteTwo = Athlete::query()->create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Kedua',
        'gender' => 'L',
    ]);
    $participantEntry = AthleteMatchCategoryEntry::query()->create([
        'event_id' => $event->id,
        'athlete_id' => $athleteOne->id,
        'event_match_category_id' => $category->id,
        'team_number' => 1,
    ]);
    AthleteMatchCategoryEntry::query()->create([
        'event_id' => $event->id,
        'athlete_id' => $athleteTwo->id,
        'event_match_category_id' => $category->id,
        'team_number' => 1,
    ]);
    $technique = Technique::query()->create([
        'name' => 'Giwaken Dai Ichi',
        'order' => 1,
        'is_active' => true,
    ]);
    EmbuTeamTechnique::query()->create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'event_match_category_id' => $category->id,
        'team_number' => 1,
        'technique_id' => $technique->id,
        'order' => 1,
    ]);
    $match = TournamentMatch::query()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_entry_id' => $participantEntry->id,
        'participant_label' => 'Tim Embu A',
        'metadata' => [
            'athlete_ids' => [$athleteOne->id, $athleteTwo->id],
            'contingent_id' => $contingent->id,
            'contingent_name' => $contingent->name,
            'team_number' => 1,
        ],
        'status' => 'ready',
        'call_status' => 'participants_called',
    ]);

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Scoring')
            ->where('refereeSession.is_checked_in', true)
            ->where('refereeSession.active_match.id', $match->id)
            ->where('refereeSession.active_match.category_type', 'embu')
            ->where('refereeSession.active_match.participant.kind', 'Pasangan')
            ->where('refereeSession.active_match.participant.athletes.0.name', 'Kenshi Pertama')
            ->where('refereeSession.active_match.participant.athletes.1.name', 'Kenshi Kedua')
            ->where('refereeSession.active_match.participant.techniques.0.name', 'Giwaken Dai Ichi')
            ->where('refereeSession.judge_number', 1)
            ->where('refereeSession.score', null));

    $this->actingAs($refereeUser)
        ->get(route('wasit.portal', ['event_id' => $event->id], false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Referee/Portal')
            ->where('activeEvent.id', $event->id)
            ->where('attendance.event_present', true)
            ->where('assignments.0.role', RefereeCourtRole::Chief->value)
            ->where('assignments.0.is_checked_in', true));
});

test('a checked-in referee can view their attendance history on absensi-wasit', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);

    $this->actingAs($refereeUser)
        ->get(route('wasit.absensi', ['event_id' => $event->id], false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Referee/AttendanceHistory')
            ->where('activeEvent.id', $event->id)
            ->where('summary.today_present', true)
            ->where('summary.total_event_present', 1)
            ->where('summary.total_court_checkins', 1)
            ->has('eventAttendances', 1)
            ->has('courtAttendances', 1));
});

test('a checked-in referee saves their Embu judge sheet and broadcasts the update', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 2, $refereeUser);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::RegionalOne->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);

    $response = $this->actingAs($refereeUser)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores([7, 8, 9, 10, 7, 8, 9, 10, 7, 8]),
            'signature' => refereeSignature(),
            'status' => 'submitted',
        ]);

    $response->assertRedirect()->assertSessionHas('success');
    $this->assertDatabaseHas('embu_judge_scores', [
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'user_id' => $refereeUser->id,
        'judge_number' => 2,
        'role' => RefereeCourtRole::RegionalOne->value,
        'completed_items' => 10,
        'technique_subtotal' => 49,
        'expression_subtotal' => 34,
        'total_score' => 83,
        'status' => 'submitted',
    ]);
    expect(EmbuJudgeScore::query()->whereBelongsTo($match)->firstOrFail()->signed_at)->not->toBeNull();
    EventFacade::assertDispatched(EmbuJudgeScoreUpdated::class, fn (EmbuJudgeScoreUpdated $updated): bool => $updated->matchId === $match->id
        && $updated->judgeNumber === 2
        && $updated->totalScore === 83.0);

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Scoring')
            ->where('refereeSession.judge_number', 2)
            ->where('refereeSession.score.completed_items', 10)
            ->where('refereeSession.score.total_score', 83)
            ->where('refereeSession.score.status', 'submitted'));
});

test('the chief referee records technical Embu penalties by clicking a type and quantity', function () {
    [$event, $courts] = createRefereeWorkflowEvent('chief-penalty');
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);

    $this->actingAs($refereeUser)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 8)),
            'violation_penalties' => [
                'composition_count' => 1,
                'rank_mismatch' => 2,
            ],
            'signature' => refereeSignature(),
            'status' => 'submitted',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $judgeScore = EmbuJudgeScore::query()->whereBelongsTo($match)->firstOrFail();
    expect($judgeScore->violation_penalties)->toBe([
        'composition_count' => 1,
        'rank_mismatch' => 2,
    ])->and((float) $judgeScore->violation_penalty)->toBe(30.0);

    $aggregateScore = EmbuScore::query()->whereBelongsTo($match)->firstOrFail();
    expect($aggregateScore->judge_scores)->toEqual([80])
        ->and((float) $aggregateScore->middle_score)->toBe(80.0)
        ->and((float) $aggregateScore->violation_penalty)->toBe(30.0)
        ->and((float) $aggregateScore->final_score)->toBe(50.0)
        ->and($aggregateScore->status)->toBe('ready_for_verification');

    EventFacade::assertDispatched(EmbuJudgeScoreUpdated::class, fn (EmbuJudgeScoreUpdated $updated): bool => $updated instanceof ShouldBroadcastNow
        && $updated->violationPenalty === 30.0);

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->where('refereeSession.judge_number', 1)
            ->where('refereeSession.can_manage_penalties', true)
            ->has('refereeSession.active_match.automatic_penalty_rules', 2)
            ->has('refereeSession.active_match.penalty_options', 2)
            ->where('refereeSession.score.violation_penalty', 30));
});

test('a non-chief referee cannot record Embu technical penalties', function () {
    [$event, $courts] = createRefereeWorkflowEvent('regional-penalty');
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 2, $refereeUser);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::RegionalOne->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);

    $this->actingAs($refereeUser)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 8)),
            'violation_penalties' => ['composition_count' => 1],
            'signature' => refereeSignature(),
            'status' => 'submitted',
        ])
        ->assertSessionHasErrors('violation_penalties');

    expect(EmbuJudgeScore::query()->whereBelongsTo($match)->exists())->toBeFalse();

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->where('refereeSession.judge_number', 2)
            ->where('refereeSession.can_manage_penalties', false)
            ->has('refereeSession.active_match.automatic_penalty_rules', 0)
            ->has('refereeSession.active_match.penalty_options', 0));
});

test('a completed Embu match closes the assigned referee scoring board', function () {
    [$event, $courts] = createRefereeWorkflowEvent('completed-board');
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->where('refereeSession.active_match.id', $match->id));

    $match->update([
        'status' => 'completed',
        'call_status' => 'completed',
        'timer_status' => 'stopped',
    ]);

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->where('refereeSession.active_match', null));
});

test('a referee sees only their event scoped Embu scoring history', function () {
    [$event, $courts] = createRefereeWorkflowEvent('history');
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $otherReferee = createEventReferee($event, 2);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    $match->update([
        'scheduled_start_at' => Carbon::parse('2026-11-07 09:20:00'),
        'pool' => 'A',
    ]);

    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'user_id' => $refereeUser->id,
        'judge_number' => 1,
        'role' => RefereeCourtRole::Chief->value,
        'aspect_scores' => refereeAspectScores([7, 8, 9, 10, 7, 8, 9, 10, 7, 8]),
        'technique_subtotal' => 49,
        'expression_subtotal' => 34,
        'total_score' => 83,
        'notes' => 'Penampilan stabil.',
    ]);
    EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $otherReferee->id,
        'judge_number' => 2,
        'role' => RefereeCourtRole::RegionalOne->value,
        'total_score' => 90,
    ]);

    [$otherEvent, $otherCourts] = createRefereeWorkflowEvent('other-history');
    $otherMatch = createActiveEmbuMatch($otherEvent, $otherCourts->first());
    $otherEventReferee = createEventReferee($otherEvent, 3);
    EmbuJudgeScore::factory()->create([
        'event_id' => $otherEvent->id,
        'tournament_match_id' => $otherMatch->id,
        'event_court_id' => $otherCourts->first()->id,
        'referee_id' => $otherEventReferee->id,
        'judge_number' => 3,
        'role' => RefereeCourtRole::RegionalTwo->value,
    ]);

    $this->actingAs($refereeUser)
        ->get(route('wasit.history', ['event_id' => $event->id], false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Referee/ScoreHistory')
            ->where('activeEvent.id', $event->id)
            ->where('referee.id', $referee->id)
            ->where('summary.total', 1)
            ->where('summary.submitted', 1)
            ->where('summary.drafts', 0)
            ->where('summary.average_score', 83)
            ->has('scores.data', 1)
            ->where('scores.data.0.match_id', $match->id)
            ->where('scores.data.0.category_name', 'Embu Pasangan Putra Kyu III')
            ->where('scores.data.0.court', 'Court 1')
            ->where('scores.data.0.role_label', 'Wasit Utama')
            ->where('scores.data.0.total_score', 83)
            ->where('scores.data.0.aspect_scores.goho_attack', 7)
            ->where('scores.data.0.is_signed', true)
            ->where('scores.data.0.notes', 'Penampilan stabil.'));

    $this->actingAs($refereeUser)
        ->get(route('wasit.history', ['event_id' => $otherEvent->id], false))
        ->assertNotFound();
});

test('all five Embu judge sheets create a trimmed draft for Panitera verification', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    $scoreRows = [
        array_fill(0, 10, 7),
        array_fill(0, 10, 8),
        array_fill(0, 10, 9),
        array_fill(0, 10, 10),
        [8, 8, 8, 8, 8, 9, 9, 9, 9, 9],
    ];
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);

    foreach (RefereeCourtRole::cases() as $index => $role) {
        $user = createRefereeWorkflowUser($event, 'Wasit');
        $referee = createEventReferee($event, $index + 1, $user);
        EventCourtAssignment::query()->create([
            'event_court_id' => $court->id,
            'staff_type' => 'referee',
            'staff_id' => $referee->id,
            'role' => $role->value,
        ]);
        createDailyRefereeAttendance($event, $court, $referee);

        $this->actingAs($user)
            ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
                'event_id' => $event->id,
                'aspect_scores' => refereeAspectScores($scoreRows[$index]),
                'signature' => refereeSignature(),
                'status' => 'submitted',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
    }

    expect(EmbuJudgeScore::query()->whereBelongsTo($match)->count())->toBe(5);
    $aggregate = EmbuScore::query()->whereBelongsTo($match)->firstOrFail();
    expect($aggregate->judge_scores)->toBe([70, 80, 90, 100, 85])
        ->and((float) $aggregate->middle_score)->toBe(255.0)
        ->and((float) $aggregate->final_score)->toBe(255.0)
        ->and($aggregate->status)->toBe('ready_for_verification')
        ->and($match->fresh()->status)->toBe('ready');

    $this->actingAs($panitera)
        ->get(route('admin.panitera.matches.show', [
            'tournamentMatch' => $match,
            'event_id' => $event->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Panitera/MatchDetail')
            ->has('judgeProgress', 5)
            ->where('judgeProgress.0.referee_name', 'Wasit Event 1')
            ->where('judgeProgress.0.is_active', true)
            ->where('judgeProgress.0.is_signed', true)
            ->where('judgeProgress.0.total_score', 70)
            ->where('judgeProgress.4.total_score', 85)
            ->where('match.result.status', 'ready_for_verification')
            ->where('match.result.middle_score', 255));
});

test('a referee must sign before submitting a complete Embu sheet', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);

    $this->actingAs($refereeUser)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 8)),
            'status' => 'submitted',
        ])
        ->assertSessionHasErrors('signature');

    expect(EmbuJudgeScore::query()->count())->toBe(0);
});

test('a referee cannot score without a daily court check-in', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]);

    $this->actingAs($refereeUser)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 8)),
            'signature' => refereeSignature(),
            'status' => 'submitted',
        ])
        ->assertForbidden();

    expect(EmbuJudgeScore::query()->count())->toBe(0);
});

test('the Embu sheet rejects a score outside the four permitted choices', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);
    $scores = refereeAspectScores(array_fill(0, 10, 8));
    $scores['goho_attack'] = 6;

    $this->actingAs($refereeUser)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => $scores,
            'signature' => refereeSignature(),
            'status' => 'submitted',
        ])
        ->assertSessionHasErrors('aspect_scores.goho_attack');

    expect(EmbuJudgeScore::query()->count())->toBe(0);
});

test('a referee receives 404 when trying to score a match from another event', function () {
    [$authorizedEvent] = createRefereeWorkflowEvent();
    [$otherEvent, $otherCourts] = createRefereeWorkflowEvent('lain');
    $refereeUser = createRefereeWorkflowUser($authorizedEvent, 'Wasit');
    createEventReferee($authorizedEvent, 1, $refereeUser);
    $otherMatch = createActiveEmbuMatch($otherEvent, $otherCourts->first());

    $this->actingAs($refereeUser)
        ->put(route('admin.arbitrase.scoring.embu.update', $otherMatch, false), [
            'event_id' => $authorizedEvent->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 8)),
            'signature' => refereeSignature(),
            'status' => 'submitted',
        ])
        ->assertNotFound();

    expect(EmbuJudgeScore::query()->count())->toBe(0);
});

test('a referee cannot use the QR of a court where they are not assigned', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]);

    EventCourtAssignment::query()->create([
        'event_court_id' => $courts->first()->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::RegionalOne->value,
    ]);

    $wrongCourtUrl = URL::temporarySignedRoute('wasit.check-in.court', now()->addHour(), [
        'event' => $event,
        'eventCourt' => $courts->last(),
    ]);

    $this->actingAs($refereeUser)->post($wrongCourtUrl)->assertForbidden();
    expect(RefereeCourtAttendance::query()->count())->toBe(0);
});

test('an Admin or Panitera displays attendance QR but cannot check in as a referee', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $admin = createRefereeWorkflowUser($event, 'Admin');
    $eventCheckInUrl = URL::temporarySignedRoute('wasit.check-in.event', now()->addHour(), ['event' => $event]);
    $courtCheckInUrl = URL::temporarySignedRoute('wasit.check-in.court', now()->addHour(), [
        'event' => $event,
        'eventCourt' => $courts->first(),
    ]);

    $this->actingAs($admin)->get($eventCheckInUrl)->assertForbidden();
    $this->actingAs($admin)->get($courtCheckInUrl)->assertForbidden();
    expect(RefereeAttendance::query()->count())->toBe(0)
        ->and(RefereeCourtAttendance::query()->count())->toBe(0);
});

test('Admin or Panitera updates daily referee attendance and sees its history', function () {
    [$event] = createRefereeWorkflowEvent();
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $referee = createEventReferee($event, 1);

    $this->travelTo(Carbon::parse('2026-11-07 07:30:00'));
    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.attendance.update', $referee, false), [
            'event_id' => $event->id,
            'attendance_date' => '2026-11-07',
            'is_present' => true,
            'notes' => 'Dikonfirmasi Panitera.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->travelTo(Carbon::parse('2026-11-08 07:30:00'));
    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.attendance.update', $referee, false), [
            'event_id' => $event->id,
            'attendance_date' => '2026-11-08',
            'is_present' => false,
            'notes' => 'Izin sakit.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(RefereeAttendance::query()->whereBelongsTo($event)->whereBelongsTo($referee)->count())->toBe(2);
    expect(RefereeAttendance::query()
        ->whereBelongsTo($event)
        ->whereBelongsTo($referee)
        ->whereDate('attendance_date', '2026-11-08')
        ->where('is_present', false)
        ->where('method', 'manual')
        ->where('notes', 'Izin sakit.')
        ->whereNull('checked_in_at')
        ->where('checked_in_by_user_id', $panitera->id)
        ->exists())->toBeTrue();

    $this->actingAs($panitera)
        ->get(route('admin.pertandingan.wasit.index', ['event_id' => $event->id], false))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tournament/EventReferees')
            ->where('today', '2026-11-08')
            ->where('referees.0.attendance_recorded', true)
            ->where('referees.0.is_present', false)
            ->has('referees.0.attendance_history', 2)
            ->where('referees.0.attendance_history.0.date', '2026-11-08')
            ->where('referees.0.attendance_history.0.notes', 'Izin sakit.')
            ->where('stats.present', 0));

    $this->travelBack();
});

test('event and court QR check-ins create a new attendance record on each day', function () {
    [$event, $courts] = createRefereeWorkflowEvent();
    $panitera = createRefereeWorkflowUser($event, 'Panitera');
    $refereeUser = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $refereeUser);
    $court = $courts->first();

    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);

    $this->travelTo(Carbon::parse('2026-11-07 08:00:00'));
    $eventCheckInUrl = URL::temporarySignedRoute('wasit.check-in.event', now()->addDays(3), ['event' => $event]);
    $courtCheckInUrl = URL::temporarySignedRoute('wasit.check-in.court', now()->addDays(3), [
        'event' => $event,
        'eventCourt' => $court,
    ]);
    $this->actingAs($refereeUser)->post($eventCheckInUrl)->assertRedirect();
    $this->actingAs($refereeUser)->post($courtCheckInUrl)->assertRedirect();

    $this->travelTo(Carbon::parse('2026-11-08 08:00:00'));
    $this->actingAs($refereeUser)->post($eventCheckInUrl)->assertRedirect();
    $this->actingAs($refereeUser)->post($courtCheckInUrl)->assertRedirect();

    expect(RefereeAttendance::query()->whereBelongsTo($event)->whereBelongsTo($referee)->count())->toBe(2)
        ->and(RefereeCourtAttendance::query()->whereBelongsTo($event)->whereBelongsTo($referee)->count())->toBe(2);
    expect(RefereeAttendance::query()
        ->whereBelongsTo($event)
        ->whereBelongsTo($referee)
        ->whereDate('attendance_date', '2026-11-08')
        ->where('is_present', true)
        ->exists())->toBeTrue()
        ->and(RefereeCourtAttendance::query()
            ->whereBelongsTo($event)
            ->whereBelongsTo($court, 'court')
            ->whereBelongsTo($referee)
            ->whereDate('attendance_date', '2026-11-08')
            ->exists())->toBeTrue();

    $this->actingAs($panitera)
        ->put(route('admin.pertandingan.wasit.attendance.update', $referee, false), [
            'event_id' => $event->id,
            'attendance_date' => '2026-11-08',
            'is_present' => false,
            'notes' => 'Dipulangkan karena sakit.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(RefereeAttendance::query()
        ->whereBelongsTo($event)
        ->whereBelongsTo($referee)
        ->whereDate('attendance_date', '2026-11-08')
        ->value('is_present'))->toBeFalse();

    $this->actingAs($refereeUser)
        ->get(route('admin.arbitrase.scoring', [
            'event_id' => $event->id,
            'court_id' => $court->id,
        ], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/Scoring')
            ->where('refereeSession.is_checked_in', false));
    expect(RefereeCourtAttendance::query()->whereBelongsTo($event)->whereBelongsTo($referee)->count())->toBe(2);

    $this->travelBack();
});

test('referee scoring selects the configured version without changing the active match', function (?string $version, string $component) {
    config(['app.wasit_scoring_version' => $version]);
    [$event, $courts] = createRefereeWorkflowEvent('scoring-version');
    $user = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $user);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);

    $this->actingAs($user)
        ->get(route('admin.arbitrase.scoring', ['event_id' => $event->id, 'court_id' => $court->id], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component($component)
            ->where('activeEvent.id', $event->id)
            ->where('refereeSession.active_match.id', $match->id)
            ->where('refereeSession.is_checked_in', true)
            ->where('refereePortalUrl', route('wasit.portal', ['event_id' => $event->id], false)));
})->with([
    'old' => ['old', 'Admin/Arbitration/Scoring'],
    'new' => ['new', 'Admin/Arbitration/ScoringNew'],
    'invalid falls back to old' => ['invalid', 'Admin/Arbitration/Scoring'],
    'missing falls back to old' => [null, 'Admin/Arbitration/Scoring'],
]);

test('new scoring keeps the attendance gate before showing a judge sheet', function () {
    config(['app.wasit_scoring_version' => 'new']);
    [$event, $courts] = createRefereeWorkflowEvent('new-attendance');
    $user = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $user);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);

    $this->actingAs($user)
        ->get(route('admin.arbitrase.scoring', ['event_id' => $event->id], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/ScoringNew')
            ->where('refereeSession.is_checked_in', false));

    $this->actingAs($user)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 8)),
            'signature' => refereeSignature(),
            'status' => 'submitted',
        ])->assertForbidden();

    $this->assertDatabaseCount('embu_judge_scores', 0);
});

test('saving without a penalty field preserves shared penalties and their author', function (string $source) {
    config(['app.wasit_scoring_version' => 'new']);
    [$event, $courts] = createRefereeWorkflowEvent('new-preserve-penalty');
    $user = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $user);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);
    $match->update(['metadata' => ['panitera' => [
        'violation_penalties' => ['composition_count' => 1],
        'violation_penalty' => 10,
        'violation_penalty_source' => $source,
        'violation_penalty_updated_by' => $user->id,
        'violation_penalty_updated_at' => '2026-10-18T10:00:00+07:00',
    ]]]);
    $penaltyMetadata = $match->metadata['panitera'];
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);

    $this->actingAs($user)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 9)),
            'signature' => refereeSignature(),
            'notes' => 'Irama dan transisi teknik sudah baik.',
            'status' => 'submitted',
        ])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('embu_judge_scores', [
        'tournament_match_id' => $match->id,
        'total_score' => 90,
        'violation_penalty' => 10,
        'signature' => refereeSignature(),
        'notes' => 'Irama dan transisi teknik sudah baik.',
        'status' => 'submitted',
    ]);
    $this->assertDatabaseHas('embu_scores', [
        'tournament_match_id' => $match->id,
        'middle_score' => 90,
        'violation_penalty' => 10,
        'final_score' => 80,
    ]);
    expect($match->fresh()->metadata['panitera'])->toBe($penaltyMetadata);
    EventFacade::assertDispatched(EmbuJudgeScoreUpdated::class, fn (EmbuJudgeScoreUpdated $updated): bool => $updated->matchId === $match->id
        && $updated->totalScore === 90.0
        && $updated->violationPenalty === 10.0);
})->with(['chief_referee', 'panitera']);

test('new scoring still shows the score report to administrators', function () {
    config(['app.wasit_scoring_version' => 'new']);
    [$event] = createRefereeWorkflowEvent('new-admin-report');
    $user = createRefereeWorkflowUser($event, 'Super Admin');

    $this->actingAs($user)
        ->get(route('admin.arbitrase.scoring', ['event_id' => $event->id], false))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Arbitration/ScoreReport')
            ->where('activeEvent.id', $event->id));
});

test('legacy chief penalties are preserved when omitted and cleared only when explicitly empty', function (array $penaltyPayload, int $expectedPenalty) {
    [$event, $courts] = createRefereeWorkflowEvent('legacy-penalty');
    $user = createRefereeWorkflowUser($event, 'Wasit');
    $referee = createEventReferee($event, 1, $user);
    $court = $courts->first();
    $match = createActiveEmbuMatch($event, $court);
    EventCourtAssignment::query()->create([
        'event_court_id' => $court->id,
        'staff_type' => 'referee',
        'staff_id' => $referee->id,
        'role' => RefereeCourtRole::Chief->value,
    ]);
    createDailyRefereeAttendance($event, $court, $referee);
    $existingScore = EmbuJudgeScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'user_id' => $user->id,
        'violation_penalties' => ['composition_count' => 1],
        'violation_penalty' => 10,
    ]);
    EventFacade::fake([EmbuJudgeScoreUpdated::class]);

    $this->actingAs($user)
        ->put(route('admin.arbitrase.scoring.embu.update', $match, false), [
            'event_id' => $event->id,
            'aspect_scores' => refereeAspectScores(array_fill(0, 10, 8)),
            'signature' => refereeSignature(),
            'status' => 'submitted',
            ...$penaltyPayload,
        ])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('embu_judge_scores', [
        'id' => $existingScore->id,
        'violation_penalty' => $expectedPenalty,
    ]);
    $this->assertDatabaseCount('embu_judge_scores', 1);
    EventFacade::assertDispatched(EmbuJudgeScoreUpdated::class, fn (EmbuJudgeScoreUpdated $updated): bool => $updated->matchId === $match->id
        && $updated->violationPenalty === (float) $expectedPenalty);
})->with([
    'omitted keeps legacy penalty' => [[], 10],
    'empty array clears penalty from old form' => [['violation_penalties' => []], 0],
]);

/** @return array{Event, Collection<int, EventCourt>} */
function createRefereeWorkflowEvent(?string $identifier = null): array
{
    $nameSuffix = $identifier === null ? '' : ' '.str($identifier)->headline();
    $slugSuffix = $identifier === null ? '' : '-'.$identifier;

    $event = Event::query()->create([
        'name' => 'Event Alur Wasit'.$nameSuffix,
        'slug' => 'event-alur-wasit'.$slugSuffix,
        'venue' => 'GOR Alur Wasit',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-09',
        'is_active' => true,
    ]);

    foreach (range(1, 2) as $number) {
        EventCourt::query()->create([
            'event_id' => $event->id,
            'name' => "Court {$number}",
            'order' => $number,
            'is_active' => true,
        ]);
    }

    return [$event, $event->courts()->orderBy('order')->get()];
}

function createRefereeWorkflowUser(Event $event, string $role): User
{
    Role::findOrCreate($role, 'web');
    $user = User::factory()->create();
    $user->assignRole($role);
    $event->users()->attach($user, ['access_role' => Event::AccessRoleStaff]);

    return $user;
}

function createEventReferee(Event $event, int $number, ?User $user = null): Referee
{
    $referee = Referee::query()->create([
        'user_id' => $user?->id,
        'name' => "Wasit Event {$number}",
        'license_number' => "WST-EVT-{$number}",
        'certification_level' => $number === 1 ? 'Wasit Nasional A' : 'Wasit Daerah',
        'region' => 'Jawa Timur',
        'email' => $user?->email ?? "wasit.event.{$number}@example.test",
        'is_active' => true,
    ]);
    $event->referees()->attach($referee, ['role' => 'referee']);

    return $referee;
}

function createActiveEmbuMatch(Event $event, EventCourt $court): TournamentMatch
{
    $category = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Pasangan Putra Kyu III',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $drawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => 'embu_direct_final',
        'participant_count' => 4,
        'contingent_count' => 4,
        'generated_at' => now(),
    ]);

    return TournamentMatch::query()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'event_court_id' => $court->id,
        'phase' => 'preliminary',
        'round_label' => 'Penyisihan',
        'match_sequence' => 1,
        'participant_label' => 'Tim Embu Aktif',
        'status' => 'ready',
        'call_status' => 'participants_called',
        'timer_status' => 'stopped',
        'timer_elapsed_seconds' => 0,
    ]);
}

function createDailyRefereeAttendance(Event $event, EventCourt $court, Referee $referee): void
{
    RefereeAttendance::query()->create([
        'event_id' => $event->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'is_present' => true,
        'checked_in_at' => now(),
        'method' => 'qr',
    ]);
    RefereeCourtAttendance::query()->create([
        'event_id' => $event->id,
        'event_court_id' => $court->id,
        'referee_id' => $referee->id,
        'attendance_date' => now()->toDateString(),
        'checked_in_at' => now(),
        'method' => 'qr',
    ]);
}

/**
 * @param  list<int>  $values
 * @return array<string, int>
 */
function refereeAspectScores(array $values): array
{
    return array_combine([
        'goho_attack',
        'goho_defense',
        'goho_counter',
        'juho_escape',
        'juho_lock_throw',
        'juho_ground',
        'expression_sequence',
        'expression_stance',
        'expression_spirit',
        'expression_breath_zanshin',
    ], $values);
}

function refereeSignature(): string
{
    return 'data:image/png;base64,'.base64_encode('signed-by-referee');
}
