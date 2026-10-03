<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TournamentDrawing extends Model
{
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'event_id',
        'event_match_category_id',
        'status',
        'bracket_type',
        'participant_count',
        'contingent_count',
        'skip_reason',
        'generated_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'participant_count' => 'integer',
            'contingent_count' => 'integer',
            'generated_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function matchCategory(): BelongsTo
    {
        return $this->belongsTo(EventMatchCategory::class, 'event_match_category_id');
    }

    public function matches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class)->orderBy('match_sequence');
    }
}
