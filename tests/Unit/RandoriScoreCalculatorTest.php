<?php

use App\Services\Panitera\RandoriScoreCalculator;

test('randori total applies technique points and penalties', function () {
    $total = (new RandoriScoreCalculator)->total([
        'mujoken' => 1,
        'ippon' => 2,
        'waza_ari' => 1,
        'yusei' => 1,
        'batsu_5' => 1,
        'batsu_10' => 1,
    ]);

    expect($total)->toBe(30);
});
