<?php

use App\Services\Panitera\EmbuPenaltyCatalog;

test('fixed and per-technique Embu penalties are normalized and totaled', function () {
    $catalog = new EmbuPenaltyCatalog;
    $penalties = $catalog->normalize([
        'composition_count' => 1,
        'rank_mismatch' => 2,
        'group_signal' => 1,
    ], 'Embu Beregu Putra');

    expect($penalties)->toBe([
        'composition_count' => 1,
        'rank_mismatch' => 2,
        'group_signal' => 1,
    ])->and($catalog->points($penalties, 'Embu Beregu Putra'))->toBe(35.0);
});

test('group-only violations are ignored outside a Beregu category', function () {
    $catalog = new EmbuPenaltyCatalog;

    expect($catalog->normalize([
        'composition_count' => 1,
        'group_unsynchronized' => 1,
        'group_signal' => 1,
    ], 'Embu Berpasangan Putra'))->toBe([
        'composition_count' => 1,
    ]);
});
