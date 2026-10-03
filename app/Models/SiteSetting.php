<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

class SiteSetting extends Model
{
    public const HomeDefault = 'default';

    public const HomeFeaturedEvent = 'featured_event';

    public const HomeUpcomingEvent = 'upcoming_event';

    /** @var list<string> */
    protected $fillable = [
        'home_landing_mode',
        'featured_event_id',
    ];

    public function featuredEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'featured_event_id');
    }

    public static function current(): self
    {
        if (! Schema::hasTable('site_settings')) {
            return new self(['home_landing_mode' => self::HomeDefault]);
        }

        return static::query()->first() ?? new self([
            'home_landing_mode' => self::HomeDefault,
        ]);
    }
}
