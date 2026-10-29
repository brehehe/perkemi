<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentMatchVarReview extends Model
{
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'tournament_match_id',
        'event_id',
        'corner',
        'requested_by',
        'reason',
        'match_second',
        'status',
        'camera_angle',
        'video_url',
        'verdict_notes',
        'reviewed_by',
        'challenge_card_retained',
        'resolved_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'match_second' => 'integer',
            'challenge_card_retained' => 'boolean',
            'resolved_at' => 'datetime',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(TournamentMatch::class, 'tournament_match_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
