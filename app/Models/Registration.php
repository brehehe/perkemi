<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Enums\RegistrationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\ValidationException;

class Registration extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public static function nextVerificationCode(string $eventId): int
    {
        $used = static::query()->where('event_id', $eventId)->whereNotNull('verification_code')
            ->pluck('verification_code')->map(fn ($code) => (int) $code)->all();
        $available = array_values(array_diff(range(100, 999), $used));
        if ($available === []) {
            throw ValidationException::withMessages(['event_id' => 'Kode unik verifikasi untuk event ini sudah habis.']);
        }

        return $available[random_int(0, count($available) - 1)];
    }

    protected $fillable = [
        'event_id',
        'contingent_id',
        'registration_number',
        'status',
        'total_amount',
        'final_amount',
        'notes',
        'verification_code',
        'payment_method_id',
        'payment_status',
        'payment_amount',
        'payment_reference',
        'payment_proof_path',
        'payment_submitted_at',
        'payment_verified_at',
        'payment_verified_by',
        'payment_note',
    ];

    protected function casts(): array
    {
        return [
            'status' => RegistrationStatus::class,
            'payment_status' => PaymentStatus::class,
            'total_amount' => 'decimal:2',
            'final_amount' => 'decimal:2',
            'payment_amount' => 'decimal:2',
            'payment_submitted_at' => 'datetime',
            'payment_verified_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Scope a query to only include verified registrations.
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('status', RegistrationStatus::Verified);
    }

    /**
     * Scope a query to only include pending registrations.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', RegistrationStatus::Pending);
    }

    /**
     * Scope a query to only include rejected registrations.
     */
    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', RegistrationStatus::Rejected);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function contingent(): BelongsTo
    {
        return $this->belongsTo(Contingent::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function paymentVerifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payment_verified_by');
    }
}
