<?php

namespace App\Services\Panitera;

use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class EventContext
{
    public function eventFor(Request $request): Event
    {
        $tenantEvent = $request->attributes->get('tenantEvent');
        $requestedEventId = $this->requestedEventId($request);

        if ($tenantEvent instanceof Event) {
            abort_if($requestedEventId !== null && $requestedEventId !== $tenantEvent->id, 404);
            abort_unless($this->canAccess($request, $tenantEvent), 404);

            return $tenantEvent;
        }

        if ($requestedEventId !== null) {
            $event = Event::query()->findOrFail($requestedEventId);
            abort_unless($this->canAccess($request, $event), 404);

            return $event;
        }

        $event = $this->accessibleQuery($request)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->first();

        if (! $event && $request->user()?->hasRole('Panitera')) {
            $event = Event::query()->where('is_active', true)->first()
                ?? Event::query()->orderByDesc('start_date')->first();
        }

        abort_unless($event instanceof Event, 404, 'Event untuk Panitera belum tersedia.');

        return $event;
    }

    private function requestedEventId(Request $request): ?string
    {
        $eventId = $request->input('event_id');
        abort_unless($eventId === null || is_string($eventId), 404, 'Event tidak ditemukan.');

        $eventId = trim((string) $eventId);
        if ($eventId === '' || $eventId === 'all') {
            return null;
        }

        abort_unless(Str::isUuid($eventId), 404, 'Event tidak ditemukan.');

        return $eventId;
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

        if ($user?->hasRole('Panitera')) {
            return true;
        }

        return (bool) (in_array($event->accessRoleFor($user), [
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

        if (! $user) {
            return false;
        }

        $email = mb_strtolower((string) $user->email);
        $refereeId = $user->referee()->value('id');

        return (bool) (
            $user->hasAnyRole(['Super Admin', 'Admin'])
            || ($user->hasRole('Panitera') && $event->is_active)
            || $event->users()->whereKey($user->id)->exists()
            || $event->clerks()->whereRaw('LOWER(clerks.email) = ?', [$email])->exists()
            || $event->fieldCoordinators()->whereRaw('LOWER(field_coordinators.email) = ?', [$email])->exists()
            || ($user->hasRole('Wasit') && (
                $event->referees()->where(function (Builder $refereeQuery) use ($user, $email, $refereeId): void {
                    $refereeQuery->where('referees.user_id', $user->id)
                        ->orWhereRaw('LOWER(referees.email) = ?', [$email]);
                    if (is_string($refereeId) && $refereeId !== '') {
                        $refereeQuery->orWhere('referees.id', $refereeId);
                    }
                })->exists()
            ))
        );
    }

    /** @return Builder<Event> */
    private function accessibleQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = Event::query();

        if (! $user?->hasAnyRole(['Super Admin', 'Admin'])) {
            $email = mb_strtolower((string) $user?->email);
            $refereeId = $user?->referee()->value('id');

            $query->where(function (Builder $eventQuery) use ($user, $email, $refereeId): void {
                $eventQuery->whereHas('users', fn (Builder $userQuery) => $userQuery->whereKey($user?->id))
                    ->orWhereHas('clerks', fn (Builder $clerkQuery) => $clerkQuery->whereRaw('LOWER(clerks.email) = ?', [$email]))
                    ->orWhereHas('fieldCoordinators', fn (Builder $coordinatorQuery) => $coordinatorQuery->whereRaw('LOWER(field_coordinators.email) = ?', [$email]))
                    ->orWhereHas('referees', function (Builder $refereeQuery) use ($user, $email, $refereeId): void {
                        $refereeQuery->where('referees.user_id', $user?->id)
                            ->orWhereRaw('LOWER(referees.email) = ?', [$email]);
                        if (is_string($refereeId) && $refereeId !== '') {
                            $refereeQuery->orWhere('referees.id', $refereeId);
                        }
                    });
            });
        }

        return $query;
    }
}
