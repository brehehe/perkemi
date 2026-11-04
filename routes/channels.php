<?php

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\TournamentMatch;
use App\Services\Referee\RefereeIdentity;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return filled($user?->id) && filled($id) && (string) $user->id === (string) $id;
});

Broadcast::channel('tournament-match.{matchId}', function ($user, string $matchId): bool {
    $match = TournamentMatch::query()->select(['id', 'event_id'])->find($matchId);

    if (! $match) {
        return false;
    }

    if ($user->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan', 'Arbitrase'])) {
        return true;
    }

    if (! $user->hasAnyRole(['Panitera', 'Wasit', 'Court', 'Koordinator Lapangan'])) {
        return false;
    }

    if ($user->accessibleEvents()->whereKey($match->event_id)->exists()) {
        return true;
    }

    if ($user->hasRole('Wasit')) {
        $event = Event::find($match->event_id);

        return $event && app(RefereeIdentity::class)->forEvent($user, $event) !== null;
    }

    return false;
});

Broadcast::channel('event-court.{courtId}', function ($user, string $courtId): bool {
    $court = EventCourt::query()->select(['id', 'event_id'])->find($courtId);

    if (! $court) {
        return false;
    }

    if ($user->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan', 'Arbitrase'])) {
        return true;
    }

    if (! $user->hasAnyRole(['Panitera', 'Wasit', 'Court', 'Koordinator Lapangan'])) {
        return false;
    }

    if ($user->accessibleEvents()->whereKey($court->event_id)->exists()) {
        return true;
    }

    if ($user->hasRole('Wasit')) {
        $event = Event::find($court->event_id);

        return $event && app(RefereeIdentity::class)->forEvent($user, $event) !== null;
    }

    return false;
});

Broadcast::channel('event.{eventId}', function ($user, string $eventId): bool {
    if ($user->hasAnyRole(['Super Admin', 'Admin', 'Pertandingan', 'Arbitrase'])) {
        return true;
    }

    if (! $user->hasAnyRole(['Panitera', 'Wasit', 'Court', 'Koordinator Lapangan'])) {
        return false;
    }

    if ($user->accessibleEvents()->whereKey($eventId)->exists()) {
        return true;
    }

    if ($user->hasRole('Wasit')) {
        $event = Event::find($eventId);

        return $event && app(RefereeIdentity::class)->forEvent($user, $event) !== null;
    }

    return false;
});
