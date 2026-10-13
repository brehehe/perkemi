<?php

namespace App\Models;

use Database\Factories\RandoriScoreFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RandoriScore extends Model
{
    /** @use HasFactory<RandoriScoreFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    public const SignatureKeys = [
        'arbitrase',
        'field_coordinator',
        'referee',
        'clerk',
        'red_manager',
        'white_manager',
    ];

    /** @var list<string> */
    protected $fillable = [
        'event_id',
        'tournament_match_id',
        'aka_breakdown',
        'shiro_breakdown',
        'aka_total',
        'shiro_total',
        'winner_corner',
        'signatures',
        'signature_names',
        'status',
        'submitted_by',
        'verified_by',
        'locked_by',
        'verified_at',
        'locked_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'aka_breakdown' => 'array',
            'shiro_breakdown' => 'array',
            'aka_total' => 'integer',
            'shiro_total' => 'integer',
            'signatures' => 'array',
            'signature_names' => 'array',
            'verified_at' => 'datetime',
            'locked_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function tournamentMatch(): BelongsTo
    {
        return $this->belongsTo(TournamentMatch::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function locker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }
}
