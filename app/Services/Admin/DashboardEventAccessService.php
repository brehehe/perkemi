<?php

namespace App\Services\Admin;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DashboardEventAccessService
{
    /** @var list<string> */
    private const ScopedRoles = [
        'Penanggung Jawab',
        'Penanggung Jawab Event',
        'Arbitrase',
        'Perwasitan',
        'Panitera',
        'Koordinator Lapangan',
        'Wasit',
    ];

    /**
     * @return Collection<int, Event>
     */
    public function eventsFor(User $user): Collection
    {
        return $this->queryFor($user)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();
    }

    /** @return Collection<int, Event> */
    public function assignedEventsFor(User $user): Collection
    {
        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return Event::query()
                ->orderByDesc('is_active')
                ->orderByDesc('start_date')
                ->orderByDesc('id')
                ->get();
        }

        return $this->assignedQueryFor($user)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();
    }

    public function queryFor(User $user): Builder
    {
        $query = Event::query();

        if ($user->hasAnyRole(['Super Admin', 'Admin']) || ! $this->requiresEventScope($user)) {
            return $query;
        }

        return $this->assignedQueryFor($user);
    }

    public function canAccess(User $user, Event $event): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Admin'])
            || $this->assignedQueryFor($user)->whereKey($event->id)->exists();
    }

    public function requiresEventScope(User $user): bool
    {
        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return false;
        }

        return $user->hasAnyRole(self::ScopedRoles)
            || $this->assignedQueryFor($user)->exists();
    }

    private function assignedQueryFor(User $user): Builder
    {
        $query = Event::query();

        $email = mb_strtolower((string) $user->email);
        $refereeId = $user->referee()->value('id');

        return $query->where(function (Builder $eventQuery) use ($user, $email, $refereeId): void {
            $eventQuery->whereHas('users', fn (Builder $userQuery) => $userQuery->whereKey($user->id))
                ->orWhereHas('clerks', fn (Builder $clerkQuery) => $clerkQuery->whereRaw('LOWER(clerks.email) = ?', [$email]))
                ->orWhereHas('fieldCoordinators', fn (Builder $coordinatorQuery) => $coordinatorQuery->whereRaw('LOWER(field_coordinators.email) = ?', [$email]));

            if (is_string($refereeId) && $refereeId !== '') {
                $eventQuery->orWhereHas('referees', fn (Builder $refereeQuery) => $refereeQuery->whereKey($refereeId));
            }
        });
    }

    public function resolve(Request $request, User $user, Collection $events): ?Event
    {
        $requestedEventId = $request->query('event_id');

        if ($requestedEventId === 'all' && ! $this->requiresEventScope($user)) {
            $request->session()->forget(['tenant_event_id', 'tenant_event_slug']);

            return null;
        }

        if (is_string($requestedEventId) && $requestedEventId !== '') {
            $event = $events->firstWhere('id', $requestedEventId);
            abort_unless($event instanceof Event, 404, 'Event dashboard tidak ditemukan atau tidak ditugaskan kepada akun ini.');

            return $event;
        }

        $hostEvent = $this->eventFromHost($request);
        if ($hostEvent instanceof Event) {
            abort_unless($events->contains(fn (Event $event): bool => $event->is($hostEvent)), 403);

            return $hostEvent;
        }

        $sessionEventId = $request->session()->get('tenant_event_id');
        $sessionEvent = is_string($sessionEventId) ? $events->firstWhere('id', $sessionEventId) : null;

        return $sessionEvent instanceof Event
            ? $sessionEvent
            : $events->first(fn (Event $event): bool => (bool) $event->is_active)
                ?? ($this->requiresEventScope($user) ? $events->first() : null);
    }

    private function eventFromHost(Request $request): ?Event
    {
        $baseDomain = Str::lower((string) config('app.tenant_base_domain', 'localhost'));
        $host = Str::lower($request->getHost());

        if ($host === $baseDomain || ! Str::endsWith($host, ".{$baseDomain}")) {
            return null;
        }

        $subdomain = Str::beforeLast($host, ".{$baseDomain}");

        if ($subdomain === '' || Str::contains($subdomain, '.')) {
            return null;
        }

        return Event::query()
            ->where('tenant_subdomain', $subdomain)
            ->orWhere('slug', $subdomain)
            ->first();
    }
}
