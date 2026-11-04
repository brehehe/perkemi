<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class EmbuTiebreakUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable;

    /**
     * @param  list<string>  $matchIds
     * @param  list<string>  $courtIds
     * @param  array<string, int>  $ranks
     */
    public function __construct(
        public string $eventId,
        public string $categoryId,
        public string $action, // 'requested' | 'cancelled' | 'resolved'
        public array $matchIds = [],
        public array $courtIds = [],
        public array $ranks = [],
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel("event.{$this->eventId}"),
        ];

        foreach ($this->courtIds as $courtId) {
            if ($courtId) {
                $channels[] = new PrivateChannel("event-court.{$courtId}");
            }
        }

        foreach ($this->matchIds as $matchId) {
            if ($matchId) {
                $channels[] = new PrivateChannel("tournament-match.{$matchId}");
            }
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'embu.tiebreak.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'category_id' => $this->categoryId,
            'action' => $this->action,
            'match_ids' => $this->matchIds,
            'court_ids' => $this->courtIds,
            'ranks' => $this->ranks,
            'server_now' => now()->toIso8601String(),
        ];
    }
}
