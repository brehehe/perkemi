<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class EmbuJudgeScoreUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable;

    public function __construct(
        public string $eventId,
        public string $matchId,
        public string $courtId,
        public int $judgeNumber,
        public int $completedItems,
        public float $totalScore,
        public string $status,
        public string $updatedAt,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("tournament-match.{$this->matchId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'embu.judge-score.updated';
    }

    /** @return array<string, int|float|string> */
    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'match_id' => $this->matchId,
            'court_id' => $this->courtId,
            'judge_number' => $this->judgeNumber,
            'completed_items' => $this->completedItems,
            'total_score' => $this->totalScore,
            'status' => $this->status,
            'updated_at' => $this->updatedAt,
        ];
    }

    public function broadcastQueue(): string
    {
        return 'broadcasts';
    }
}
