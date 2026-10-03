<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Technique extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['kyu_id', 'name', 'category', 'description', 'order', 'is_active'];

    protected function casts(): array
    {
        return ['order' => 'integer', 'is_active' => 'boolean', 'deleted_at' => 'datetime'];
    }

    public function kyu(): BelongsTo
    {
        return $this->belongsTo(Kyu::class);
    }
}
