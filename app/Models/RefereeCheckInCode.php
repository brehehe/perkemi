<?php

namespace App\Models;

use Database\Factories\RefereeCheckInCodeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefereeCheckInCode extends Model
{
    /** @use HasFactory<RefereeCheckInCodeFactory> */
    use HasFactory, HasUuids;

    public const TypeEvent = 'event';

    public const TypeCourt = 'court';

    /** @var list<string> */
    protected $fillable = [
        'code',
        'type',
        'event_id',
        'event_court_id',
        'role',
        'target_url',
        'expires_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(EventCourt::class, 'event_court_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
