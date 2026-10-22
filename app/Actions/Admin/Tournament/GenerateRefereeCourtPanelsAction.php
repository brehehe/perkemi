<?php

namespace App\Actions\Admin\Tournament;

use App\Enums\RefereeCourtRole;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventCourtAssignment;
use App\Models\Referee;
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

            $presentRefereeIds = RefereeAttendance::query()
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
                ->pluck('referee_id');

            $roles = collect(RefereeCourtRole::cases());
            $requiredRefereeCount = $courts->count() * $roles->count();

            if ($presentRefereeIds->count() < $requiredRefereeCount) {
                $shortage = $requiredRefereeCount - $presentRefereeIds->count();

                throw ValidationException::withMessages([
                    'generate' => "Dibutuhkan {$requiredRefereeCount} wasit aktif yang hadir untuk {$courts->count()} court. Saat ini tersedia {$presentRefereeIds->count()}; tambahkan absensi {$shortage} wasit lagi.",
                ]);
            }

            $referees = Referee::query()
                ->whereIn('id', $presentRefereeIds)
                ->lockForUpdate()
                ->get();

            // 4.1 & 4.2: Ketentuan wasit utama yg IV Dan ke atas / Nasional
            $chiefCandidates = $referees->filter(fn (Referee $r): bool => self::isChiefQualified($r))->shuffle();

            if ($chiefCandidates->count() < $courts->count()) {
                $shortageChief = $courts->count() - $chiefCandidates->count();

                throw ValidationException::withMessages([
                    'generate' => "Dibutuhkan minimal {$courts->count()} wasit dengan kualifikasi IV DAN ke atas / Wasit Nasional yang hadir untuk posisi Wasit Utama. Saat ini hanya tersedia {$chiefCandidates->count()}; tambahkan {$shortageChief} wasit IV DAN ke atas lagi.",
                ]);
            }

            // Alokasikan Chief (Wasit Utama) untuk setiap court
            $chosenChiefs = $chiefCandidates->take($courts->count())->values();
            $chosenChiefIds = $chosenChiefs->pluck('id');

            // Wasit yang tersisa untuk posisi daerah dan pembantu
            $remainingPool = $referees->whereNotIn('id', $chosenChiefIds)->shuffle();

            // 4.3: Yg 3 Dan daerah diprioritaskan untuk posisi Wasit Daerah 1 & 2
            $regionalCandidates = $remainingPool->filter(fn (Referee $r): bool => self::isRegionalQualified($r))->values();
            $assistantCandidates = $remainingPool->reject(fn (Referee $r): bool => self::isRegionalQualified($r))->values();

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

            // Pool yang dapat diambil secara dinamis
            $regionalPool = $regionalCandidates->collect();
            $otherPool = $assistantCandidates->collect();

            $pullReferee = function () use (&$regionalPool, &$otherPool): Referee {
                if ($regionalPool->isNotEmpty()) {
                    return $regionalPool->shift();
                }

                return $otherPool->shift();
            };

            foreach ($courts as $courtIndex => $court) {
                $newAssignments = collect();

                // 1. Wasit Utama (IV DAN+)
                $chief = $chosenChiefs[$courtIndex];
                $newAssignments->push(EventCourtAssignment::query()->create([
                    'event_court_id' => $court->id,
                    'staff_type' => 'referee',
                    'staff_id' => $chief->id,
                    'role' => RefereeCourtRole::Chief->value,
                ]));

                // 2. Wasit Daerah 1 & 2 (Prioritaskan III DAN Daerah)
                foreach ([RefereeCourtRole::RegionalOne, RefereeCourtRole::RegionalTwo] as $role) {
                    $ref = $pullReferee();
                    $newAssignments->push(EventCourtAssignment::query()->create([
                        'event_court_id' => $court->id,
                        'staff_type' => 'referee',
                        'staff_id' => $ref->id,
                        'role' => $role->value,
                    ]));
                }

                // 3. Wasit Pembantu 1 & 2 (Sisa pool)
                foreach ([RefereeCourtRole::AssistantOne, RefereeCourtRole::AssistantTwo] as $role) {
                    $ref = $pullReferee();
                    $newAssignments->push(EventCourtAssignment::query()->create([
                        'event_court_id' => $court->id,
                        'staff_type' => 'referee',
                        'staff_id' => $ref->id,
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

    public static function isChiefQualified(Referee $referee): bool
    {
        $dan = strtoupper(trim((string) $referee->dan_grade));
        $cert = strtoupper(trim((string) $referee->certification_level));

        if (str_contains($cert, 'NASIONAL')) {
            return true;
        }

        if (preg_match('/\b(IV|V|VI|VII|VIII|[4-9])\b/i', $dan)) {
            return true;
        }

        return false;
    }

    public static function isRegionalQualified(Referee $referee): bool
    {
        $dan = strtoupper(trim((string) $referee->dan_grade));
        $cert = strtoupper(trim((string) $referee->certification_level));

        if (str_contains($cert, 'DAERAH')) {
            return true;
        }

        if (preg_match('/\b(III|3)\b/i', $dan) && ! preg_match('/\b(IV|V|VI|VII|VIII|[4-9])\b/i', $dan)) {
            return true;
        }

        return false;
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
