<?php

namespace App\Models;

use Database\Factories\RefereeCourtAttendanceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefereeCourtAttendance extends Model
{
    /** @use HasFactory<RefereeCourtAttendanceFactory> */
    use HasFactory, HasUuids;

    /** @var list<string> */
    protected $fillable = [
        'event_id',
        'event_court_id',
        'referee_id',
        'attendance_date',
        'checked_in_by_user_id',
        'checked_in_at',
        'method',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'checked_in_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(EventCourt::class, 'event_court_id');
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
