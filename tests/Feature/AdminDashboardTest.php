<?php

use App\Models\Contingent;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin dashboard can be rendered with complete stats and props', function () {
    $user = User::factory()->create();
    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Garuda Sakti Surabaya',
        'city' => 'Kota Surabaya',
        'manager_name' => 'Sensei Budi Santoso',
        'phone' => '081234567890',
        'address' => 'Jl. Pemuda No. 45 Surabaya',
        'status' => 'verified',
    ]);

    Registration::create([
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-2026-0001',
        'status' => 'verified',
        'total_amount' => 1500000,
        'final_amount' => 1500000,
    ]);

    $response = $this->actingAs($user)->get('/admin/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->has('stats')
        ->has('monthlyAthletes')
        ->has('statusBreakdown')
        ->has('latestContingents')
        ->has('latestRegistrations')
        ->has('medalStats')
        ->has('medalDistribution')
        ->has('todaySchedules')
        ->has('latestActivities')
    );
});

test('admin dashboard can filter registrations by search term', function () {
    $user = User::factory()->create();
    $contingent = Contingent::create([
        'user_id' => $user->id,
        'name' => 'Dojo Rajawali Sidoarjo',
        'city' => 'Kabupaten Sidoarjo',
        'manager_name' => 'Sensei Dewi',
        'phone' => '081234567891',
        'address' => 'Jl. Pahlawan Sidoarjo',
        'status' => 'verified',
    ]);

    Registration::create([
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-SDA-099',
        'status' => 'pending',
        'total_amount' => 750000,
        'final_amount' => 750000,
    ]);

    $response = $this->actingAs($user)->get('/admin/dashboard?search=Rajawali');

    $response->assertStatus(200);
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Dashboard')
        ->where('filters.search', 'Rajawali')
        ->has('latestRegistrations.data', 1)
    );
});
