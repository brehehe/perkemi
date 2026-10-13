<?php

use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('public athlete directory exposes history and titles without exposing nik', function () {
    $event = Event::create([
        'name' => 'POPDA Atlet',
        'slug' => 'popda-atlet',
        'venue' => 'GOR Atlet',
        'city' => 'Surabaya',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $owner = User::factory()->create();
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $owner->id,
        'name' => 'Kontingen Garuda',
        'city' => 'Surabaya',
        'manager_name' => 'Manajer Garuda',
        'phone' => '081234567890',
    ]);
    $athlete = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Berprestasi',
        'nik' => '3578000000000001',
        'kenshi_number' => 'K-001',
        'gender' => 'L',
        'kyu_dan' => 'Kyu 1',
    ]);
    $category = EventMatchCategory::create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'is_active' => true,
    ]);
    AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $athlete->id,
        'event_match_category_id' => $category->id,
    ]);
    $athleteEntry = AthleteMatchCategoryEntry::query()->whereBelongsTo($athlete)->firstOrFail();
    $opponent = Athlete::create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Lawan',
        'nik' => '3578000000000002',
        'kenshi_number' => 'K-002',
        'gender' => 'L',
        'kyu_dan' => 'Kyu 1',
    ]);
    $opponentEntry = AthleteMatchCategoryEntry::create([
        'event_id' => $event->id,
        'athlete_id' => $opponent->id,
        'event_match_category_id' => $category->id,
    ]);
    $drawing = TournamentDrawing::factory()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'bracket_type' => 'single_elimination',
    ]);
    $match = TournamentMatch::factory()->create([
        'tournament_drawing_id' => $drawing->id,
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'red_entry_id' => $athleteEntry->id,
        'blue_entry_id' => $opponentEntry->id,
        'red_label' => $athlete->name,
        'blue_label' => $opponent->name,
        'scheduled_start_at' => '2026-11-02 09:00:00',
        'status' => 'completed',
    ]);
    RandoriScore::factory()->create([
        'event_id' => $event->id,
        'tournament_match_id' => $match->id,
        'aka_total' => 20,
        'shiro_total' => 10,
        'winner_corner' => 'aka',
    ]);
    TournamentResult::create([
        'event_id' => $event->id,
        'event_match_category_id' => $category->id,
        'contingent_id' => $contingent->id,
        'athlete_id' => $athlete->id,
        'contingent_name' => $contingent->name,
        'rank' => 1,
        'match_category' => $category->name,
    ]);

    $this->get('/athelete?search=Kenshi%20Berprestasi')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Athletes/Index')
            ->has('athletes.data', 1)
            ->where('athletes.data.0.name', 'Kenshi Berprestasi')
            ->where('athletes.data.0.gold_count', 1)
            ->missing('athletes.data.0.nik')
            ->has('topChampions', 1));

    $this->get('/athelete/'.$athlete->id)
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Athletes/Show')
            ->where('athlete.name', 'Kenshi Berprestasi')
            ->where('athlete.played_count', 1)
            ->where('athlete.wins_count', 1)
            ->where('athlete.win_rate', 100)
            ->where('athlete.yearly_statistics.0.year', 2026)
            ->where('athlete.yearly_statistics.0.played', 1)
            ->where('athlete.match_history.0.opponent', 'Kenshi Lawan')
            ->where('athlete.match_history.0.result', 'win')
            ->where('athlete.history.0.event', 'POPDA Atlet')
            ->where('athlete.history.0.title', 'Emas (Juara 1)')
            ->missing('athlete.nik'));
});
