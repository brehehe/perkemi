<?php

use App\Models\EventCourt;
use App\Models\TournamentMatch;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return filled($user?->id) && filled($id) && (string) $user->id === (string) $id;
});

Broadcast::channel('tournament-match.{matchId}', function ($user, string $matchId): bool {
    $match = TournamentMatch::query()->select(['id', 'event_id'])->find($matchId);

    if (! $match) {
        return false;
    }

    if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
        return true;
    }

    return $user->hasAnyRole(['Panitera', 'Wasit'])
        && $user->accessibleEvents()->whereKey($match->event_id)->exists();
});

Broadcast::channel('event-court.{courtId}', function ($user, string $courtId): bool {
    $court = EventCourt::query()->select(['id', 'event_id'])->find($courtId);

    if (! $court) {
        return false;
    }

    if ($user->hasAnyRole(['Super Admin', 'Admin'])) {
        return true;
    }

    return $user->hasAnyRole(['Panitera', 'Wasit'])
        && $user->accessibleEvents()->whereKey($court->event_id)->exists();
});
