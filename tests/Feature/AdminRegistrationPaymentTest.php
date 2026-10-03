<?php

use App\Models\Contingent;
use App\Models\Event;
use App\Models\PaymentMethod;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('tenant staff can submit and verify a payment using an event payment method', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Storage::fake('local');

    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Pembayaran 2026',
        'slug' => 'kejurda-pembayaran-2026',
        'tenant_subdomain' => 'kejurda-pembayaran-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);
    $paymentMethod = PaymentMethod::create([
        'name' => 'Transfer BCA Panitia',
        'code' => 'transfer-bca-panitia',
        'type' => 'bank_transfer',
        'account_name' => 'Panitia Kejurda',
        'account_number' => '1234567890',
        'is_active' => true,
    ]);
    $event->paymentMethods()->attach($paymentMethod);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Dojo Pembayaran',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Bayar',
        'phone' => '081234567890',
    ]);
    $registration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-PAYMENT-001',
        'total_amount' => 500000,
        'final_amount' => 500000,
    ]);

    $this->actingAs($user)
        ->post("http://kejurda-pembayaran-2026.localhost/admin/pendaftaran/registrasi/{$registration->id}/payment", [
            'payment_method_id' => $paymentMethod->id,
            'payment_amount' => 500000,
            'payment_reference' => 'TRX-KEJURDA-001',
            'payment_proof' => UploadedFile::fake()->create('bukti.pdf', 100, 'application/pdf'),
            'payment_note' => 'Transfer dari rekening kontingen.',
        ])
        ->assertRedirect();

    $registration->refresh();

    expect($registration->payment_status->value)->toBe('submitted');
    expect($registration->payment_method_id)->toBe($paymentMethod->id);
    expect($registration->payment_reference)->toBe('TRX-KEJURDA-001');
    Storage::disk('local')->assertExists($registration->payment_proof_path);

    $this->actingAs($user)
        ->post("http://kejurda-pembayaran-2026.localhost/admin/pendaftaran/registrasi/{$registration->id}/payment/verify")
        ->assertRedirect();

    $this->assertDatabaseHas('registrations', [
        'id' => $registration->id,
        'payment_status' => 'verified',
        'payment_verified_by' => $user->id,
    ]);
});

test('tenant payment submission rejects a payment method from another event', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Metode 2026',
        'slug' => 'kejurda-metode-2026',
        'tenant_subdomain' => 'kejurda-metode-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Metode Lain 2026',
        'slug' => 'kejurda-metode-lain-2026',
        'tenant_subdomain' => 'kejurda-metode-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);
    $otherEventPaymentMethod = PaymentMethod::create([
        'name' => 'QRIS Event Lain',
        'code' => 'qris-event-lain',
        'type' => 'qris',
        'is_active' => true,
    ]);
    $otherEvent->paymentMethods()->attach($otherEventPaymentMethod);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Dojo Metode',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Metode',
        'phone' => '081234567890',
    ]);
    $registration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-PAYMENT-002',
        'final_amount' => 250000,
    ]);

    $this->actingAs($user)
        ->from('http://kejurda-metode-2026.localhost/admin/pendaftaran/registrasi')
        ->post("http://kejurda-metode-2026.localhost/admin/pendaftaran/registrasi/{$registration->id}/payment", [
            'payment_method_id' => $otherEventPaymentMethod->id,
            'payment_amount' => 250000,
        ])
        ->assertRedirect('http://kejurda-metode-2026.localhost/admin/pendaftaran/registrasi')
        ->assertSessionHasErrors('payment_method_id');

    $this->assertDatabaseHas('registrations', [
        'id' => $registration->id,
        'payment_status' => 'pending',
    ]);
});

test('free event registration rejects payment submission because no payment is required', function () {
    config()->set('app.tenant_base_domain', 'localhost');

    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Festival Gratis 2026',
        'slug' => 'festival-gratis-2026',
        'tenant_subdomain' => 'festival-gratis-2026',
        'venue' => 'GOR Gratis',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
        'is_paid' => false,
        'fee_per_athlete' => 0,
        'fee_per_contingent' => 0,
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);
    $paymentMethod = PaymentMethod::create([
        'name' => 'Transfer Tidak Dipakai',
        'code' => 'transfer-tidak-dipakai',
        'type' => 'bank_transfer',
        'is_active' => true,
    ]);
    $event->paymentMethods()->attach($paymentMethod);
    $contingent = Contingent::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'name' => 'Dojo Tanpa Biaya',
        'city' => 'Surabaya',
        'manager_name' => 'Sensei Gratis',
        'phone' => '081234567890',
    ]);
    $registration = Registration::create([
        'event_id' => $event->id,
        'contingent_id' => $contingent->id,
        'registration_number' => 'REG-FREE-PAYMENT-001',
        'total_amount' => 0,
        'final_amount' => 0,
        'payment_status' => 'verified',
    ]);

    $this->actingAs($user)
        ->from('http://festival-gratis-2026.localhost/admin/pendaftaran/registrasi')
        ->post("http://festival-gratis-2026.localhost/admin/pendaftaran/registrasi/{$registration->id}/payment", [
            'payment_method_id' => $paymentMethod->id,
            'payment_amount' => 0,
        ])
        ->assertRedirect('http://festival-gratis-2026.localhost/admin/pendaftaran/registrasi')
        ->assertSessionHasErrors('payment_method_id');

    expect($registration->fresh()->payment_status->value)->toBe('verified');
});

test('tenant cannot download payment proof from another event registration', function () {
    config()->set('app.tenant_base_domain', 'localhost');
    Storage::fake('local');

    $user = User::factory()->create();
    $event = Event::create([
        'name' => 'Kejurda Bukti Bayar 2026',
        'slug' => 'kejurda-bukti-bayar-2026',
        'tenant_subdomain' => 'kejurda-bukti-bayar-2026',
        'venue' => 'GOR Kertajaya',
        'city' => 'Surabaya',
        'start_date' => '2026-10-01',
        'end_date' => '2026-10-03',
    ]);
    $otherEvent = Event::create([
        'name' => 'Kejurda Bukti Bayar Lain 2026',
        'slug' => 'kejurda-bukti-bayar-lain-2026',
        'tenant_subdomain' => 'kejurda-bukti-bayar-lain-2026',
        'venue' => 'GOR Brawijaya',
        'city' => 'Malang',
        'start_date' => '2026-11-01',
        'end_date' => '2026-11-03',
    ]);
    $event->users()->attach($user, ['access_role' => 'staff']);
    $otherContingent = Contingent::create([
        'event_id' => $otherEvent->id,
        'user_id' => $user->id,
        'name' => 'Dojo Bukti Lain',
        'city' => 'Malang',
        'manager_name' => 'Sensei Lain',
        'phone' => '081234567890',
    ]);
    $otherRegistration = Registration::create([
        'event_id' => $otherEvent->id,
        'contingent_id' => $otherContingent->id,
        'registration_number' => 'REG-PAYMENT-003',
        'payment_proof_path' => 'registration-payments/bukti-event-lain.pdf',
    ]);
    Storage::disk('local')->put($otherRegistration->payment_proof_path, 'bukti event lain');

    $this->actingAs($user)
        ->get("http://kejurda-bukti-bayar-2026.localhost/admin/pendaftaran/registrasi/{$otherRegistration->id}/payment-proof")
        ->assertNotFound();
});
