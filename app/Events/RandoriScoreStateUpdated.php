<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;

class RandoriScoreStateUpdated implements ShouldBroadcastNow, ShouldRescue
{
    use Dispatchable;

    /**
     * @param  array<string, mixed>  $changes
     */
    public function __construct(
        public string $eventId,
        public string $matchId,
        public ?string $courtId,
        public string $action,
        public int $version,
        public array $changes,
        public ?string $clientId,
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
        return 'randori.score-state.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'match_id' => $this->matchId,
            'court_id' => $this->courtId,
            'action' => $this->action,
            'version' => $this->version,
            'changes' => $this->changes,
            'client_id' => $this->clientId,
            'updated_at' => $this->updatedAt,
        ];
    }
}
