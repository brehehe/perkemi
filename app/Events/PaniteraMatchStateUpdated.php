<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class PaniteraMatchStateUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable;

    /**
     * @param  array{
     *     status: string,
     *     started_at: string|null,
     *     started_at_ms: int|null,
     *     elapsed_seconds: int,
     *     elapsed_ms: int,
     *     direction: string,
     *     duration_seconds: int,
     *     duration_ms: int,
     *     version: int,
     *     is_finished: bool,
     *     finished_at: string|null,
     *     time_penalty: float|null
     * }  $timer
     */
    public function __construct(
        public string $eventId,
        public string $courtId,
        public string $matchId,
        public string $action,
        public string $matchStatus,
        public string $callStatus,
        public array $timer,
        public string $serverNow,
        public int $serverNowMs,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("event-court.{$this->courtId}"),
            new PrivateChannel("tournament-match.{$this->matchId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'panitera.match-state.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'court_id' => $this->courtId,
            'match_id' => $this->matchId,
            'action' => $this->action,
            'match_status' => $this->matchStatus,
            'call_status' => $this->callStatus,
            'timer' => $this->timer,
            'server_now' => $this->serverNow,
            'server_now_ms' => $this->serverNowMs,
        ];
    }
}
