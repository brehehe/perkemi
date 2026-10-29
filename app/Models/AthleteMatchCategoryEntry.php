<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AthleteMatchCategoryEntry extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'athlete_id',
        'event_match_category_id',
        'team_number',
        'age_group_promotion',
        'actual_weight',
        'weigh_in_status',
        'weigh_in_notes',
        'weigh_in_at',
        'weigh_in_locked_at',
        'weigh_in_by',
        'competition_status',
        'status_notes',
    ];

    protected function casts(): array
    {
        return [
            'team_number' => 'integer',
            'age_group_promotion' => 'boolean',
            'actual_weight' => 'decimal:2',
            'weigh_in_at' => 'datetime',
            'weigh_in_locked_at' => 'datetime',
        ];
    }

    /**
     * Get the event that owns this entry.
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Get the athlete enrolled in the match category.
     */
    public function athlete(): BelongsTo
    {
        return $this->belongsTo(Athlete::class);
    }

    /**
     * Get the event match category selected by the athlete.
     */
    public function matchCategory(): BelongsTo
    {
        return $this->belongsTo(EventMatchCategory::class, 'event_match_category_id');
    }

    /**
     * Get the user who conducted the weigh in.
     */
    public function weighedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'weigh_in_by');
    }
}
