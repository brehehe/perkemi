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
        $channels = [
            new PrivateChannel("tournament-match.{$this->matchId}"),
        ];

        if (! empty($this->courtId)) {
            $channels[] = new PrivateChannel("event-court.{$this->courtId}");
        }

        return $channels;
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
