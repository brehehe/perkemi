<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TournamentMatch extends Model
{
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'tournament_drawing_id',
        'event_id',
        'event_match_category_id',
        'event_court_id',
        'rundown_id',
        'next_match_id',
        'red_entry_id',
        'blue_entry_id',
        'participant_entry_id',
        'phase',
        'round_label',
        'pool',
        'match_sequence',
        'bracket_position',
        'red_label',
        'blue_label',
        'participant_label',
        'scheduled_start_at',
        'scheduled_end_at',
        'status',
        'call_status',
        'called_at',
        'timer_status',
        'timer_started_at',
        'timer_started_at_ms',
        'timer_elapsed_seconds',
        'timer_elapsed_ms',
        'timer_version',
        'is_bye',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'match_sequence' => 'integer',
            'bracket_position' => 'integer',
            'scheduled_start_at' => 'datetime',
            'scheduled_end_at' => 'datetime',
            'called_at' => 'datetime',
            'timer_started_at' => 'datetime',
            'timer_started_at_ms' => 'integer',
            'timer_elapsed_seconds' => 'integer',
            'timer_elapsed_ms' => 'integer',
            'timer_version' => 'integer',
            'is_bye' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function drawing(): BelongsTo
    {
        return $this->belongsTo(TournamentDrawing::class, 'tournament_drawing_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function matchCategory(): BelongsTo
    {
        return $this->belongsTo(EventMatchCategory::class, 'event_match_category_id');
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(EventCourt::class, 'event_court_id');
    }

    public function rundown(): BelongsTo
    {
        return $this->belongsTo(Rundown::class);
    }

    public function nextMatch(): BelongsTo
    {
        return $this->belongsTo(self::class, 'next_match_id');
    }

    public function sourceMatches(): HasMany
    {
        return $this->hasMany(self::class, 'next_match_id');
    }

    public function embuScores(): HasMany
    {
        return $this->hasMany(EmbuScore::class)->orderByDesc('tiebreak_round');
    }

    public function embuJudgeScores(): HasMany
    {
        return $this->hasMany(EmbuJudgeScore::class)
            ->orderBy('tiebreak_round')
            ->orderBy('judge_number');
    }

    public function randoriScore(): HasOne
    {
        return $this->hasOne(RandoriScore::class);
    }
}
