<?php

use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('athlete home address and bpjs number are stored encrypted in the database', function () {
    $user = User::factory()->create();
    $event = Event::query()->create([
        'name' => 'Event Enkripsi Test',
        'slug' => 'event-enkripsi-test',
        'venue' => 'GOR Pancasila',
        'city' => 'Surabaya',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
    ]);
    $contingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Dojo Garuda',
        'city' => 'Surabaya',
        'manager_name' => 'Budi Santoso',
        'phone' => '081234567890',
    ]);

    $athlete = Athlete::query()->create([
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Rahasia',
        'gender' => 'L',
        'home_address' => 'Jl. Dharmawangsa No. 99, Surabaya',
        'bpjs_number' => '0001234567890',
    ]);

    // Verify Eloquent model decrypts transparently
    expect($athlete->home_address)->toBe('Jl. Dharmawangsa No. 99, Surabaya')
        ->and($athlete->bpjs_number)->toBe('0001234567890');

    // Query raw DB value directly to prove it is stored as ciphertext
    $rawRow = DB::table('athletes')->where('id', $athlete->id)->first();

    expect($rawRow->home_address)->not->toBe('Jl. Dharmawangsa No. 99, Surabaya')
        ->and($rawRow->bpjs_number)->not->toBe('0001234567890')
        ->and(Crypt::decryptString($rawRow->home_address))->toBe('Jl. Dharmawangsa No. 99, Surabaya')
        ->and(Crypt::decryptString($rawRow->bpjs_number))->toBe('0001234567890');
});

test('athlete gracefully reads legacy unencrypted plaintext from database without exception', function () {
    $user = User::factory()->create();
    $event = Event::query()->create([
        'name' => 'Event Legacy Test',
        'slug' => 'event-legacy-test',
        'venue' => 'GOR Remaja',
        'city' => 'Malang',
        'start_date' => '2026-11-10',
        'end_date' => '2026-11-12',
    ]);
    $contingent = Contingent::query()->create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Dojo Singo',
        'city' => 'Malang',
        'manager_name' => 'Singo Edan',
        'phone' => '081234567891',
    ]);

    $athleteId = (string) str()->uuid();
    DB::table('athletes')->insert([
        'id' => $athleteId,
        'contingent_id' => $contingent->id,
        'name' => 'Kenshi Legacy',
        'gender' => 'L',
        'home_address' => 'Jl. Ijen No. 1 Malang (Plaintext)',
        'bpjs_number' => '0009998887776',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $athlete = Athlete::query()->findOrFail($athleteId);

    expect($athlete->home_address)->toBe('Jl. Ijen No. 1 Malang (Plaintext)')
        ->and($athlete->bpjs_number)->toBe('0009998887776');
});
