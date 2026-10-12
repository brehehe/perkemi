<?php

namespace App\Services\Referee;

use App\Models\Event;
use App\Models\Referee;
use App\Models\User;

class RefereeIdentity
{
    public function forEvent(User $user, Event $event): ?Referee
    {
        if (! $user->hasRole('Wasit')) {
            return null;
        }

        return $event->referees()
            ->where('referees.is_active', true)
            ->where(function ($query) use ($user): void {
                $query->where('referees.user_id', $user->id)
                    ->orWhere(function ($query) use ($user): void {
                        $query->whereNull('referees.user_id')
                            ->where('referees.email', $user->email);
                    });
            })
            ->first();
    }
}
