<?php

namespace App\Services\Admin;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\EventCourtAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DashboardEventAccessService
{
    /** @var list<string> */
    private const ScopedRoles = [
        'Viewer',
        'Penanggung Jawab',
        'Penanggung Jawab Event',
        'Pertandingan',
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

    /** @return Collection<int, Event> */
    public function switchableEventsFor(User $user): Collection
    {
        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return Event::query()
                ->orderByDesc('is_active')
                ->orderByDesc('start_date')
                ->orderByDesc('id')
                ->get();
        }

        return Event::query()
            ->where(function (Builder $q) use ($user): void {
                $q->whereIn('id', $this->assignedQueryFor($user)->select('id'))
                    ->orWhereHas('contingents', fn (Builder $cq) => $cq->where('user_id', $user->id));

                if ($user->hasAnyRole(['kontingen', 'Contingent']) || $user->contingents()->exists()) {
                    $q->orWhere(function (Builder $eq): void {
                        $eq->where('is_active', true)
                            ->where('status', EventStatus::OpenRegistration);
                    });
                }
            })
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();
    }

    public function canAccess(User $user, Event $event): bool
    {
        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return true;
        }

        if ($event->accessRoleFor($user) !== null) {
            return true;
        }

        if ($this->assignedQueryFor($user)->whereKey($event->id)->exists()) {
            return true;
        }

        if ($event->contingents()->where('user_id', $user->id)->exists()) {
            return true;
        }

        if ($event->is_active && $event->status === EventStatus::OpenRegistration && ($user->hasAnyRole(['kontingen', 'Contingent']) || $user->contingents()->exists())) {
            return true;
        }

        return false;
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

    public function assignmentLabelFor(User $user, Event $event): ?string
    {
        if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
            return 'Administrator';
        }

        $accessRole = $event->accessRoleFor($user);
        if ($accessRole === Event::AccessRoleResponsible) {
            return 'Penanggung Jawab Event';
        }
        if ($accessRole === Event::AccessRoleAdmin) {
            return 'Panitia Pelaksana';
        }
        if ($accessRole === Event::AccessRoleViewer) {
            return 'Viewer / Pengamat';
        }
        if ($accessRole === Event::AccessRoleStaff) {
            return 'Staf Event';
        }

        $email = mb_strtolower((string) $user->email);

        // Check Court Assignment for Field Coordinator
        $fc = $event->fieldCoordinators()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($fc) {
            $courtAssignment = EventCourtAssignment::where('staff_type', 'field_coordinator')
                ->where('staff_id', $fc->id)
                ->whereHas('court', fn (Builder $q) => $q->whereBelongsTo($event))
                ->with('court')
                ->first();

            if ($courtAssignment?->court) {
                return 'Koordinator '.$courtAssignment->court->name;
            }

            return 'Koordinator Lapangan';
        }

        // Check Court Assignment for Clerk / Panitera
        $clerk = $event->clerks()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($clerk) {
            $courtAssignment = EventCourtAssignment::where('staff_type', 'clerk')
                ->where('staff_id', $clerk->id)
                ->whereHas('court', fn (Builder $q) => $q->whereBelongsTo($event))
                ->with('court')
                ->first();

            if ($courtAssignment?->court) {
                return 'Panitera '.$courtAssignment->court->name;
            }

            return 'Panitera';
        }

        // Check Referee
        $refereeId = $user->referee()->value('id');
        if ($refereeId && $event->referees()->where('referees.id', $refereeId)->exists()) {
            return 'Wasit / Juri';
        }

        // Check Contingent
        $contingent = $event->contingents()->where('user_id', $user->id)->first();
        if ($contingent) {
            return 'Kontingen: '.$contingent->name;
        }

        if ($user->hasAnyRole(['kontingen', 'Contingent']) || $user->contingents()->exists()) {
            return 'Buka Pendaftaran';
        }

        if ($event->is_active) {
            return 'Event Aktif';
        }

        return null;
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

        if ($sessionEvent instanceof Event) {
            return $sessionEvent;
        }

        if ($this->requiresEventScope($user)) {
            return $events->first(fn (Event $event): bool => (bool) $event->is_active)
                ?? $events->first();
        }

        return null;
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
