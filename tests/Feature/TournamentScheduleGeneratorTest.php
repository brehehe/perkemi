<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Rundown;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Services\TournamentScheduleGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

test('embu schedule fills consecutive slots by reordering available participants without athlete conflicts', function () {
    $event = Event::query()->create([
        'name' => 'Event Jadwal Embu Rapat',
        'slug' => 'event-jadwal-embu-rapat',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-08',
        'match_duration_minutes' => 10,
        'minimum_rest_minutes' => 10,
        'status' => 'open_registration',
        'is_active' => true,
    ]);
    $courts = collect([1, 2])->map(fn (int $number) => EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => "Court {$number}",
        'order' => $number,
        'is_active' => true,
    ]));
    $session = Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-07 08:00:00',
        'end_time' => '2026-11-07 10:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);
    $categories = collect([1, 2])->map(fn (int $number) => EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => "Embu Nomor {$number}",
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'max_athletes_per_team' => 1,
        'order' => $number,
        'is_active' => true,
    ]));
    $athleteIds = collect(range(1, 4))->map(fn (): string => (string) Str::uuid());
    $uniqueSecondaryAthleteId = (string) Str::uuid();
    $categoryAthletes = [
        $categories[0]->id => [$athleteIds[3], $athleteIds[2], $athleteIds[1], $athleteIds[0]],
        $categories[1]->id => [$uniqueSecondaryAthleteId, $athleteIds[0], $athleteIds[2], $athleteIds[1]],
    ];

    foreach ($categories as $category) {
        $drawing = TournamentDrawing::query()->create([
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'status' => 'generated',
            'bracket_type' => 'embu_direct_final',
            'participant_count' => 4,
            'contingent_count' => 4,
            'generated_at' => now(),
        ]);

        foreach ($categoryAthletes[$category->id] as $index => $athleteId) {
            TournamentMatch::query()->create([
                'tournament_drawing_id' => $drawing->id,
                'event_id' => $event->id,
                'event_match_category_id' => $category->id,
                'phase' => 'preliminary',
                'round_label' => 'Babak Penyisihan',
                'pool' => 'A',
                'match_sequence' => $index + 1,
                'bracket_position' => $index + 1,
                'participant_label' => "Atlet {$index}",
                'status' => 'pending',
                'is_bye' => false,
                'metadata' => ['athlete_ids' => [$athleteId]],
            ]);
        }
    }

    app(TournamentScheduleGenerator::class)->schedule($event);

    foreach ($categories as $category) {
        $categoryMatches = TournamentMatch::query()
            ->where('event_match_category_id', $category->id)
            ->orderBy('scheduled_start_at')
            ->get();
        $starts = $categoryMatches
            ->map(fn (TournamentMatch $match): CarbonImmutable => CarbonImmutable::instance($match->scheduled_start_at));

        expect($categoryMatches->pluck('event_court_id')->unique())->toHaveCount(1)
            ->and($categoryMatches->pluck('match_sequence')->all())->toBe([1, 2, 3, 4])
            ->and($starts->sliding(2)->every(
                fn (Collection $pair): bool => $pair->first()->diffInMinutes($pair->last()) === 10.0,
            ))->toBeTrue();
    }

    expect(TournamentMatch::query()
        ->whereBelongsTo($event)
        ->pluck('event_court_id')
        ->unique())->toHaveCount($courts->count());

    $scheduledMatches = TournamentMatch::query()
        ->whereBelongsTo($event)
        ->orderBy('scheduled_start_at')
        ->get();

    foreach ($athleteIds->take(3) as $athleteId) {
        $athleteMatches = $scheduledMatches
            ->filter(fn (TournamentMatch $match): bool => in_array($athleteId, $match->metadata['athlete_ids'], true))
            ->values();

        expect($athleteMatches)->toHaveCount(2)
            ->and($athleteMatches->last()->scheduled_start_at->greaterThanOrEqualTo(
                $athleteMatches->first()->scheduled_end_at->addMinutes(10),
            ))->toBeTrue();
    }
});

test('independent embu category fills the second court at session start while shared athletes wait', function () {
    $event = Event::query()->create([
        'name' => 'Event Jadwal Court Serentak',
        'slug' => 'event-jadwal-court-serentak',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-07',
        'match_duration_minutes' => 10,
        'minimum_rest_minutes' => 10,
        'status' => 'open_registration',
        'is_active' => true,
    ]);
    $courts = collect([1, 2])->map(fn (int $number) => EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => "Court {$number}",
        'order' => $number,
        'is_active' => true,
    ]));
    Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-07 08:00:00',
        'end_time' => '2026-11-07 10:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);
    $sharedAthlete = (string) Str::uuid();
    $firstCategoryAthletes = collect(range(1, 10))
        ->map(fn (int $index): string => $index === 1 ? $sharedAthlete : (string) Str::uuid())
        ->all();
    $sharedCategoryAthletes = [$sharedAthlete, (string) Str::uuid()];
    $independentAthletes = collect(range(1, 4))->map(fn (): string => (string) Str::uuid())->all();
    $categoryAthletes = [$firstCategoryAthletes, $sharedCategoryAthletes, $independentAthletes];
    $categories = collect($categoryAthletes)->map(function (array $athleteIds, int $index) use ($event): EventMatchCategory {
        $category = EventMatchCategory::query()->create([
            'event_id' => $event->id,
            'name' => 'Embu Serentak '.($index + 1),
            'type' => 'embu',
            'gender' => 'male',
            'capacity' => 8,
            'order' => $index + 1,
            'is_active' => true,
        ]);
        $drawing = TournamentDrawing::query()->create([
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'status' => 'generated',
            'bracket_type' => 'embu_direct_final',
            'participant_count' => 2,
            'contingent_count' => 2,
            'generated_at' => now(),
        ]);

        foreach ($athleteIds as $athleteIndex => $athleteId) {
            TournamentMatch::query()->create([
                'tournament_drawing_id' => $drawing->id,
                'event_id' => $event->id,
                'event_match_category_id' => $category->id,
                'phase' => 'preliminary',
                'round_label' => 'Babak Penyisihan',
                'match_sequence' => $athleteIndex + 1,
                'bracket_position' => $athleteIndex + 1,
                'participant_label' => 'Tim '.($athleteIndex + 1),
                'status' => 'pending',
                'is_bye' => false,
                'metadata' => ['athlete_ids' => [$athleteId]],
            ]);
        }

        return $category;
    });

    app(TournamentScheduleGenerator::class)->schedule($event);

    $courtStartTimes = TournamentMatch::query()
        ->whereBelongsTo($event)
        ->orderBy('scheduled_start_at')
        ->get()
        ->groupBy('event_court_id')
        ->map(fn (Collection $courtMatches): string => $courtMatches->first()->scheduled_start_at->format('H:i'));
    $sharedCategoryStart = TournamentMatch::query()
        ->where('event_match_category_id', $categories[1]->id)
        ->min('scheduled_start_at');
    $independentCategoryStart = TournamentMatch::query()
        ->where('event_match_category_id', $categories[2]->id)
        ->min('scheduled_start_at');

    expect($courtStartTimes->keys()->sort()->values()->all())->toBe($courts->pluck('id')->sort()->values()->all())
        ->and($courtStartTimes->values()->unique()->all())->toBe(['08:00'])
        ->and(CarbonImmutable::parse($sharedCategoryStart)->format('H:i'))->toBe('08:40')
        ->and(CarbonImmutable::parse($independentCategoryStart)->format('H:i'))->toBe('08:00');
});

test('embu and randori category blocks remain consecutive after schedule regeneration', function () {
    $event = Event::query()->create([
        'name' => 'Event Jadwal Semua Nomor Rapat',
        'slug' => 'event-jadwal-semua-nomor-rapat',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-08',
        'match_duration_minutes' => 10,
        'minimum_rest_minutes' => 10,
        'status' => 'open_registration',
        'is_active' => true,
    ]);
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);
    Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-07 08:00:00',
        'end_time' => '2026-11-07 10:00:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);
    $embuCategory = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Embu Berpasangan Putra',
        'type' => 'embu',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 1,
        'is_active' => true,
    ]);
    $randoriCategory = EventMatchCategory::query()->create([
        'event_id' => $event->id,
        'name' => 'Randori Putra 55 kg',
        'type' => 'randori',
        'gender' => 'male',
        'capacity' => 8,
        'order' => 2,
        'is_active' => true,
    ]);
    $embuDrawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $embuCategory->id,
        'status' => 'generated',
        'bracket_type' => 'embu_direct_final',
        'participant_count' => 2,
        'contingent_count' => 2,
        'generated_at' => now(),
    ]);
    $randoriDrawing = TournamentDrawing::query()->create([
        'event_id' => $event->id,
        'event_match_category_id' => $randoriCategory->id,
        'status' => 'generated',
        'bracket_type' => 'single_elimination',
        'participant_count' => 4,
        'contingent_count' => 4,
        'generated_at' => now(),
    ]);
    $embuAthletes = [(string) Str::uuid(), (string) Str::uuid()];
    $randoriAthletes = collect(range(1, 4))->map(fn (): string => (string) Str::uuid())->all();
    $createMatch = function (
        TournamentDrawing $drawing,
        EventMatchCategory $category,
        int $sequence,
        string $phase,
        array $athleteIds,
    ) use ($event): void {
        TournamentMatch::query()->create([
            'tournament_drawing_id' => $drawing->id,
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'phase' => $phase,
            'round_label' => $phase === 'final' ? 'Babak Final' : 'Babak Penyisihan',
            'match_sequence' => $sequence,
            'bracket_position' => $sequence,
            'red_label' => "Peserta Merah {$sequence}",
            'blue_label' => "Peserta Biru {$sequence}",
            'status' => 'pending',
            'is_bye' => false,
            'metadata' => ['athlete_ids' => $athleteIds],
        ]);
    };

    $createMatch($embuDrawing, $embuCategory, 1, 'preliminary', [$embuAthletes[0]]);
    $createMatch($embuDrawing, $embuCategory, 2, 'preliminary', [$embuAthletes[1]]);
    $createMatch($embuDrawing, $embuCategory, 3, 'final', $embuAthletes);
    $createMatch($randoriDrawing, $randoriCategory, 1, 'preliminary', array_slice($randoriAthletes, 0, 2));
    $createMatch($randoriDrawing, $randoriCategory, 2, 'preliminary', array_slice($randoriAthletes, 2, 2));
    $createMatch($randoriDrawing, $randoriCategory, 3, 'final', $randoriAthletes);

    app(TournamentScheduleGenerator::class)->schedule($event);
    app(TournamentScheduleGenerator::class)->schedule($event);

    $embuMatches = TournamentMatch::query()
        ->where('event_match_category_id', $embuCategory->id)
        ->orderBy('scheduled_start_at')
        ->get();
    $randoriMatches = TournamentMatch::query()
        ->where('event_match_category_id', $randoriCategory->id)
        ->orderBy('scheduled_start_at')
        ->get();

    expect($embuMatches->pluck('event_court_id')->unique()->all())->toBe([$court->id])
        ->and($embuMatches->map(fn (TournamentMatch $match): string => $match->scheduled_start_at->format('H:i'))->all())
        ->toBe(['08:00', '08:10', '08:20'])
        ->and($randoriMatches->pluck('event_court_id')->unique()->all())->toBe([$court->id])
        ->and($randoriMatches->map(fn (TournamentMatch $match): string => $match->scheduled_start_at->format('H:i'))->all())
        ->toBe(['08:30', '08:40', '08:50'])
        ->and($embuMatches->concat($randoriMatches)->every(
            fn (TournamentMatch $match): bool => $match->scheduled_start_at->diffInMinutes($match->scheduled_end_at) === 10.0,
        ))->toBeTrue();
});

test('next category starts in the remaining slot before continuing in the following session', function () {
    $event = Event::query()->create([
        'name' => 'Event Jadwal Lintas Sesi',
        'slug' => 'event-jadwal-lintas-sesi',
        'venue' => 'GOR Kempo',
        'city' => 'Surabaya',
        'start_date' => '2026-11-07',
        'end_date' => '2026-11-07',
        'match_duration_minutes' => 10,
        'minimum_rest_minutes' => 10,
        'status' => 'open_registration',
        'is_active' => true,
    ]);
    $court = EventCourt::query()->create([
        'event_id' => $event->id,
        'name' => 'Court 1',
        'order' => 1,
        'is_active' => true,
    ]);
    $morningSession = Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-07 08:00:00',
        'end_time' => '2026-11-07 08:30:00',
        'name' => 'Sesi Pagi',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 1,
    ]);
    $afternoonSession = Rundown::query()->create([
        'event_id' => $event->id,
        'date' => '2026-11-07 09:00:00',
        'end_time' => '2026-11-07 10:00:00',
        'name' => 'Sesi Siang',
        'type' => 'Pertandingan',
        'is_match_session' => true,
        'order' => 2,
    ]);
    $categories = collect([2, 3])->map(function (int $matchCount, int $index) use ($event): array {
        $category = EventMatchCategory::query()->create([
            'event_id' => $event->id,
            'name' => 'Embu Nomor '.($index + 1),
            'type' => 'embu',
            'gender' => 'male',
            'capacity' => 8,
            'order' => $index + 1,
            'is_active' => true,
        ]);
        $drawing = TournamentDrawing::query()->create([
            'event_id' => $event->id,
            'event_match_category_id' => $category->id,
            'status' => 'generated',
            'bracket_type' => 'embu_direct_final',
            'participant_count' => $matchCount,
            'contingent_count' => $matchCount,
            'generated_at' => now(),
        ]);

        foreach (range(1, $matchCount) as $sequence) {
            TournamentMatch::query()->create([
                'tournament_drawing_id' => $drawing->id,
                'event_id' => $event->id,
                'event_match_category_id' => $category->id,
                'phase' => 'preliminary',
                'round_label' => 'Babak Penyisihan',
                'match_sequence' => $sequence,
                'bracket_position' => $sequence,
                'participant_label' => "Tim {$sequence}",
                'status' => 'pending',
                'is_bye' => false,
                'metadata' => ['athlete_ids' => [(string) Str::uuid()]],
            ]);
        }

        return ['category' => $category, 'drawing' => $drawing];
    });

    app(TournamentScheduleGenerator::class)->schedule($event);

    $firstCategoryMatches = $categories[0]['drawing']->matches()->orderBy('scheduled_start_at')->get();
    $nextCategoryMatches = $categories[1]['drawing']->matches()->orderBy('scheduled_start_at')->get();

    expect($firstCategoryMatches->map(
        fn (TournamentMatch $match): string => $match->scheduled_start_at->format('H:i'),
    )->all())->toBe(['08:00', '08:10'])
        ->and($nextCategoryMatches->pluck('event_court_id')->unique()->all())->toBe([$court->id])
        ->and($nextCategoryMatches->map(
            fn (TournamentMatch $match): string => $match->scheduled_start_at->format('H:i'),
        )->all())->toBe(['08:20', '09:00', '09:10'])
        ->and($nextCategoryMatches->pluck('rundown_id')->all())->toBe([
            $morningSession->id,
            $afternoonSession->id,
            $afternoonSession->id,
        ]);
});
