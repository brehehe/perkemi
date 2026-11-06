<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuTeamTechnique;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\Registration;
use App\Models\Technique;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('match categories report page renders with correct categories, teams, techniques, and stats', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    $staff = User::factory()->create();
    $event = Event::create([
        'name' => 'Event Laporan Kejuaraan',
        'slug' => 'event-laporan',
        'tenant_subdomain' => 'event-laporan',
        'venue' => 'GOR Pertandingan',
        'city' => 'Surabaya',
        'start_date' => '2026-12-01',
        'end_date' => '2026-12-03',
        'max_match_categories_per_athlete' => 3,
        'is_active' => true,
    ]);
    $event->users()->attach($staff, ['access_role' => 'staff']);

    $contingentA = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $staff->id,
        'name' => 'Kontingen A',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei A',
        'phone' => '081234567890',
    ]);
    $contingentB = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $staff->id,
        'name' => 'Kontingen B',
        'city' => 'Malang',
        'manager_name' => 'Sensei B',
        'phone' => '081234567891',
    ]);

    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingentA->id,
        'registration_number' => 'REG-A',
    ]);
    Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingentB->id,
        'registration_number' => 'REG-B',
    ]);

    $athleteA1 = Athlete::create(['contingent_id' => $contingentA->id, 'name' => 'Kenshi A1', 'gender' => 'male', 'kyu_dan' => 'Kyu 1']);
    $athleteA2 = Athlete::create(['contingent_id' => $contingentA->id, 'name' => 'Kenshi A2', 'gender' => 'male', 'kyu_dan' => 'Kyu 2']);
    $athleteB1 = Athlete::create(['contingent_id' => $contingentB->id, 'name' => 'Kenshi B1', 'gender' => 'male', 'kyu_dan' => 'Kyu 3', 'weight' => 52.5]);

    $embuCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 16,
        'max_athletes_per_team' => 2,
        'is_active' => true,
        'order' => 1,
    ]);

    $randoriCategory = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra Kelas 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 16,
        'min_weight' => 50.0,
        'max_weight' => 55.0,
        'is_active' => true,
        'order' => 2,
    ]);

    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $athleteA1->id,
        'event_match_category_id' => $embuCategory->id,
        'team_number' => 1,
    ]);
    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $athleteA2->id,
        'event_match_category_id' => $embuCategory->id,
        'team_number' => 1,
    ]);

    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $athleteB1->id,
        'event_match_category_id' => $randoriCategory->id,
        'team_number' => 1,
    ]);

    $tech1 = Technique::create(['name' => 'Teknik Pertama', 'order' => 1, 'is_active' => true]);
    $tech2 = Technique::create(['name' => 'Teknik Kedua', 'order' => 2, 'is_active' => true]);

    EmbuTeamTechnique::create([
        'event_id' => $event->id,
        'contingent_id' => $contingentA->id,
        'event_match_category_id' => $embuCategory->id,
        'team_number' => 1,
        'technique_id' => $tech1->id,
        'order' => 1,
    ]);
    EmbuTeamTechnique::create([
        'event_id' => $event->id,
        'contingent_id' => $contingentA->id,
        'event_match_category_id' => $embuCategory->id,
        'team_number' => 1,
        'technique_id' => $tech2->id,
        'order' => 2,
    ]);

    $response = $this->actingAs($staff)
        ->get('http://event-laporan.localhost/admin/pendaftaran/laporan-nomor-pertandingan');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registration/MatchCategoriesReport')
            ->where('activeEvent.id', $event->id)
            ->where('stats.total_categories', 2)
            ->where('stats.total_embu_categories', 1)
            ->where('stats.total_randori_categories', 1)
            ->where('stats.total_embu_teams', 1)
            ->where('stats.embu_teams_with_techniques', 1)
            ->where('stats.embu_teams_without_techniques', 0)
            ->where('stats.total_athletes', 3)
            ->where('stats.total_contingents', 2)
            ->has('categories', 2)
            ->where('categories.0.name', 'Embu Berpasangan Putra')
            ->where('categories.0.total_teams', 1)
            ->where('categories.0.teams.0.contingent_name', 'Kontingen A')
            ->where('categories.0.teams.0.techniques.0.name', 'Teknik Pertama')
            ->where('categories.0.teams.0.techniques.1.name', 'Teknik Kedua')
            ->where('categories.1.name', 'Randori Putra Kelas 55 kg')
            ->where('categories.1.total_athletes', 1)
            ->where('categories.1.randori_athletes.0.name', 'Kenshi B1')
        );
});

