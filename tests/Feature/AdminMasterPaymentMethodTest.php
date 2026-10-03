<?php

use App\Models\Event;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('admin can manage master payment methods', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/admin/master/payment-method', [
        'name' => 'Transfer BCA Panitia',
        'code' => 'transfer-bca',
        'type' => 'bank_transfer',
        'provider' => 'BCA',
        'account_name' => 'Pengprov Perkemi Jatim',
        'account_number' => '1234567890',
        'instructions' => 'Cantumkan nama kontingen.',
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $paymentMethod = PaymentMethod::query()->firstOrFail();

    $this->assertDatabaseHas('payment_methods', ['id' => $paymentMethod->id, 'code' => 'transfer-bca']);

    $this->actingAs($user)->get('/admin/master/payment-method')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Master/PaymentMethod/Index')
            ->has('paymentMethods.data', 1)
            ->where('paymentMethods.data.0.name', 'Transfer BCA Panitia')
        );

    $this->actingAs($user)->put("/admin/master/payment-method/{$paymentMethod->id}", [
        'name' => 'Transfer BCA Utama',
        'code' => 'transfer-bca',
        'type' => 'bank_transfer',
        'provider' => 'BCA',
        'order' => 1,
        'is_active' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('payment_methods', ['id' => $paymentMethod->id, 'name' => 'Transfer BCA Utama']);

    $this->actingAs($user)->delete("/admin/master/payment-method/{$paymentMethod->id}")->assertRedirect();

    $this->assertSoftDeleted('payment_methods', ['id' => $paymentMethod->id]);
});

test('admin can assign payment methods to an event', function () {
    $user = User::factory()->create();
    $paymentMethod = PaymentMethod::create(['name' => 'QRIS Panitia', 'code' => 'qris-panitia', 'type' => 'qris', 'order' => 1, 'is_active' => true]);
    $event = Event::create([
        'name' => 'Kejurda Pembayaran 2026',
        'slug' => 'kejurda-pembayaran-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);

    $this->actingAs($user)->put("/admin/master/event/{$event->id}/fees", [
        'fee_per_contingent' => 250000,
        'fee_per_athlete' => 100000,
        'payment_method_ids' => [$paymentMethod->id],
    ])->assertRedirect();

    $this->assertDatabaseHas('event_payment_method', ['event_id' => $event->id, 'payment_method_id' => $paymentMethod->id]);

    $this->actingAs($user)->get("/admin/master/event/{$event->id}/detail")
        ->assertInertia(fn (Assert $page) => $page
            ->where('event.payment_method_ids.0', $paymentMethod->id)
            ->has('paymentMethods', 1)
        );
});
