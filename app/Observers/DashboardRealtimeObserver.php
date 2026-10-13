<?php

namespace App\Observers;

use App\Events\DashboardSummaryUpdated;
use App\Models\Athlete;
use Illuminate\Database\Eloquent\Model;

class DashboardRealtimeObserver
{
    public function saved(Model $model): void
    {
        $this->broadcast($model);
    }

    public function deleted(Model $model): void
    {
        $this->broadcast($model);
    }

    private function broadcast(Model $model): void
    {
        $eventId = $model instanceof Athlete
            ? $model->contingent()->value('event_id')
            : $model->getAttribute('event_id');

        if (is_string($eventId) && $eventId !== '') {
            DashboardSummaryUpdated::dispatch($eventId);
        }
    }
}
