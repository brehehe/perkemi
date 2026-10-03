<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Athlete extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contingent_id',
        'name',
        'nik',
        'kenshi_number',
        'gender',
        'birth_place',
        'blood_type',
        'home_address',
        'dojo_name',
        'profile_photo_path',
        'kyu_dan',
        'weight',
        'height',
        'birth_date',
        'bpjs_number',
        'bpjs_status',
        'event_age_category_id',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'weight' => 'decimal:2',
            'height' => 'decimal:2',
            'deleted_at' => 'datetime',
        ];
    }

    public function contingent(): BelongsTo
    {
        return $this->belongsTo(Contingent::class);
    }

    public function ageCategory(): BelongsTo
    {
        return $this->belongsTo(EventAgeCategory::class, 'event_age_category_id');
    }

    /**
     * Get match category entries submitted for this athlete.
     */
    public function matchCategoryEntries(): HasMany
    {
        return $this->hasMany(AthleteMatchCategoryEntry::class);
    }

    public function rankHistories(): HasMany
    {
        return $this->hasMany(AthleteRankHistory::class)->latest();
    }

    public function tournamentResults(): HasMany
    {
        return $this->hasMany(TournamentResult::class);
    }
}
