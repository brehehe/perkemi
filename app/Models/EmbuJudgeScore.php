<?php

namespace App\Models;

use Database\Factories\EmbuJudgeScoreFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmbuJudgeScore extends Model
{
    /** @use HasFactory<EmbuJudgeScoreFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'event_id',
        'tournament_match_id',
        'event_court_id',
        'referee_id',
        'user_id',
        'tiebreak_round',
        'judge_number',
        'role',
        'aspect_scores',
        'completed_items',
        'technique_subtotal',
        'expression_subtotal',
        'total_score',
        'violation_penalties',
        'violation_penalty',
        'status',
        'signature',
        'notes',
        'signed_at',
        'submitted_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'tiebreak_round' => 'integer',
            'judge_number' => 'integer',
            'aspect_scores' => 'array',
            'completed_items' => 'integer',
            'technique_subtotal' => 'decimal:2',
            'expression_subtotal' => 'decimal:2',
            'total_score' => 'decimal:2',
            'violation_penalties' => 'array',
            'violation_penalty' => 'decimal:2',
            'signed_at' => 'datetime',
            'submitted_at' => 'datetime',
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

    public function court(): BelongsTo
    {
        return $this->belongsTo(EventCourt::class, 'event_court_id');
    }

    public function referee(): BelongsTo
    {
        return $this->belongsTo(Referee::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
