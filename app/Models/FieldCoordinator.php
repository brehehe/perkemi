<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FieldCoordinator extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'name',
        'gender',
        'dan_grade',
        'certification_level',
        'coordinator_number',
        'region',
        'phone',
        'email',
        'notes',
        'is_active',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'deleted_at' => 'datetime'];
    }

    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class)->withPivot('assignment_area')->withTimestamps();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
