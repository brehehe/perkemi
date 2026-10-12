<?php

namespace App\Services\Panitera;

use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class EventContext
{
    public function eventFor(Request $request): Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');

        if ($tenantEvent instanceof Event) {
            $requestedEventId = $request->input('event_id');
            abort_if(is_string($requestedEventId) && $requestedEventId !== '' && $requestedEventId !== $tenantEvent->id, 404);
            abort_unless($this->canAccess($request, $tenantEvent), 404);

            return $tenantEvent;
        }

        $requestedEventId = $request->input('event_id');
        if (is_string($requestedEventId) && $requestedEventId !== '') {
            $event = Event::query()->findOrFail($requestedEventId);
            abort_unless($this->canAccess($request, $event), 404);

            return $event;
        }

        $event = $this->accessibleQuery($request)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->first();

        abort_unless($event instanceof Event, 404, 'Event untuk Panitera belum tersedia.');

        return $event;
    }

    public function ensureCanManage(Request $request, Event $event): void
    {
        abort_unless($this->canManage($request, $event), 403);
    }

    public function canManage(Request $request, Event $event): bool
    {
        $user = $request->user();

        if ($user?->hasAnyRole(['Super Admin', 'Admin'])) {
            return true;
        }

        return (bool) ($user?->hasRole('Panitera') && in_array($event->accessRoleFor($user), [
            Event::AccessRoleResponsible,
            Event::AccessRoleAdmin,
            Event::AccessRoleStaff,
        ], true));
    }

    /** @return Collection<int, array<string, mixed>> */
    public function accessibleEvents(Request $request): Collection
    {
        return $this->accessibleQuery($request)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get(['id', 'name', 'city', 'start_date', 'end_date', 'status', 'is_active'])
            ->map(fn (Event $event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'city' => $event->city,
                'date_label' => $event->start_date?->translatedFormat('d M Y').' – '.$event->end_date?->translatedFormat('d M Y'),
                'status' => $event->status->value,
                'status_label' => $event->status->label(),
                'is_active' => (bool) $event->is_active,
            ]);
    }

    private function canAccess(Request $request, Event $event): bool
    {
        $user = $request->user();

        return (bool) ($user && (
            $user->hasAnyRole(['Super Admin', 'Admin'])
            || $event->users()->whereKey($user->id)->exists()
        ));
    }

    /** @return Builder<Event> */
    private function accessibleQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = Event::query();

        if (! $user?->hasAnyRole(['Super Admin', 'Admin'])) {
            $query->whereHas('users', fn (Builder $eventUsers) => $eventUsers->whereKey($user?->id));
        }

        return $query;
    }
}
