<?php

use App\Models\User;
use App\Models\WeightClass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can manage master weight classes', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/admin/master/weight-class', [
        'name' => 'Kelas -50 kg Putra',
        'gender' => 'male',
        'min_weight' => 45,
        'max_weight' => 50,
        'order' => 1,
        'is_active' => true,
        'description' => 'Kelas junior.',
    ])->assertRedirect();

    $weightClass = WeightClass::query()->firstOrFail();

    $this->assertDatabaseHas('weight_classes', [
        'id' => $weightClass->id,
        'name' => 'Kelas -50 kg Putra',
        'gender' => 'male',
    ]);

    $this->actingAs($user)->get('/admin/master/weight-class')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/WeightClass/Index')
            ->has('weightClasses.data', 1)
            ->where('weightClasses.data.0.name', 'Kelas -50 kg Putra')
        );

    $this->actingAs($user)->put("/admin/master/weight-class/{$weightClass->id}", [
        'name' => 'Kelas -50 kg Putra Nasional',
        'gender' => 'male',
        'min_weight' => 45,
        'max_weight' => 50,
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('weight_classes', ['id' => $weightClass->id, 'name' => 'Kelas -50 kg Putra Nasional']);

    $this->actingAs($user)->delete("/admin/master/weight-class/{$weightClass->id}")->assertRedirect();

    $this->assertSoftDeleted('weight_classes', ['id' => $weightClass->id]);
});

test('weight class requires a valid range', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->from('/admin/master/weight-class')->post('/admin/master/weight-class', [
        'name' => 'Kelas Tidak Valid',
        'gender' => 'female',
        'min_weight' => 55,
        'max_weight' => 50,
        'order' => 1,
    ])->assertRedirect('/admin/master/weight-class')
        ->assertSessionHasErrors('max_weight');
});
