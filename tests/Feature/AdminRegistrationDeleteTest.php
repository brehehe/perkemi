<?php

use App\Enums\RegistrationStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Role;
use App\Models\Technique;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('admin can delete a registration and cleanup related entries', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Storage::fake('local');

    Role::findOrCreate('Admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejurda Hapus Registrasi 2026',
        'slug' => 'kejurda-hapus-registrasi-2026',
        'tenant_subdomain' => 'kejurda-hapus-registrasi-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($admin, ['access_role' => 'admin']);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $admin->id,
        'name' => 'Dojo Test Hapus',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Hapus',
        'phone' => '081234567890',
    ]);

    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Hapus',
        'gender' => 'male',
        'birth_date' => '2005-01-01',
        'kyu' => '1',
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Putra I DAN',
        'match_type' => 'embu',
        'gender' => 'male',
    ]);

    $entry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $athlete->id,
        'event_match_category_id' => $category->id,
    ]);

    $technique = Technique::create([
        'name' => 'Kote Nuki',
    ]);

    EmbuTeamTechnique::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'contingent_id' => $contingent->id,
        'technique_id' => $technique->id,
        'team_number' => 1,
        'order' => 1,
    ]);

    $registration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-HAPUS-001',
        'status' => RegistrationStatus::Verified,
        'total_amount' => 500000,
        'final_amount' => 500000,
        'payment_proof_path' => 'proofs/fake.pdf',
    ]);

    Storage::disk('local')->put('proofs/fake.pdf', 'dummy content');

    $response = $this->actingAs($admin)
        ->delete("http://kejurda-hapus-registrasi-2026.localhost/admin/pendaftaran/registrasi/{$registration->id}");

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Registration should be soft-deleted
    expect(Registration::find($registration->id))->toBeNull();
    expect(Registration::withTrashed()->find($registration->id))->not->toBeNull();

    // Related match category entries and techniques should be removed
    expect(AthleteMatchCategoryEntry::where('event_id', $event->id)->where('athlete_id', $athlete->id)->exists())->toBeFalse();
    expect(EmbuTeamTechnique::where('event_id', $event->id)->where('contingent_id', $contingent->id)->exists())->toBeFalse();
    expect(Storage::disk('local')->exists('proofs/fake.pdf'))->toBeFalse();
});

test('cannot delete registration if match is already in progress or completed', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    Role::findOrCreate('Admin', 'web');
    $admin = User::factory()->create();
    $admin->assignRole('Admin');

    $event = Event::create([
        'name' => 'Kejurda Match Active 2026',
        'slug' => 'kejurda-match-active-2026',
        'tenant_subdomain' => 'kejurda-match-active-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($admin, ['access_role' => 'admin']);

    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $admin->id,
        'name' => 'Dojo Bertanding',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Tanding',
        'phone' => '081234567890',
    ]);

    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Tanding',
        'gender' => 'male',
        'birth_date' => '2005-01-01',
        'kyu' => '1',
    ]);

    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Tandoku Embu',
        'match_type' => 'embu',
        'gender' => 'male',
    ]);

    $entry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $athlete->id,
        'event_match_category_id' => $category->id,
    ]);

    $drawing = TournamentDrawing::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'status' => 'in_progress',
        'bracket_type' => 'embu_direct_final',
        'participant_count' => 1,
        'contingent_count' => 1,
        'generated_at' => now(),
    ]);

    TournamentMatch::create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'participant_entry_id' => $entry->id,
        'phase' => 'preliminary',
        'round_label' => 'Final',
        'match_sequence' => 1,
        'status' => 'completed',
    ]);

    $registration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-ACTIVE-001',
        'status' => RegistrationStatus::Verified,
    ]);

    $response = $this->actingAs($admin)
        ->from('http://kejurda-match-active-2026.localhost/admin/pendaftaran/registrasi')
        ->delete("http://kejurda-match-active-2026.localhost/admin/pendaftaran/registrasi/{$registration->id}");

    $response->assertSessionHasErrors(['registration']);
    expect(Registration::find($registration->id))->not->toBeNull();
});
