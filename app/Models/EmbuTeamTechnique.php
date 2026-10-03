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
}
