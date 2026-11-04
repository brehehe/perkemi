<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class EmbuJudgeScoreUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable;

    public function __construct(
        public string $eventId,
        public string $matchId,
        public string $courtId,
        public int $judgeNumber,
        public int $completedItems,
        public float $totalScore,
        public float $violationPenalty,
        public string $status,
        public string $updatedAt,
        public bool $isSigned = false,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return list<PrivateChannel>
     */
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
            'violation_penalty' => $this->violationPenalty,
            'status' => $this->status,
            'updated_at' => $this->updatedAt,
            'is_signed' => $this->isSigned,
        ];
    }
}
