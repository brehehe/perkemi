<?php

namespace App\Actions\Admin\Event;

use App\Models\Event;

class ActivateEventAction
{
    /**
     * Make the specified event available in operational menus.
     */
    public function execute(Event $event): Event
    {
        return $event->makeActive();
    }
}
