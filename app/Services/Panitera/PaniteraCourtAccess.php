<?php

namespace App\Services\Panitera;

use App\Models\Clerk;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\FieldCoordinator;
use App\Models\TournamentMatch;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class PaniteraCourtAccess
{
    /** @return Collection<int, string>|null */
    public function assignedCourtIds(Request $request, Event $event): ?Collection
    {
        $user = $request->user();

        if (! $user || $user->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan'])) {
            return null;
        }

        // Koordinator Court restriction: scoped to their assigned court
        if ($user->hasRole('Court') || $user->hasRole('Koordinator Lapangan')) {
            $coordinator = FieldCoordinator::query()
                ->where('is_active', true)
                ->where(function ($q) use ($user): void {
                    $q->whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
                        ->orWhere('coordinator_number', $user->nik_perkemi);
                })
                ->first();

            if ($coordinator) {
                $courtId = EventCourtAssignment::query()
                    ->whereIn('event_court_id', $event->courts()->select('id'))
                    ->where('staff_type', 'field_coordinator')
                    ->where('staff_id', $coordinator->id)
                    ->where('role', 'court_coordinator')
                    ->value('event_court_id');

                if ($courtId) {
                    return collect([$courtId]);
                }
            }
        }

        if (! $user->hasRole('Panitera')) {
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
