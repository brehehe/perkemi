<?php

namespace App\Models;

use Database\Factories\RefereeCourtAssignmentHistoryFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefereeCourtAssignmentHistory extends Model
{
    /** @use HasFactory<RefereeCourtAssignmentHistoryFactory> */
    use HasFactory, HasUuids;

    public const ActionAssigned = 'assigned';

    public const ActionRemoved = 'removed';

    public const ActionReset = 'reset';

    /** @var list<string> */
    protected $fillable = [
        'event_id',
        'event_court_id',
        'referee_id',
        'changed_by_user_id',
        'batch_id',
        'action',
        'role',
        'occurred_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
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

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
