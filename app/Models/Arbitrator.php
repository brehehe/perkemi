<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Arbitrator extends Model
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
     * Get events where this arbitrator is assigned.
     */
    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'event_arbitrator')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Get the login user account associated with the arbitrator.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
