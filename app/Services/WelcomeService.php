<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\Athlete;
use App\Models\Contingent;
use App\Models\Event;
use App\Models\EventMatchCategory;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class WelcomeService
{
    /**
     * @return array{
     *     stats: array{events: int, peserta: int, nomor: int, kontingen: int},
     *     statusCounts: array<string, int>,
     *     featuredEvent: array<string, mixed>|null,
     *     events: LengthAwarePaginator,
     *     filters: array{search: string, status: string},
     *     directoryUrl: string
     * }
     */
    public function getLandingData(string $search = '', string $status = 'all'): array
    {
        $today = today();
        $statusCounts = ['all' => $this->publicEvents()->count()];

        foreach (['upcoming', 'ongoing', 'completed'] as $phase) {
            $statusCounts[$phase] = $this->filterByPhase($this->publicEvents(), $phase, $today)->count();
        }

        $query = $this->publicEvents()
            ->withCount([
                'matchCategories' => fn (Builder $query) => $query->where('is_active', true),
                'contingents',
            ])
            ->orderByRaw('CASE WHEN status = ? OR end_date < ? THEN 2 WHEN start_date > ? THEN 1 ELSE 0 END', [
                EventStatus::Completed->value, $today->toDateString(), $today->toDateString(),
            ])
            ->orderByDesc('is_active')
            ->orderByRaw('CASE WHEN status = ? OR end_date < ? THEN start_date END DESC', [
                EventStatus::Completed->value, $today->toDateString(),
            ])
            ->orderBy('start_date')
            ->orderBy('id');

        $featuredEvent = (clone $query)->first();

        if ($search !== '') {
            $query->where(function (Builder $query) use ($search): void {
                $query->whereLike('name', '%'.$search.'%')
                    ->orWhereLike('city', '%'.$search.'%')
                    ->orWhereLike('province', '%'.$search.'%');
            });
        }

        $events = $this->filterByPhase($query, $status, $today)
            ->paginate(9)
            ->appends(['search' => $search, 'status' => $status])
            ->fragment('events')
            ->through(fn (Event $event): array => $this->eventSummary($event, $today));

        return [
            'stats' => [
                'events' => $statusCounts['all'],
                'peserta' => Athlete::query()
                    ->whereHas('contingent.event', fn (Builder $query) => $query->where('status', '!=', EventStatus::Draft))
                    ->count(),
                'nomor' => EventMatchCategory::query()
                    ->where('is_active', true)
                    ->whereHas('event', fn (Builder $query) => $query->where('status', '!=', EventStatus::Draft))
                    ->count(),
                'kontingen' => Contingent::query()
                    ->whereHas('event', fn (Builder $query) => $query->where('status', '!=', EventStatus::Draft))
                    ->count(),
            ],
            'statusCounts' => $statusCounts,
            'featuredEvent' => $featuredEvent ? $this->eventSummary($featuredEvent, $today) : null,
            'events' => $events,
            'filters' => ['search' => $search, 'status' => $status],
            'directoryUrl' => route('home'),
        ];
    }

    /** @return Builder<Event> */
    private function publicEvents(): Builder
    {
        return Event::query()->where('status', '!=', EventStatus::Draft);
    }

    /**
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    private function filterByPhase(Builder $query, string $phase, CarbonInterface $today): Builder
    {
        return match ($phase) {
            'completed' => $query->where(fn (Builder $query) => $query
                ->where('status', EventStatus::Completed)
                ->orWhereDate('end_date', '<', $today)),
            'ongoing' => $query->where('status', '!=', EventStatus::Completed)
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today),
            'upcoming' => $query->where('status', '!=', EventStatus::Completed)
                ->whereDate('start_date', '>', $today)
                ->whereDate('end_date', '>=', $today),
            default => $query,
        };
    }

    /** @return array<string, mixed> */
    private function eventSummary(Event $event, CarbonInterface $today): array
    {
        $phase = match (true) {
            $event->status === EventStatus::Completed, $event->end_date->lt($today) => 'completed',
            $event->start_date->gt($today) => 'upcoming',
            default => 'ongoing',
        };
        $registrationState = match (true) {
            $phase === 'completed', $event->status !== EventStatus::OpenRegistration => 'closed',
            $event->registration_end?->lt($today) === true => 'closed',
            $event->registration_start?->gt($today) === true => 'scheduled',
            default => 'open',
        };

        return [
            'id' => $event->id,
            'name' => $event->name,
            'slug' => $event->slug,
            'edition' => $event->edition,
            'description' => $event->description,
            'venue' => $event->venue,
            'city' => $event->city,
            'province' => $event->province,
            'organizer' => $event->organizer,
            'cover_image_url' => $event->coverImageUrl(),
            'start_date' => $event->start_date->toDateString(),
            'end_date' => $event->end_date->toDateString(),
            'dates_formatted' => $event->start_date->translatedFormat('d M Y').' – '.$event->end_date->translatedFormat('d M Y'),
            'start_day' => $event->start_date->format('d'),
            'start_month' => $event->start_date->translatedFormat('M'),
            'year' => $event->start_date->format('Y'),
            'phase' => $phase,
            'phase_label' => match ($phase) {
                'upcoming' => 'Akan datang',
                'ongoing' => 'Sedang berlangsung',
                default => 'Selesai',
            },
            'registration_state' => $registrationState,
            'registration_label' => match ($registrationState) {
                'open' => 'Pendaftaran dibuka',
                'scheduled' => 'Pendaftaran belum dibuka',
                default => 'Pendaftaran ditutup',
            },
            'registration_start_formatted' => $event->registration_start?->translatedFormat('d F Y'),
            'registration_end_formatted' => $event->registration_end?->translatedFormat('d F Y'),
            'is_paid' => $event->is_paid,
            'fee_per_athlete_formatted' => $event->is_paid ? 'Rp '.number_format((float) $event->fee_per_athlete, 0, ',', '.') : 'Gratis',
            'fee_per_contingent_formatted' => $event->is_paid ? 'Rp '.number_format((float) $event->fee_per_contingent, 0, ',', '.') : 'Gratis',
            'match_categories_count' => (int) $event->match_categories_count,
            'contingents_count' => (int) $event->contingents_count,
            'url' => route('event.public.show', ['slug' => $event->slug]),
            'registration_url' => $registrationState === 'open' ? route('event.public.register', ['slug' => $event->slug]) : null,
        ];
    }
}
