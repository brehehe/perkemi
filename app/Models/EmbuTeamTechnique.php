<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmbuTeamTechnique extends Model
{
    use HasUuids;

    protected $fillable = [
        'event_id',
        'contingent_id',
        'event_match_category_id',
        'team_number',
        'technique_id',
        'order',
    ];

    protected function casts(): array
    {
        return ['team_number' => 'integer', 'order' => 'integer'];
    }

    public function technique(): BelongsTo
    {
        return $this->belongsTo(Technique::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function contingent(): BelongsTo
    {
        return $this->belongsTo(Contingent::class);
    }

    public function matchCategory(): BelongsTo
    {
        return $this->belongsTo(EventMatchCategory::class, 'event_match_category_id');
    }

    public function eventMatchCategory(): BelongsTo
    {
        return $this->belongsTo(EventMatchCategory::class, 'event_match_category_id');
    }
}
