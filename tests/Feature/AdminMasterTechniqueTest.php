<?php

use App\Models\Kyu;
use App\Models\Technique;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can create and update a master technique', function () {
    $user = User::factory()->create();
    $kyu = Kyu::create(['name' => 'Kyu 1', 'order' => 1, 'is_active' => true]);

    $this->actingAs($user)->post('/admin/master/technique', [
        'kyu_id' => $kyu->id,
        'name' => 'Gyakute Gote',
        'category' => 'Juho',
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $technique = Technique::query()->firstOrFail();

    $this->assertDatabaseHas('techniques', ['id' => $technique->id, 'name' => 'Gyakute Gote', 'kyu_id' => $kyu->id]);

    $this->actingAs($user)->put("/admin/master/technique/{$technique->id}", [
        'kyu_id' => $kyu->id,
        'name' => 'Gyakute Gote Dasar',
        'category' => 'Juho',
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('techniques', ['id' => $technique->id, 'name' => 'Gyakute Gote Dasar']);
});
