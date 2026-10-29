<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

class VarReviewStateUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    use Dispatchable;

    /**
     * @param  array<string, mixed>  $reviewData
     * @param  array{aka: int, shiro: int}  $cardsRemaining
     */
    public function __construct(
        public string $eventId,
        public string $courtId,
        public string $matchId,
        public bool $isUnderReview,
        public array $reviewData,
        public array $cardsRemaining,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel("tournament-match.{$this->matchId}"),
        ];

        if ($this->courtId !== '') {
            $channels[] = new PrivateChannel("event-court.{$this->courtId}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'var.review.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'court_id' => $this->courtId,
            'match_id' => $this->matchId,
            'is_under_review' => $this->isUnderReview,
            'review' => $this->reviewData,
            'cards_remaining' => $this->cardsRemaining,
        ];
    }
}
