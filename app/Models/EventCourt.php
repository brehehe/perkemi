<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class EventCourt extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'event_courts';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'name',
        'location',
        'description',
        'access_code',
        'order',
        'is_active',
    ];

    protected static function booted(): void
    {
        static::saving(function (EventCourt $court) {
            if (empty($court->access_code)) {
                $court->access_code = static::generateUniqueAccessCode();
            }
        });
    }

    /**
     * Generate a unique 6-digit access code for court panitera login.
     */
    public static function generateUniqueAccessCode(): string
    {
        do {
            $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        } while (static::query()->where('access_code', $code)->exists());

        return $code;
    }

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'is_active' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Retrieve the model for a bound value with UUID safeguard.
     *
     * @param  Builder|Relation  $query
     * @param  mixed  $value
     * @param  string|null  $field
     * @return Builder|Relation
     */
    public function resolveRouteBindingQuery($query, $value, $field = null)
    {
        $field = $field ?? $this->getRouteKeyName();

        if ($field === 'id' && ! Str::isUuid((string) $value) && ! Str::isUlid((string) $value) && strlen((string) $value) !== 36 && strlen((string) $value) !== 26) {
            return $query->where(function ($sub) use ($value) {
                if (is_numeric($value)) {
                    $sub->where('order', (int) $value)
                        ->orWhere('name', 'Court '.$value)
                        ->orWhere('name', 'court '.$value)
                        ->orWhere('name', (string) $value)
                        ->orWhere('access_code', (string) $value);
                } else {
                    $normalized = str_replace('-', ' ', strtolower((string) $value));
                    $sub->whereRaw('LOWER(name) = ?', [strtolower((string) $value)])
                        ->orWhereRaw('LOWER(name) = ?', [$normalized])
                        ->orWhereRaw("LOWER(REPLACE(name, ' ', '')) = ?", [str_replace(' ', '', $normalized)]);
                }
            });
        }

        return parent::resolveRouteBindingQuery($query, $value, $field);
    }

    /**
     * Get the event that owns this court / tatami.
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(EventCourtAssignment::class);
    }

    public function refereeAttendances(): HasMany
    {
        return $this->hasMany(RefereeCourtAttendance::class);
    }

    public function refereeAssignmentHistories(): HasMany
    {
        return $this->hasMany(RefereeCourtAssignmentHistory::class);
    }

    public function embuJudgeScores(): HasMany
    {
        return $this->hasMany(EmbuJudgeScore::class);
    }

    public function tournamentMatches(): HasMany
    {
        return $this->hasMany(TournamentMatch::class);
    }
}
