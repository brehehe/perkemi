<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can access all operational workflow pages in the sidebar', function (string $url, string $component) {
    $user = User::factory()->create();

    Event::create([
        'name' => 'Kejurnas Shorinji Kempo 2026',
        'slug' => 'kejurnas-shorinji-kempo-2026',
        'city' => 'Kota Surabaya',
        'venue' => 'GOR Pancasila',
        'start_date' => '2026-10-24',
        'end_date' => '2026-10-26',
        'fee_per_athlete' => 150000,
        'status' => 'open_registration',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get($url);

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    ['/admin/pendaftaran/registrasi', 'Admin/Registration/Index'],
    ['/admin/pendaftaran/verifikasi', 'Admin/Registration/Verification'],
    ['/admin/pertandingan/drawing', 'Admin/Tournament/Drawing'],
    ['/admin/pertandingan/merge', 'Admin/Tournament/Merge'],
    ['/admin/arbitrase/wasit', 'Admin/Arbitration/Referee'],
    ['/admin/arbitrase/penugasan', 'Admin/Arbitration/Assignment'],
    ['/admin/arbitrase/scoring', 'Admin/Arbitration/Scoring'],
    ['/admin/laporan/hasil', 'Admin/Report/Medals'],
    ['/admin/laporan/rekap-embu', 'Admin/Report/Recap'],
]);
