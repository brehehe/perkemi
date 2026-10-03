<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rundown extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'event_id',
        'date',
        'end_time',
        'name',
        'type',
        'is_match_session',
        'description',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'datetime',
            'end_time' => 'datetime',
            'is_match_session' => 'boolean',
            'order' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
