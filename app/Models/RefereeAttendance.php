<?php

namespace App\Models;

use Database\Factories\RefereeAttendanceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefereeAttendance extends Model
{
    /** @use HasFactory<RefereeAttendanceFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'event_id',
        'referee_id',
        'attendance_date',
        'is_present',
        'checked_in_by_user_id',
        'checked_in_at',
        'method',
        'notes',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'is_present' => 'boolean',
            'checked_in_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function referee(): BelongsTo
    {
        return $this->belongsTo(Referee::class);
    }

    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by_user_id');
    }
}
