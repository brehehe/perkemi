<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventMatchCategory extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'event_match_categories';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'age_category_id',
        'weight_class_id',
        'name',
        'type',
        'gender',
        'capacity',
        'max_athletes_per_team',
        'min_weight',
        'max_weight',
        'min_kyu',
        'max_kyu',
        'merged_into_id',
        'is_combined',
        'order',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'max_athletes_per_team' => 'integer',
            'min_weight' => 'decimal:2',
            'max_weight' => 'decimal:2',
            'is_combined' => 'boolean',
            'order' => 'integer',
            'is_active' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get the event that owns this match category.
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Get the age category associated with this match category.
     */
    public function ageCategory(): BelongsTo
    {
        return $this->belongsTo(EventAgeCategory::class, 'age_category_id');
    }

    /**
     * Get the master weight class used by this match category.
     */
    public function weightClass(): BelongsTo
    {
        return $this->belongsTo(WeightClass::class);
    }

    /**
     * Get the active category that receives this merged category.
     */
    public function mergedInto(): BelongsTo
    {
        return $this->belongsTo(self::class, 'merged_into_id');
    }

    /**
     * Get the original categories grouped under this combined category.
     */
    public function mergedSources(): HasMany
    {
        return $this->hasMany(self::class, 'merged_into_id');
    }

    /**
     * Get athlete entries enrolled in this match category.
     */
    public function athleteEntries(): HasMany
    {
        return $this->hasMany(AthleteMatchCategoryEntry::class);
    }

    public function tournamentDrawing(): HasOne
    {
        return $this->hasOne(TournamentDrawing::class);
    }
}
