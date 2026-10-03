<?php

namespace App\Actions\Admin\Event;

use App\Models\Event;
use Illuminate\Support\Str;

class CreateEventAction
{
    /**
     * Execute event creation with unique slug generation and active status management.
     *
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Event
    {
        $data['is_paid'] = (bool) ($data['is_paid'] ?? true);
        if (! $data['is_paid']) {
            $data['fee_per_athlete'] = 0;
            $data['fee_per_contingent'] = 0;
        }

        $slug = Str::slug($data['name']);
        $originalSlug = $slug;
        $counter = 1;
        while (Event::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }
        $data['slug'] = $slug;

        $isActive = ! empty($data['is_active']);

        if ($isActive) {
            Event::query()->update(['is_active' => false]);
        }

        return Event::create($data);
    }
}
