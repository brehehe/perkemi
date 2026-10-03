<?php

namespace App\Models;

use App\Enums\TournamentRank;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TournamentResult extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'event_id',
        'contingent_id',
        'athlete_id',
        'contingent_name',
        'rank',
        'match_category',
    ];

    protected function casts(): array
    {
        return [
            'rank' => TournamentRank::class,
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Scope a query to only include gold medal results.
     */
    public function scopeGold(Builder $query): Builder
    {
        return $query->where('rank', TournamentRank::Gold);
    }

    /**
     * Scope a query to only include silver medal results.
     */
    public function scopeSilver(Builder $query): Builder
    {
        return $query->where('rank', TournamentRank::Silver);
    }

    /**
     * Scope a query to only include bronze medal results.
     */
    public function scopeBronze(Builder $query): Builder
    {
        return $query->whereIn('rank', [TournamentRank::Bronze, TournamentRank::RunnerUp]);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function contingent(): BelongsTo
    {
        return $this->belongsTo(Contingent::class);
    }

    public function athlete(): BelongsTo
    {
        return $this->belongsTo(Athlete::class);
    }
}
