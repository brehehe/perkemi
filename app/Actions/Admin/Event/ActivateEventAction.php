<?php

namespace App\Actions\Admin\Event;

use App\Models\Event;

class ActivateEventAction
{
    /**
     * Activate the specified event and deactivate all other events.
     */
    public function execute(Event $event): Event
    {
        return $event->makeActive();
    }
}
