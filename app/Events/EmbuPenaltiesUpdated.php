<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class EmbuPenaltiesUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable;

    /**
     * @param  array<string, int>  $penalties
     */
    public function __construct(
        public string $eventId,
        public string $matchId,
        public string $courtId,
        public array $penalties,
        public float $penaltyPoints,
        public string $source,
        public string $updatedAt,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("tournament-match.{$this->matchId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'embu.penalties.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'match_id' => $this->matchId,
            'court_id' => $this->courtId,
            'penalties' => $this->penalties,
            'penalty_points' => $this->penaltyPoints,
            'source' => $this->source,
            'updated_at' => $this->updatedAt,
        ];
    }
}
