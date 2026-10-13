<?php

namespace App\Models;

use Database\Factories\EmbuScoreFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmbuScore extends Model
{
    /** @use HasFactory<EmbuScoreFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'event_id',
        'tournament_match_id',
        'tiebreak_round',
        'judge_scores',
        'duration_seconds',
        'time_penalty',
        'violation_penalties',
        'violation_penalty',
        'total_penalty',
        'is_disqualified',
        'disqualification_reason',
        'middle_score',
        'final_score',
        'status',
        'submitted_by',
        'verified_by',
        'verified_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'tiebreak_round' => 'integer',
            'judge_scores' => 'array',
            'duration_seconds' => 'integer',
            'time_penalty' => 'decimal:2',
            'violation_penalties' => 'array',
            'violation_penalty' => 'decimal:2',
            'total_penalty' => 'decimal:2',
            'is_disqualified' => 'boolean',
            'middle_score' => 'decimal:2',
            'final_score' => 'decimal:2',
            'verified_at' => 'datetime',
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

    public function effectiveTotalPenalty(): float
    {
        $storedTotal = (float) $this->total_penalty;

        return $storedTotal > 0
            ? $storedTotal
            : (float) $this->time_penalty + (float) $this->violation_penalty;
    }
}
