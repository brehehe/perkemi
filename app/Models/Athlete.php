<?php

namespace App\Models;

use App\Enums\RegistrationStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Athlete extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $hidden = ['school_verification_hash'];

    protected static function booted(): void
    {
        $identityFields = ['name', 'nik', 'birth_date', 'contingent_id', 'school_name', 'school_level', 'school_entry_year', 'school_grade', 'school_document_path'];
        static::saving(function (Athlete $athlete) use ($identityFields): void {
            if ($athlete->isDirty($identityFields)) {
                $athlete->school_verified_at = null;
                $athlete->school_verified_by = null;
                $athlete->school_verification_hash = null;
            }
        });
        static::saved(function (Athlete $athlete) use ($identityFields): void {
            if ($athlete->wasRecentlyCreated || $athlete->wasChanged($identityFields)) {
                $event = $athlete->contingent()->with('event')->first()?->event;
                if ($event?->participant_rules['enabled'] ?? false) {
                    $event->registrations()->where('contingent_id', $athlete->contingent_id)
                        ->where('status', RegistrationStatus::Verified)
                        ->update(['status' => RegistrationStatus::Pending]);
                }
            }
        });
    }

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
        'school_name',
        'school_level',
        'school_entry_year',
        'school_grade',
    ];

    protected function casts(): array
    {
        return [
            'school_entry_year' => 'integer',
            'school_grade' => 'integer',
            'school_verified_at' => 'datetime',
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
