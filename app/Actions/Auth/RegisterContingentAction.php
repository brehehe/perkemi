<?php

namespace App\Actions\Auth;

use App\Enums\ContingentStatus;
use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use App\Mail\ContingentAccountCreatedMail;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\Registration;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class RegisterContingentAction
{
    /**
     * Execute contingent user registration, profile creation, and welcome notification.
     *
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data, ?string $eventId = null): User
    {
        $plainPassword = 'Kempo-'.strtoupper(Str::random(6));

        /** @var User $user */
        $user = DB::transaction(function () use ($data, $plainPassword, $eventId, &$contingent) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($plainPassword),
            ]);

            // Assign 'kontingen' role
            $role = Role::firstOrCreate(['name' => 'kontingen', 'guard_name' => 'web']);
            $user->assignRole($role);

            // Connect to specified event if provided, otherwise fallback to active event
            $targetEvent = $eventId
                ? Event::query()->findOrFail($eventId)
                : Event::active()->first();

            // Create contingent profile linked to user
            $contingent = Contingent::create([
                'event_id' => $targetEvent?->id,
                'user_id' => $user->id,
                'name' => $data['contingent_name'],
                'city' => $data['city'],
                'manager_name' => $data['manager_name'],
                'phone' => $data['phone'],
                'address' => $data['address'],
                'status' => ContingentStatus::Pending,
            ]);

            if ($targetEvent) {
                $isPaid = (bool) $targetEvent->is_paid;

                Registration::create([
                    'event_id' => $targetEvent->id,
                    'contingent_id' => $contingent->id,
                    'registration_number' => 'REG-'.$targetEvent->start_date?->format('Y').'-'.Str::upper((string) Str::ulid()),
                    'status' => RegistrationStatus::Pending,
                    'total_amount' => $isPaid ? $targetEvent->fee_per_contingent : 0,
                    'final_amount' => $isPaid ? $targetEvent->fee_per_contingent : 0,
                    'payment_status' => $isPaid ? PaymentStatus::Pending : PaymentStatus::Verified,
                    'payment_amount' => 0,
                    'payment_note' => $isPaid ? null : 'Event gratis; pembayaran tidak diperlukan.',
                ]);
            }

            return $user;
        });

        event(new Registered($user));

        // Queue the generated credentials after the registration transaction commits.
        try {
            Mail::to($user->email)->queue(new ContingentAccountCreatedMail($user, $contingent, $plainPassword));
        } catch (\Throwable $e) {
            Log::error('Failed to queue registration email: '.$e->getMessage(), [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
        }

        return $user;
    }
}
