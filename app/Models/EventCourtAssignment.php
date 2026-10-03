<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventCourtAssignment extends Model
{
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['event_court_id', 'staff_type', 'staff_id', 'role'];

    public function court(): BelongsTo
    {
        return $this->belongsTo(EventCourt::class, 'event_court_id');
    }
}
