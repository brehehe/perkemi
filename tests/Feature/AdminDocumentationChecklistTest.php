<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest is redirected from checklist viewer', function () {
    $response = $this->get('/admin/checklist-uji');

    $response->assertRedirect('/login');
});

test('authenticated admin can view checklist page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/admin/checklist-uji');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Documentation/Checklist')
        ->has('stats')
        ->has('phases', 7)
        ->has('categories', 19)
        ->has('recentChanges')
        ->has('sampleEvent')
        ->has('markdownContent')
        ->where('categories.0.phase_id', 1)
    );
});

test('authenticated admin can download markdown file', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/admin/checklist-uji/download');

    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/markdown; charset=UTF-8');
    $response->assertHeader('Content-Disposition', 'attachment; filename="ANALISIS_FITUR_DAN_CHECKLIST_PENGUJIAN.md"');
});
