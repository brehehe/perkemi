<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventAgeCategory;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\PaymentMethod;
use App\Models\Rundown;

class PublicEventPageService
{
    public function load(Event $event): Event
    {
        return $event->load([
            'ageCategories' => fn ($query) => $query->where('is_active', true)->orderBy('order'),
            'courts' => fn ($query) => $query->where('is_active', true)->orderBy('order'),
            'matchCategories' => fn ($query) => $query->where('is_active', true)->orderBy('order'),
            'rundowns' => fn ($query) => $query->orderBy('date')->orderBy('order'),
            'paymentMethods' => fn ($query) => $query->where('is_active', true)->orderBy('order'),
        ])->loadCount(['contingents', 'registrations']);
    }

    /**
     * @return array<string, mixed>
     */
    public function data(
        Event $event,
        bool $canManage = false,
        bool $isHomepage = false,
        bool $canAccessDashboard = false,
    ): array {
        $this->load($event);

        return [
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'slug' => $event->slug,
                'edition' => $event->edition,
                'description' => $event->description,
                'venue' => $event->venue,
                'city' => $event->city,
                'province' => $event->province,
                'start_date' => $event->start_date?->format('Y-m-d'),
                'end_date' => $event->end_date?->format('Y-m-d'),
                'start_date_formatted' => $event->start_date?->translatedFormat('d F Y'),
                'end_date_formatted' => $event->end_date?->translatedFormat('d F Y'),
                'dates_formatted' => $event->start_date?->translatedFormat('d M').' - '.$event->end_date?->translatedFormat('d M Y'),
                'registration_start' => $event->registration_start?->format('Y-m-d'),
                'registration_end' => $event->registration_end?->format('Y-m-d'),
                'registration_start_formatted' => $event->registration_start?->translatedFormat('d F Y'),
                'registration_end_formatted' => $event->registration_end?->translatedFormat('d F Y'),
                'is_paid' => (bool) $event->is_paid,
                'fee_per_athlete' => (float) $event->fee_per_athlete,
                'fee_per_athlete_formatted' => 'Rp '.number_format((float) $event->fee_per_athlete, 0, ',', '.'),
                'fee_per_contingent' => (float) $event->fee_per_contingent,
                'fee_per_contingent_formatted' => 'Rp '.number_format((float) $event->fee_per_contingent, 0, ',', '.'),
                'max_match_categories_per_athlete' => (int) $event->max_match_categories_per_athlete,
                'status' => $event->status instanceof \BackedEnum ? $event->status->value : (string) $event->status,
                'is_active' => (bool) $event->is_active,
                'organizer' => $event->organizer,
                'contact_person' => $event->contact_person,
                'contact_phone' => $event->contact_phone,
                'rules_doc' => $event->rules_doc,
                'cover_image_url' => $event->coverImageUrl(),
                'contingents_count' => (int) $event->contingents_count,
                'registrations_count' => (int) $event->registrations_count,
            ],
            'ageCategories' => $event->ageCategories->map(fn (EventAgeCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'min_age' => $category->min_age,
                'max_age' => $category->max_age,
                'age_range' => ($category->min_age && $category->max_age)
                    ? "{$category->min_age} - {$category->max_age} Tahun"
                    : 'Usia mengikuti ketentuan event',
                'fee' => (float) $category->fee,
                'fee_formatted' => $event->is_paid ? 'Rp '.number_format((float) $category->fee, 0, ',', '.') : 'Gratis',
                'description' => $category->description,
            ]),
            'courts' => $event->courts->map(fn (EventCourt $court) => [
                'id' => $court->id,
                'name' => $court->name,
                'location' => $court->location,
                'description' => $court->description,
            ]),
            'matchCategories' => $event->matchCategories->map(fn (EventMatchCategory $category) => [
                'id' => $category->id,
                'age_category_id' => $category->age_category_id,
                'name' => $category->name,
                'type' => $category->type,
                'gender' => $category->gender,
                'capacity' => $category->capacity,
                'weight_range' => ($category->min_weight && $category->max_weight)
                    ? "{$category->min_weight} - {$category->max_weight} kg"
                    : ($category->min_weight ? "≥ {$category->min_weight} kg" : ($category->max_weight ? "≤ {$category->max_weight} kg" : '-')),
                'min_kyu' => $category->min_kyu,
                'max_kyu' => $category->max_kyu,
            ]),
            'rundowns' => $event->rundowns->map(fn (Rundown $rundown) => [
                'id' => $rundown->id,
                'date_formatted' => $rundown->date?->translatedFormat('d M Y, H:i').' WIB',
                'date_only' => $rundown->date?->format('Y-m-d'),
                'time_only' => $rundown->date?->format('H:i'),
                'end_time_only' => $rundown->end_time?->format('H:i'),
                'name' => $rundown->name,
                'type' => $rundown->type,
                'description' => $rundown->description,
            ]),
            'paymentMethods' => $event->paymentMethods->map(fn (PaymentMethod $paymentMethod) => [
                'id' => $paymentMethod->id,
                'name' => $paymentMethod->name,
                'type' => $paymentMethod->type,
                'provider' => $paymentMethod->provider,
                'account_name' => $paymentMethod->account_name,
                'account_number' => $paymentMethod->account_number,
                'instructions' => $paymentMethod->instructions,
            ]),
            'canManage' => $canManage,
            'canAccessDashboard' => $canAccessDashboard,
            'isHomepage' => $isHomepage,
        ];
    }
}
