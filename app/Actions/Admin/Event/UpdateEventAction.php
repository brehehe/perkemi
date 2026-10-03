<?php

namespace App\Actions\Admin\Event;

use App\Models\Event;
use Illuminate\Support\Facades\DB;

class UpdateEventAction
{
    public function __construct(
        private readonly SyncEventRegistrationFeesAction $syncRegistrationFees,
    ) {}

    /**
     * Execute event update with active status management.
     *
     * @param  array<string, mixed>  $data
     */
    public function execute(Event $event, array $data): Event
    {
        $wasPaid = (bool) $event->is_paid;
        $data['is_paid'] = (bool) ($data['is_paid'] ?? true);
        if (! $data['is_paid']) {
            $data['fee_per_athlete'] = 0;
            $data['fee_per_contingent'] = 0;
        }

        $isActive = ! empty($data['is_active']);

        return DB::transaction(function () use ($event, $data, $isActive, $wasPaid): Event {
            if ($isActive && ! $event->is_active) {
                Event::where('id', '!=', $event->id)->update(['is_active' => false]);
            }

            $event->update($data);

            if (! $event->is_paid) {
                $event->paymentMethods()->detach();
            }

            if ($event->wasChanged(['is_paid', 'fee_per_athlete', 'fee_per_contingent'])) {
                $this->syncRegistrationFees->execute($event, $wasPaid);
            }

            return $event->refresh();
        });
    }
}
