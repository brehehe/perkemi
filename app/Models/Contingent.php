<?php

namespace App\Models;

use App\Enums\ContingentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contingent extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'source_contingent_id',
        'user_id',
        'name',
        'city',
        'manager_name',
        'phone',
        'email',
        'address',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ContingentStatus::class,
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Scope a query to only include verified contingents.
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('status', ContingentStatus::Verified);
    }

    /**
     * Scope a query to only include pending contingents.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', ContingentStatus::Pending);
    }

    /**
     * Get the event this contingent belongs to.
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Get the user that owns the contingent.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get athletes belonging to this contingent.
     */
    public function athletes(): HasMany
    {
        return $this->hasMany(Athlete::class);
    }

    /**
     * Get officials belonging to this contingent.
     */
    public function officials(): HasMany
    {
        return $this->hasMany(Official::class);
    }

    /**
     * Get registrations belonging to this contingent.
     */
    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    /**
     * Get tournament results for this contingent.
     */
    public function tournamentResults(): HasMany
    {
        return $this->hasMany(TournamentResult::class);
    }
}
