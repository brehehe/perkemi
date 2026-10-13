<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Referee extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'name',
        'gender',
        'dan_grade',
        'license_number',
        'certification_level',
        'region',
        'phone',
        'email',
        'profile_photo_path',
        'notes',
        'is_active',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get events where the referee is assigned.
     */
    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class)->withPivot('role')->withTimestamps();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(RefereeAttendance::class);
    }

    public function courtAttendances(): HasMany
    {
        return $this->hasMany(RefereeCourtAttendance::class);
    }

    public function embuJudgeScores(): HasMany
    {
        return $this->hasMany(EmbuJudgeScore::class);
    }

    public function profilePhotoUrl(): ?string
    {
        return $this->profile_photo_path
            ? Storage::disk('public')->url($this->profile_photo_path)
            : null;
    }
}
