<?php

namespace App\Actions\Admin\Tournament;

use App\Enums\RefereeCourtRole;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\RefereeAttendance;
use App\Models\RefereeCourtAssignmentHistory;
use App\Models\RefereeCourtAttendance;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GenerateRefereeCourtPanelsAction
{
    public function execute(Event $event, ?string $changedByUserId): int
    {
        return DB::transaction(function () use ($event, $changedByUserId): int {
            Event::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();

            $courts = $event->courts()
                ->where('is_active', true)
                ->orderBy('order')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($courts->isEmpty()) {
                throw ValidationException::withMessages([
                    'generate' => 'Belum ada court aktif yang dapat diberi penugasan.',
                ]);
            }

            $eligibleRefereeIds = RefereeAttendance::query()
                ->whereBelongsTo($event)
                ->whereDate('attendance_date', now()->toDateString())
                ->where('is_present', true)
                ->whereIn('referee_id', $event->referees()
                    ->where('referees.is_active', true)
                    ->reorder()
                    ->select('referees.id'))
                ->orderBy('checked_in_at')
                ->orderBy('referee_id')
                ->lockForUpdate()
                ->pluck('referee_id')
                ->shuffle()
                ->values();

            $roles = collect(RefereeCourtRole::cases());
            $requiredRefereeCount = $courts->count() * $roles->count();

            if ($eligibleRefereeIds->count() < $requiredRefereeCount) {
                $shortage = $requiredRefereeCount - $eligibleRefereeIds->count();

                throw ValidationException::withMessages([
                    'generate' => "Dibutuhkan {$requiredRefereeCount} wasit aktif yang hadir untuk {$courts->count()} court. Saat ini tersedia {$eligibleRefereeIds->count()}; tambahkan absensi {$shortage} wasit lagi.",
                ]);
            }

            $occurredAt = now();
            $batchId = (string) Str::uuid();
            $assignmentsByCourt = EventCourtAssignment::query()
                ->whereIn('event_court_id', $courts->modelKeys())
                ->where('staff_type', 'referee')
                ->lockForUpdate()
                ->get()
                ->groupBy('event_court_id');

            foreach ($courts as $court) {
                $this->recordAssignmentHistory(
                    event: $event,
                    eventCourt: $court,
                    assignments: $assignmentsByCourt->get($court->id, collect()),
                    action: RefereeCourtAssignmentHistory::ActionRemoved,
                    changedByUserId: $changedByUserId,
                    batchId: $batchId,
                    occurredAt: $occurredAt,
                );
            }

            EventCourtAssignment::query()
                ->whereIn('event_court_id', $courts->modelKeys())
                ->where('staff_type', 'referee')
                ->delete();

            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereIn('event_court_id', $courts->modelKeys())
                ->whereDate('attendance_date', now()->toDateString())
                ->delete();

            foreach ($courts as $courtIndex => $court) {
                $newAssignments = collect();
                $courtRefereeIds = $eligibleRefereeIds->slice($courtIndex * $roles->count(), $roles->count())->values();

                foreach ($roles as $roleIndex => $role) {
                    $newAssignments->push(EventCourtAssignment::query()->create([
                        'event_court_id' => $court->id,
                        'staff_type' => 'referee',
                        'staff_id' => $courtRefereeIds[$roleIndex],
                        'role' => $role->value,
                    ]));
                }

                $this->recordAssignmentHistory(
                    event: $event,
                    eventCourt: $court,
                    assignments: $newAssignments,
                    action: RefereeCourtAssignmentHistory::ActionAssigned,
                    changedByUserId: $changedByUserId,
                    batchId: $batchId,
                    occurredAt: $occurredAt,
                );
            }

            return $requiredRefereeCount;
        });
    }

    /**
     * @param  Collection<int, EventCourtAssignment>  $assignments
     */
    private function recordAssignmentHistory(
        Event $event,
        EventCourt $eventCourt,
        Collection $assignments,
        string $action,
        ?string $changedByUserId,
        string $batchId,
        Carbon $occurredAt,
    ): void {
        foreach ($assignments as $assignment) {
            RefereeCourtAssignmentHistory::query()->create([
                'event_id' => $event->id,
                'event_court_id' => $eventCourt->id,
                'referee_id' => $assignment->staff_id,
                'changed_by_user_id' => $changedByUserId,
                'batch_id' => $batchId,
                'action' => $action,
                'role' => $assignment->role,
                'occurred_at' => $occurredAt,
            ]);
        }
    }
}
