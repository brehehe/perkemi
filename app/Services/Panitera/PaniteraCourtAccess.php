<?php

namespace App\Services\Panitera;

use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\TournamentMatch;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class PaniteraCourtAccess
{
    /** @return Collection<int, string>|null */
    public function assignedCourtIds(Request $request, Event $event): ?Collection
    {
        $user = $request->user();

        if (! $user?->hasRole('Panitera') || $user->hasAnyRole(['Super Admin', 'Admin'])) {
            return null;
        }

        $sessionCourtId = $request->session()->get('panitera_court_id');
        if ($sessionCourtId && $event->courts()->whereKey($sessionCourtId)->exists()) {
            return collect([$sessionCourtId]);
        }

        $clerkIds = Clerk::query()
            ->where('email', $user->email)
            ->whereHas('events', fn ($events) => $events->whereKey($event->id))
            ->pluck('id');

        if ($clerkIds->isEmpty()) {
            return null;
        }

        $courtIds = EventCourtAssignment::query()
            ->where('staff_type', 'clerk')
            ->whereIn('staff_id', $clerkIds)
            ->whereIn('event_court_id', $event->courts()->select('id'))
            ->pluck('event_court_id')
            ->unique()
            ->values();

        if ($courtIds->isEmpty()) {
            return null;
        }

        return $courtIds;
    }

    public function ensureMatchIsAccessible(Request $request, Event $event, TournamentMatch $match): void
    {
        $courtIds = $this->assignedCourtIds($request, $event);

        abort_if(
            $courtIds !== null
                && $match->event_court_id !== null
                && ! $courtIds->contains($match->event_court_id),
            404,
        );
    }

    public function ensureCourtIsAccessible(Request $request, Event $event, EventCourt $court): void
    {
        $courtIds = $this->assignedCourtIds($request, $event);

        abort_if($courtIds !== null && ! $courtIds->contains($court->id), 404);
    }
}
