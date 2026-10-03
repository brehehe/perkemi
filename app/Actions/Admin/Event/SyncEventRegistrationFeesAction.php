<?php

namespace App\Actions\Admin\Event;

use App\Enums\PaymentStatus;
use App\Models\Athlete;
use App\Models\Event;
use App\Models\Registration;

class SyncEventRegistrationFeesAction
{
    public function execute(Event $event, bool $wasPaid): void
    {
        $event->registrations()->get()->each(function (Registration $registration) use ($event, $wasPaid): void {
            if (! $event->is_paid) {
                $registration->update([
                    'total_amount' => 0,
                    'final_amount' => 0,
                    'verification_code' => null,
                    'payment_status' => PaymentStatus::Verified,
                    'payment_amount' => 0,
                    'payment_verified_at' => null,
                    'payment_verified_by' => null,
                    'payment_note' => 'Event gratis; pembayaran tidak diperlukan.',
                ]);

                return;
            }

            $athleteCount = Athlete::query()
                ->where('contingent_id', $registration->contingent_id)
                ->whereHas('matchCategoryEntries', fn ($query) => $query->where('event_id', $event->id))
                ->count();
            $verificationCode = $registration->verification_code ?? Registration::nextVerificationCode($event->id);
            $totalAmount = (float) $event->fee_per_contingent + ($athleteCount * (float) $event->fee_per_athlete);
            $finalAmount = $totalAmount + $verificationCode;
            $amountChanged = (float) $registration->final_amount !== $finalAmount;

            $changes = [
                'total_amount' => $totalAmount,
                'final_amount' => $finalAmount,
                'verification_code' => $verificationCode,
            ];

            if (! $wasPaid) {
                $changes += [
                    'payment_status' => PaymentStatus::Pending,
                    'payment_amount' => 0,
                    'payment_submitted_at' => null,
                    'payment_verified_at' => null,
                    'payment_verified_by' => null,
                    'payment_note' => 'Event diubah menjadi berbayar. Silakan lengkapi pembayaran.',
                ];
            } elseif ($amountChanged && in_array($registration->payment_status, [PaymentStatus::Submitted, PaymentStatus::Verified], true)) {
                $changes += [
                    'payment_status' => PaymentStatus::Rejected,
                    'payment_verified_at' => null,
                    'payment_verified_by' => null,
                    'payment_note' => 'Biaya event berubah. Periksa dan ajukan ulang pembayaran.',
                ];
            }

            $registration->update($changes);
        });
    }
}
