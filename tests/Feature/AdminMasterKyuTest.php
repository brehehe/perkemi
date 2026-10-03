<?php

use App\Models\Kyu;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can manage master kyu data', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/admin/master/kyu', [
        'name' => 'Kyu 1',
        'belt_color' => 'Coklat',
        'order' => 1,
        'is_active' => true,
        'description' => 'Tingkatan sebelum Dan.',
    ])->assertRedirect();

    $kyu = Kyu::query()->firstOrFail();

    $this->assertDatabaseHas('kyus', [
        'id' => $kyu->id,
        'name' => 'Kyu 1',
        'belt_color' => 'Coklat',
    ]);

    $this->actingAs($user)->get('/admin/master/kyu')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/Kyu/Index')
            ->has('kyus.data', 1)
            ->where('kyus.data.0.name', 'Kyu 1')
        );

    $this->actingAs($user)->put("/admin/master/kyu/{$kyu->id}", [
        'name' => 'Kyu 1 Nasional',
        'belt_color' => 'Coklat',
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('kyus', ['id' => $kyu->id, 'name' => 'Kyu 1 Nasional']);

    $this->actingAs($user)->delete("/admin/master/kyu/{$kyu->id}")->assertRedirect();

    $this->assertSoftDeleted('kyus', ['id' => $kyu->id]);
});
