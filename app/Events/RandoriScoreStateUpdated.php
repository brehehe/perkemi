<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class RandoriScoreStateUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
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
        return 'randori.score-state.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        $sanitizedChanges = $this->changes;
        if (isset($sanitizedChanges['signatures']) && is_array($sanitizedChanges['signatures'])) {
            $sanitizedChanges['signatures'] = array_map(
                fn ($val) => ! empty($val),
                $sanitizedChanges['signatures']
            );
        }

        return [
            'event_id' => $this->eventId,
            'match_id' => $this->matchId,
            'court_id' => $this->courtId,
            'action' => $this->action,
            'version' => $this->version,
            'changes' => $sanitizedChanges,
            'client_id' => $this->clientId,
            'updated_at' => $this->updatedAt,
        ];
    }
}
