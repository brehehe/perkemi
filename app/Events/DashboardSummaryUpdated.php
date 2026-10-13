<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class DashboardSummaryUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable;

    public function __construct(public string $eventId) {}

    /** @return list<Channel> */
    public function broadcastOn(): array
    {
        return [new Channel("event.{$this->eventId}.dashboard")];
    }

    public function broadcastAs(): string
    {
        return 'dashboard.summary.updated';
    }

    /** @return array{event_id: string, updated_at: string} */
    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
