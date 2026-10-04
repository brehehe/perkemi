<?php

use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use App\Services\ParticipantEligibilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function schoolRules(array $changes = []): array
{
    return array_merge([
        'enabled' => true, 'age_reference_date' => '2026-11-06', 'academic_year_start' => 2026,
        'max_age_years' => 17, 'birth_date_from' => '2009-01-01', 'max_school_grade' => 11,
        'embu_min_age_months' => 156, 'embu_min_school_grade' => 7, 'randori_min_age_months' => 174,
        'require_school_verification' => true, 'require_school_document' => false,
    ], $changes);
}

/** @return array{admin: User, owner: User, event: Event, age: EventAgeCategory, embu: EventMatchCategory, randori: EventMatchCategory, registration: Registration} */
function schoolContext(): array
{
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
    $admin = User::factory()->create();
    $admin->assignRole('Super Admin');
    $owner = User::factory()->create();
    $event = Event::create(['name' => 'POPDA', 'slug' => 'popda-xv-jawa-timur-2026', 'venue' => 'GOR', 'city' => 'Ngawi',
        'start_date' => '2026-11-06', 'end_date' => '2026-11-09', 'is_paid' => false, 'max_match_categories_per_athlete' => 2,
        'participant_rules' => schoolRules()]);
    $contingent = Contingent::create(['event_id' => $event->id, 'user_id' => $owner->id, 'name' => 'Kontingen sekolah', 'city' => 'Ngawi', 'manager_name' => 'Manager', 'phone' => '081234567890']);
    $registration = Registration::create(['event_id' => $event->id, 'contingent_id' => $contingent->id, 'registration_number' => 'SCHOOL-001']);
    $age = EventAgeCategory::create(['event_id' => $event->id, 'name' => 'Pelajar POPDA', 'min_age' => 13, 'max_age' => 16, 'is_active' => true]);
    $embu = EventMatchCategory::create(['event_id' => $event->id, 'age_category_id' => $age->id, 'name' => 'Embu', 'type' => 'embu', 'gender' => 'mixed', 'is_active' => true]);
    $randori = EventMatchCategory::create(['event_id' => $event->id, 'age_category_id' => $age->id, 'name' => 'Randori', 'type' => 'randori', 'gender' => 'male', 'is_active' => true]);

    return compact('admin', 'owner', 'event', 'age', 'embu', 'randori', 'registration');
}

function schoolPayload(array $context, array $changes = []): array
{
    return array_merge(['name' => 'Kenshi Pelajar', 'gender' => 'male', 'kyu_dan' => 'Kyu 2', 'birth_date' => '2009-01-01',
        'school_name' => 'SMK Contoh', 'school_level' => 'SMK', 'school_entry_year' => 2025, 'school_grade' => 11,
        'event_age_category_id' => $context['age']->id, 'category_ids' => [$context['embu']->id]], $changes);
}

function schoolBase(array $context): string
{
    return '/admin/pendaftaran/registrasi/'.$context['registration']->id;
}

test('school event rejects ineligible birth dates, class XII and inconsistent entry years before persistence', function (array $changes, string $error) {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $context = schoolContext();

    $this->actingAs($context['owner'])->post(schoolBase($context).'/athletes', schoolPayload($context, $changes))
        ->assertSessionHasErrors($error);

    $this->assertDatabaseCount('athletes', 0);
    $this->assertDatabaseCount('athlete_match_category_entries', 0);
})->with([
    'class XII despite age seventeen' => [['school_grade' => 12, 'school_entry_year' => 2024], 'school_grade'],
    'claims XI but entered grade X in 2024' => [['school_grade' => 11, 'school_entry_year' => 2024], 'school_entry_year'],
    'still seventeen but born in 2008' => [['birth_date' => '2008-12-31'], 'birth_date'],
    'school is missing' => [['school_name' => ''], 'school_name'],
    'grade and level disagree' => [['school_level' => 'SMP'], 'school_grade'],
    'missing entry year' => [['school_entry_year' => null], 'school_entry_year'],
]);

test('event accepts age seventeen class XI and the class VII alternative for young Embu athletes', function (array $changes) {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $context = schoolContext();

    $this->actingAs($context['owner'])->post(schoolBase($context).'/athletes', schoolPayload($context, $changes))
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('athletes', ['school_grade' => $changes['school_grade'] ?? 11, 'school_entry_year' => $changes['school_entry_year'] ?? 2025]);
    $this->assertDatabaseCount('athlete_match_category_entries', 1);
})->with([
    'maximum age and class' => [[]],
    'twelve-year-old in class VII' => [['birth_date' => '2014-01-01', 'school_level' => 'SMP', 'school_grade' => 7, 'school_entry_year' => 2026]],
]);

test('Randori uses a precise fourteen year six month boundary even with a manually selected age group', function (string $birthDate, bool $passes) {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $context = schoolContext();
    $response = $this->actingAs($context['owner'])->post(schoolBase($context).'/athletes', schoolPayload($context, [
        'birth_date' => $birthDate, 'school_level' => 'SMP', 'school_grade' => 9, 'school_entry_year' => 2024,
        'category_ids' => [$context['randori']->id],
    ]));
    if ($passes) {
        $response->assertSessionHasNoErrors();
        $this->assertDatabaseCount('athlete_match_category_entries', 1);
    } else {
        $response->assertSessionHasErrors(['category_ids' => 'Randori: minimal usia 14 tahun 6 bulan pada tanggal acuan event.']);
        $this->assertDatabaseCount('athletes', 0);
    }
})->with(['exact boundary' => ['2012-05-06', true], 'one day too young' => ['2012-05-07', false]]);

test('the configurable birth cutoff can be removed without removing the age limit', function () {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $context = schoolContext();
    $context['event']->update(['participant_rules' => schoolRules(['birth_date_from' => null])]);
    $payload = schoolPayload($context, ['birth_date' => '2008-11-07']);
    $this->actingAs($context['owner'])->post(schoolBase($context).'/athletes', $payload)->assertSessionHasNoErrors();
    $athlete = Athlete::sole();
    $payload['birth_date'] = '2008-11-06';

    $this->actingAs($context['owner'])->post(schoolBase($context).'/athletes/'.$athlete->id, $payload)->assertSessionHasErrors('birth_date');

    expect($athlete->fresh()->birth_date->format('Y-m-d'))->toBe('2008-11-07');
});

test('school evidence is private, cannot be self-verified, and gates approval until staff checks it', function () {
    Storage::fake('local');
    $this->travelTo(now()->setDate(2026, 10, 4));
    $context = schoolContext();
    $base = schoolBase($context);
    $this->actingAs($context['owner'])->post($base.'/athletes', schoolPayload($context, [
        'school_document' => UploadedFile::fake()->create('surat-sekolah.pdf', 50, 'application/pdf'),
        'school_verified_at' => now(), 'school_verification_hash' => 'forged',
    ]))->assertSessionHasNoErrors();
    $athlete = Athlete::sole();
    Storage::disk('local')->assertExists($athlete->school_document_path);
    expect($athlete->school_verified_at)->toBeNull();
    $this->actingAs($context['admin'])->post($base.'/verify')->assertSessionHasErrors('eligibility');
    $this->actingAs($context['owner'])->post($base.'/athletes/'.$athlete->id.'/verify-school', ['confirmed' => true])->assertForbidden();
    $this->actingAs(User::factory()->create())->get($base.'/athletes/'.$athlete->id.'/school-document')->assertForbidden();
    $this->actingAs($context['owner'])->get($base.'/athletes/'.$athlete->id.'/school-document')->assertOk();
    $this->actingAs($context['admin'])->post($base.'/athletes/'.$athlete->id.'/verify-school', ['confirmed' => false])->assertSessionHasErrors('confirmed');

    $this->actingAs($context['admin'])->post($base.'/athletes/'.$athlete->id.'/verify-school', ['confirmed' => true])->assertSessionHasNoErrors();
    $this->actingAs($context['admin'])->post($base.'/verify')->assertSessionHasNoErrors();

    expect($athlete->fresh()->school_verified_by)->toBe($context['admin']->id);
    expect($context['registration']->fresh()->status)->toBe(RegistrationStatus::Verified);
    $this->actingAs($context['owner'])->get($base.'/detail')->assertInertia(fn (Assert $page) => $page
        ->where('canVerifySchool', false)->where('athletes.0.school_verification_valid', true)->missing('athletes.0.school_verification_hash'));
});

test('identity and school edits invalidate school verification and previous registration approval', function () {
    $context = schoolContext();
    $athlete = $context['registration']->contingent->athletes()->create(schoolPayload($context));
    $athlete->forceFill(['school_document_path' => 'school-documents/example.pdf'])->save();
    $athlete->forceFill(['school_verified_at' => now(), 'school_verified_by' => $context['admin']->id,
        'school_verification_hash' => app(ParticipantEligibilityService::class)->verificationHash($context['event'], $athlete)])->save();
    $context['registration']->update(['status' => RegistrationStatus::Verified]);

    $athlete->update(['school_name' => 'Sekolah baru']);

    expect($athlete->fresh()->school_verified_at)->toBeNull();
    expect($context['registration']->fresh()->status)->toBe(RegistrationStatus::Pending);
});

test('authorized administrators can verify school data and approve registration without an optional document', function (string $accessRole) {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $context = schoolContext();
    $reviewer = User::factory()->create();
    if ($accessRole === 'global_admin') {
        Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $reviewer->assignRole('Admin');
    } else {
        $context['event']->users()->attach($reviewer, ['access_role' => $accessRole]);
    }
    $base = schoolBase($context);
    $this->actingAs($context['owner'])->post($base.'/athletes', schoolPayload($context))->assertSessionHasNoErrors();
    $athlete = Athlete::sole();
    $this->actingAs($reviewer)->post($base.'/verify')->assertSessionHasErrors('eligibility');

    $this->actingAs($reviewer)->post($base.'/athletes/'.$athlete->id.'/verify-school', ['confirmed' => true])
        ->assertSessionHasNoErrors();
    $this->actingAs($reviewer)->post($base.'/verify')->assertSessionHasNoErrors();

    expect($athlete->fresh()->school_document_path)->toBeNull();
    expect($athlete->fresh()->school_verified_by)->toBe($reviewer->id);
    expect($context['registration']->fresh()->status)->toBe(RegistrationStatus::Verified);
    $this->actingAs($reviewer)->get($base.'/detail')->assertInertia(fn (Assert $page) => $page
        ->where('canVerifySchool', true)->where('athletes.0.school_verification_valid', true));
})->with(['global admin' => 'global_admin', 'event administrator' => Event::AccessRoleAdmin, 'event responsible person' => Event::AccessRoleResponsible]);

test('an organizer can require school documents separately from school verification', function () {
    $context = schoolContext();
    $this->actingAs($context['admin'])->put('/admin/master/event/'.$context['event']->id.'/participant-rules',
        schoolRules(['require_school_document' => true]))->assertSessionHasNoErrors();
    $athlete = $context['registration']->contingent->athletes()->create(schoolPayload($context));

    $this->actingAs($context['admin'])->post(schoolBase($context).'/athletes/'.$athlete->id.'/verify-school', ['confirmed' => true])
        ->assertSessionHasErrors('school_document');

    expect($context['event']->fresh()->participant_rules['require_school_document'])->toBeTrue();
    expect($athlete->fresh()->school_verified_at)->toBeNull();
    expect($context['registration']->fresh()->status)->toBe(RegistrationStatus::Pending);
});

test('only authorized event administrators can change rules and changes invalidate prior reviews', function () {
    $context = schoolContext();
    $url = '/admin/master/event/'.$context['event']->id.'/participant-rules';
    $this->put($url, schoolRules())->assertRedirect('/login');
    $this->actingAs($context['owner'])->put($url, schoolRules())->assertForbidden();
    $this->actingAs($context['admin'])->put($url, schoolRules(['max_school_grade' => 6]))->assertSessionHasErrors('max_school_grade');
    $athlete = $context['registration']->contingent->athletes()->create(schoolPayload($context));
    $athlete->forceFill(['school_document_path' => 'document.pdf'])->save();
    $athlete->forceFill(['school_verified_at' => now(), 'school_verification_hash' => app(ParticipantEligibilityService::class)->verificationHash($context['event'], $athlete)])->save();
    $context['registration']->update(['status' => RegistrationStatus::Verified]);

    $this->actingAs($context['admin'])->put($url, schoolRules(['max_age_years' => 16]))->assertSessionHasNoErrors();

    expect($context['event']->fresh()->participant_rules['max_age_years'])->toBe(16);
    expect(app(ParticipantEligibilityService::class)->schoolVerified($context['event']->fresh(), $athlete->fresh()))->toBeFalse();
    expect($context['registration']->fresh()->status)->toBe(RegistrationStatus::Pending);
});

test('master athlete edits and legacy category assignment cannot bypass event eligibility', function () {
    $this->travelTo(now()->setDate(2026, 10, 4));
    $context = schoolContext();
    $athlete = $context['registration']->contingent->athletes()->create(schoolPayload($context));
    $this->actingAs($context['admin'])->put('/admin/master/athlete/'.$athlete->id, schoolPayload($context, [
        'contingent_id' => $athlete->contingent_id, 'school_grade' => 12, 'school_entry_year' => 2024,
    ]))->assertSessionHasErrors('school_grade');
    expect($athlete->fresh()->school_grade)->toBe(11);
    $athlete->update(['birth_date' => '2014-01-01', 'school_level' => 'SMP', 'school_entry_year' => 2026, 'school_grade' => 7]);

    $this->actingAs($context['admin'])->post(schoolBase($context).'/athletes/'.$athlete->id.'/match-category', [
        'event_match_category_id' => $context['randori']->id,
    ])->assertSessionHasErrors('event_match_category_id');

    $this->assertDatabaseCount('athlete_match_category_entries', 0);
});

test('the POPDA command previews first and updates only its existing event without seeding participants', function () {
    $context = schoolContext();
    $context['event']->update(['participant_rules' => null]);
    $other = Event::create(['name' => 'Event lain', 'slug' => 'lain', 'venue' => 'GOR', 'city' => 'Ngawi', 'start_date' => '2026-11-06', 'end_date' => '2026-11-07']);
    $this->artisan('event:configure-popda-eligibility')->assertSuccessful();
    expect($context['event']->fresh()->participant_rules)->toBeNull();

    $this->artisan('event:configure-popda-eligibility', ['--apply' => true])->assertSuccessful();

    expect($context['event']->fresh()->participant_rules)->toBe(schoolRules());
    expect($context['age']->fresh()->max_age)->toBe(17);
    expect($other->fresh()->participant_rules)->toBeNull();
    $this->assertDatabaseCount('athletes', 0);
    $this->assertDatabaseCount('contingents', 1);
});

test('verified registration blocks contingent copies while organizers can copy and reopen school review', function () {
    $context = schoolContext();
    $previousEvent = Event::create(['name' => 'Event sebelumnya', 'slug' => 'previous', 'venue' => 'GOR', 'city' => 'Ngawi',
        'start_date' => '2025-11-06', 'end_date' => '2025-11-07']);
    $sourceContingent = Contingent::create(['event_id' => $previousEvent->id, 'user_id' => $context['owner']->id,
        'name' => 'Kontingen sebelumnya', 'city' => 'Ngawi', 'manager_name' => 'Manager', 'phone' => '081234567890']);
    $source = $sourceContingent->athletes()->create(schoolPayload($context, ['event_age_category_id' => null]));
    $source->forceFill(['school_document_path' => 'previous.pdf'])->save();
    $source->forceFill(['school_verified_at' => now(), 'school_verified_by' => $context['admin']->id,
        'school_verification_hash' => 'previous-review'])->save();
    $context['registration']->update(['status' => RegistrationStatus::Verified]);

    $this->actingAs($context['owner'])->post(schoolBase($context).'/athletes/copy', ['athlete_id' => $source->id])
        ->assertSessionHasErrors('registration');
    expect($context['registration']->contingent->athletes()->count())->toBe(0);

    $this->actingAs($context['admin'])->post(schoolBase($context).'/athletes/copy', ['athlete_id' => $source->id])
        ->assertSessionHasNoErrors();

    $copy = $context['registration']->contingent->athletes()->sole();
    expect($copy->school_document_path)->toBeNull()
        ->and($copy->school_verified_at)->toBeNull()
        ->and($copy->school_verification_hash)->toBeNull();
    expect($context['registration']->fresh()->status)->toBe(RegistrationStatus::Pending);
    expect($source->fresh()->school_verified_at)->not->toBeNull();
});
