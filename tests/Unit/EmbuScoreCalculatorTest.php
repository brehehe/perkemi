<?php

use App\Services\Panitera\EmbuScoreCalculator;

test('five judge scores discard one highest and one lowest score', function () {
    $result = (new EmbuScoreCalculator)->calculate([80, 82, 90, 85, 70], 90, 'Embu Tandoku Putra');

    expect($result)
        ->middle_score->toBe(247.0)
        ->time_penalty->toBe(0.0)
        ->final_score->toBe(247.0);
});

test('embu time penalty follows the official duration boundaries', function (string $category, int $duration, float $expectedPenalty) {
    $penalty = (new EmbuScoreCalculator)->timePenalty($duration, $category);

    expect($penalty)->toBe($expectedPenalty);
})->with([
    'tandoku below 50 seconds' => ['Embu Tandoku Putra', 49, 10.0],
    'tandoku from 50 seconds' => ['Embu Tandoku Putra', 50, 5.0],
    'tandoku ideal range' => ['Embu Tandoku Putra', 90, 0.0],
    'tandoku overtime warning' => ['Embu Tandoku Putra', 91, 5.0],
    'tandoku excessive overtime' => ['Embu Tandoku Putra', 101, 10.0],
    'pair below 80 seconds' => ['Embu Berpasangan Putri', 79, 10.0],
    'pair from 80 seconds' => ['Embu Berpasangan Putri', 80, 5.0],
    'pair ideal range' => ['Embu Beregu Campuran', 120, 0.0],
    'pair overtime warning' => ['Embu Berpasangan Putri', 121, 5.0],
    'pair excessive overtime' => ['Embu Beregu Campuran', 131, 10.0],
]);

test('fewer than five scores are summed without trimming', function () {
    $result = (new EmbuScoreCalculator)->calculate([80, 81, 82, 83], null, 'Embu Beregu');

    expect($result['middle_score'])->toBe(326.0)
        ->and($result['final_score'])->toBe(326.0);
});
