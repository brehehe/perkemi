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
use App\Models\TournamentMatch;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SwapOrMoveRefereeAction
{
    /**
     * Tatami roles (the 5 active referee positions on court).
     */
    public const TATAMI_ROLES = [
        'chief',
        'regional_1',
        'regional_2',
        'assistant_1',
        'assistant_2',
        'assistant_3',
        'assistant_4',
    ];

    /**
     * Swap two referees (within the same court or across courts) OR move a referee to a target court/role.
     *
     * @throws ValidationException
     */
    public function execute(
        Event $event,
        Referee $sourceReferee,
        ?Referee $targetReferee = null,
        ?EventCourt $targetCourt = null,
        ?string $targetRole = null,
        ?string $changedByUserId = null,
    ): string {
        if (! $sourceReferee->is_active) {
            throw ValidationException::withMessages([
                'swap' => "Wasit {$sourceReferee->name} berstatus tidak aktif sehingga tidak dapat ditugaskan di arena (SOP Wasit 3.1).",
            ]);
        }

        if ($targetReferee && ! $targetReferee->is_active) {
            throw ValidationException::withMessages([
                'swap' => "Wasit {$targetReferee->name} berstatus tidak aktif sehingga tidak dapat ditugaskan di arena (SOP Wasit 3.1).",
            ]);
        }

        // Validasi kehadiran harian bila pencatatan kehadiran aktif pada event
        $hasAttendanceTracking = RefereeAttendance::query()
            ->whereBelongsTo($event)
            ->whereDate('attendance_date', now()->toDateString())
            ->exists();

        if ($hasAttendanceTracking) {
            $sourcePresent = RefereeAttendance::query()
                ->whereBelongsTo($event)
                ->whereDate('attendance_date', now()->toDateString())
                ->where('referee_id', $sourceReferee->id)
                ->where('is_present', true)
                ->exists();

            if (! $sourcePresent) {
                throw ValidationException::withMessages([
                    'swap' => "Wasit {$sourceReferee->name} belum terverifikasi hadir hari ini pada absensi event (SOP Wasit 3.1).",
                ]);
            }

            if ($targetReferee) {
                $targetPresent = RefereeAttendance::query()
                    ->whereBelongsTo($event)
                    ->whereDate('attendance_date', now()->toDateString())
                    ->where('referee_id', $targetReferee->id)
                    ->where('is_present', true)
                    ->exists();

                if (! $targetPresent) {
                    throw ValidationException::withMessages([
                        'swap' => "Wasit {$targetReferee->name} belum terverifikasi hadir hari ini pada absensi event (SOP Wasit 3.1).",
                    ]);
                }
            }
        }

        return DB::transaction(function () use (
            $event,
            $sourceReferee,
            $targetReferee,
            $targetCourt,
            $targetRole,
            $changedByUserId,
        ): string {
            $activeCourts = $event->courts()
                ->where('is_active', true)
                ->orderBy('order')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $courtIds = $activeCourts->keys();

            $sourceAssignment = EventCourtAssignment::query()
                ->whereIn('event_court_id', $courtIds)
                ->where('staff_type', 'referee')
                ->where('staff_id', $sourceReferee->id)
                ->lockForUpdate()
                ->first();

            $targetAssignment = $targetReferee
                ? EventCourtAssignment::query()
                    ->whereIn('event_court_id', $courtIds)
                    ->where('staff_type', 'referee')
                    ->where('staff_id', $targetReferee->id)
                    ->lockForUpdate()
                    ->first()
                : null;

            // Jika mode direct move (targetRole / targetCourt dipilih tanpa targetReferee spesifik)
            if (! $targetReferee && ($targetCourt || $targetRole)) {
                $destCourt = $targetCourt ?? ($sourceAssignment ? $activeCourts->get($sourceAssignment->event_court_id) : $activeCourts->first());
                $destRole = $targetRole ?? ($sourceAssignment ? $sourceAssignment->role : 'reserve');

                // Jika target role bukan cadangan, periksa apakah slot tersebut sudah ditempati wasit lain
                if ($destRole !== 'reserve') {
                    $existingOccupant = EventCourtAssignment::query()
                        ->where('event_court_id', $destCourt->id)
                        ->where('staff_type', 'referee')
                        ->where('role', $destRole)
                        ->lockForUpdate()
                        ->first();

                    if ($existingOccupant && $existingOccupant->staff_id !== $sourceReferee->id) {
                        // Otomatis ubah menjadi swap dengan wasit yang saat ini menduduki slot tersebut
                        $targetAssignment = $existingOccupant;
                        $targetReferee = Referee::query()->find($existingOccupant->staff_id);
                    }
                }
            }

            // Tentukan rencana penugasan baru untuk Source dan Target
            $sourceOldCourtId = $sourceAssignment?->event_court_id;
            $sourceOldRole = $sourceAssignment?->role;

            $targetOldCourtId = $targetAssignment?->event_court_id;
            $targetOldRole = $targetAssignment?->role;

            if ($targetReferee) {
                // Saling bertukar court & role
                if ($sourceAssignment && $targetAssignment) {
                    $sourceNewCourtId = $targetOldCourtId;
                    $sourceNewRole = $targetOldRole;

                    $targetNewCourtId = $sourceOldCourtId;
                    $targetNewRole = $sourceOldRole;
                } elseif ($sourceAssignment && ! $targetAssignment) {
                    $sourceNewCourtId = $targetCourt?->id ?? $sourceOldCourtId;
                    $sourceNewRole = $targetRole ?? 'reserve';

                    $targetNewCourtId = $sourceOldCourtId;
                    $targetNewRole = $sourceOldRole;
                } elseif (! $sourceAssignment && $targetAssignment) {
                    $sourceNewCourtId = $targetOldCourtId;
                    $sourceNewRole = $targetOldRole;

                    $targetNewCourtId = $targetCourt?->id ?? $targetOldCourtId;
                    $targetNewRole = $targetRole ?? 'reserve';
                } else {
                    $destCourt = $targetCourt ?? $activeCourts->first();
                    $sourceNewCourtId = $destCourt->id;
                    $sourceNewRole = 'reserve';

                    $targetNewCourtId = $destCourt->id;
                    $targetNewRole = 'reserve';
                }
            } else {
                $destCourt = $targetCourt ?? ($sourceAssignment ? $activeCourts->get($sourceAssignment->event_court_id) : $activeCourts->first());
                $destRole = $targetRole ?? ($sourceAssignment ? $sourceAssignment->role : 'reserve');

                $sourceNewCourtId = $destCourt->id;
                $sourceNewRole = $destRole;

                $targetNewCourtId = null;
                $targetNewRole = null;
            }

            // Identifikasi semua court yang terpengaruh
            $affectedCourtIds = collect([
                $sourceOldCourtId,
                $sourceNewCourtId,
                $targetOldCourtId,
                $targetNewCourtId,
            ])->filter()->unique()->values();

            // Simulasi susunan seluruh court yang terpengaruh untuk validasi SOP
            foreach ($affectedCourtIds as $courtId) {
                $court = $activeCourts->get($courtId);
                if (! $court) {
                    continue;
                }

                $courtAssignments = EventCourtAssignment::query()
                    ->where('event_court_id', $courtId)
                    ->where('staff_type', 'referee')
                    ->lockForUpdate()
                    ->get();

                $simulatedRoles = [];
                foreach ($courtAssignments as $asn) {
                    $simulatedRoles[$asn->staff_id] = $asn->role;
                }

                // Terapkan perubahan source
                if ($sourceOldCourtId === $courtId) {
                    unset($simulatedRoles[$sourceReferee->id]);
                }
                if ($sourceNewCourtId === $courtId) {
                    $simulatedRoles[$sourceReferee->id] = $sourceNewRole;
                }

                // Terapkan perubahan target jika ada
                if ($targetReferee) {
                    if ($targetOldCourtId === $courtId) {
                        unset($simulatedRoles[$targetReferee->id]);
                    }
                    if ($targetNewCourtId === $courtId) {
                        $simulatedRoles[$targetReferee->id] = $targetNewRole;
                    }
                }

                $simulatedRefereeModels = Referee::query()
                    ->whereIn('id', array_keys($simulatedRoles))
                    ->get()
                    ->keyBy('id');

                // 1. VALIDASI KUALIFIKASI WASIT UTAMA (Wajib IV DAN+ / Wasit Nasional) [SOP Wasit 3.3]
                $chiefId = null;
                foreach ($simulatedRoles as $refId => $role) {
                    if ($role === RefereeCourtRole::Chief->value) {
                        $chiefId = $refId;
                        break;
                    }
                }

                if ($chiefId && $simulatedRefereeModels->has($chiefId)) {
                    $newChief = $simulatedRefereeModels->get($chiefId);
                    $isQualified = GenerateRefereeCourtPanelsAction::isChiefQualified($newChief);

                    if (! $isQualified) {
                        throw ValidationException::withMessages([
                            'swap' => "Pertukaran ditolak: Wasit {$newChief->name} ({$newChief->dan_grade}) berstatus III DAN sehingga belum memenuhi kualifikasi Wasit Utama (minimal IV DAN atau Wasit Nasional). Ketentuan Wasit Utama wajib minimal IV DAN ke atas.",
                        ]);
                    }
                }

                // 2. VALIDASI ANTI-BIAS ASAL DAERAH: MAKSIMAL 2 WASIT DARI KOTA YANG SAMA DI TATAMI [SOP Wasit 3.2 & 3.3]
                $tatamiReferees = collect();
                foreach ($simulatedRoles as $refId => $role) {
                    if (in_array($role, self::TATAMI_ROLES, true) && $simulatedRefereeModels->has($refId)) {
                        $tatamiReferees->push($simulatedRefereeModels->get($refId));
                    }
                }

                $cityCounts = [];
                foreach ($tatamiReferees as $tatamiRef) {
                    $city = GenerateRefereeCourtPanelsAction::normalizeCity($tatamiRef->region);
                    $cityCounts[$city] = ($cityCounts[$city] ?? 0) + 1;
                }

                foreach ($cityCounts as $city => $count) {
                    if ($count > 2) {
                        throw ValidationException::withMessages([
                            'swap' => "Pertukaran ditolak: Dalam satu susunan 5 wasit tatami di {$court->name}, maksimal hanya boleh 2 wasit dari daerah yang sama ({$city}: {$count} orang) sesuai ketentuan anti-bias SOP Wasit (3.3).",
                        ]);
                    }
                }

                // 3. VALIDASI BENTURAN KEPENTINGAN DENGAN ATLET BERTANDING [SOP Wasit 3.3 & 4]
                $activeMatch = TournamentMatch::query()
                    ->where('event_court_id', $court->id)
                    ->whereIn('status', ['in_progress', 'ongoing', 'calling'])
                    ->with(['redEntry.athlete.contingent', 'blueEntry.athlete.contingent', 'participantEntry.athlete.contingent'])
                    ->first();

                if ($activeMatch) {
                    $competingRegions = collect([
                        $activeMatch->redEntry?->athlete?->contingent?->name,
                        $activeMatch->blueEntry?->athlete?->contingent?->name,
                        $activeMatch->participantEntry?->athlete?->contingent?->name,
                    ])->filter()->map(fn ($c) => GenerateRefereeCourtPanelsAction::normalizeCity($c))->unique();

                    foreach ($tatamiReferees as $tatamiRef) {
                        $refCity = GenerateRefereeCourtPanelsAction::normalizeCity($tatamiRef->region);
                        if ($competingRegions->contains($refCity)) {
                            throw ValidationException::withMessages([
                                'swap' => "Pertukaran ditolak karena benturan kepentingan: Wasit {$tatamiRef->name} berasal dari daerah yang sama ({$tatamiRef->region}) dengan atlet/kontingen yang sedang bertanding di {$court->name} saat ini (SOP Wasit 3.3 & 4).",
                            ]);
                        }
                    }
                }
            }

            // EKSEKUSI PERUBAHAN DI DATABASE
            $occurredAt = now();
            $batchId = (string) Str::uuid();

            // 1. Mutasi penugasan (update in-place bila ada, atau create bila belum ada)
            if ($sourceAssignment) {
                $sourceAssignment->update([
                    'event_court_id' => $sourceNewCourtId,
                    'role' => $sourceNewRole,
                ]);
                $newSourceAssignment = $sourceAssignment;
            } else {
                $newSourceAssignment = EventCourtAssignment::query()->create([
                    'event_court_id' => $sourceNewCourtId,
                    'staff_type' => 'referee',
                    'staff_id' => $sourceReferee->id,
                    'role' => $sourceNewRole,
                ]);
            }

            $this->recordAssignmentHistory(
                event: $event,
                court: $activeCourts->get($sourceNewCourtId),
                assignment: $newSourceAssignment,
                action: RefereeCourtAssignmentHistory::ActionAssigned,
                changedByUserId: $changedByUserId,
                batchId: $batchId,
                occurredAt: $occurredAt,
            );

            if ($targetReferee) {
                if ($targetAssignment) {
                    $targetAssignment->update([
                        'event_court_id' => $targetNewCourtId,
                        'role' => $targetNewRole,
                    ]);
                    $newTargetAssignment = $targetAssignment;
                } elseif ($targetNewCourtId && $targetNewRole) {
                    $newTargetAssignment = EventCourtAssignment::query()->create([
                        'event_court_id' => $targetNewCourtId,
                        'staff_type' => 'referee',
                        'staff_id' => $targetReferee->id,
                        'role' => $targetNewRole,
                    ]);
                }

                if ($newTargetAssignment) {
                    $this->recordAssignmentHistory(
                        event: $event,
                        court: $activeCourts->get($targetNewCourtId),
                        assignment: $newTargetAssignment,
                        action: RefereeCourtAssignmentHistory::ActionAssigned,
                        changedByUserId: $changedByUserId,
                        batchId: $batchId,
                        occurredAt: $occurredAt,
                    );
                }
            }

            // 4. Reset check-in court untuk wasit yang berpindah posisi agar scan ulang QR posisi barunya
            $movedRefereeIds = collect([$sourceReferee->id, $targetReferee?->id])->filter()->all();
            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereIn('referee_id', $movedRefereeIds)
                ->delete();

            // 5. Hapus cache session lock agar posisi baru bisa langsung diklaim
            foreach ([$sourceOldCourtId => $sourceOldRole, $sourceNewCourtId => $sourceNewRole, $targetOldCourtId => $targetOldRole, $targetNewCourtId => $targetNewRole] as $cId => $r) {
                if ($cId && $r) {
                    Cache::forget("referee_session_lock:court_{$cId}:role_{$r}");
                }
            }

            $sourceRoleLabel = RefereeCourtRole::tryFrom($sourceNewRole)?->label() ?? ($sourceNewRole === 'reserve' ? 'Wasit Cadangan' : $sourceNewRole);
            $sourceCourtName = $activeCourts->get($sourceNewCourtId)?->name ?? 'Court';

            if ($targetReferee) {
                $targetRoleLabel = RefereeCourtRole::tryFrom($targetNewRole)?->label() ?? ($targetNewRole === 'reserve' ? 'Wasit Cadangan' : $targetNewRole);
                $targetCourtName = $activeCourts->get($targetNewCourtId)?->name ?? 'Court';

                return "Wasit {$sourceReferee->name} ({$sourceRoleLabel} di {$sourceCourtName}) berhasil ditukar dengan {$targetReferee->name} ({$targetRoleLabel} di {$targetCourtName}). Kedua wasit wajib scan QR posisi barunya.";
            }

            return "Wasit {$sourceReferee->name} berhasil dipindahkan ke posisi {$sourceRoleLabel} di {$sourceCourtName}. Wasit wajib scan QR posisi barunya.";
        });
    }

    private function recordAssignmentHistory(
        Event $event,
        ?EventCourt $court,
        EventCourtAssignment $assignment,
        string $action,
        ?string $changedByUserId,
        string $batchId,
        Carbon $occurredAt,
    ): void {
        if (! $court) {
            return;
        }

        RefereeCourtAssignmentHistory::query()->create([
            'event_id' => $event->id,
            'event_court_id' => $court->id,
            'referee_id' => $assignment->staff_id,
            'role' => $assignment->role,
            'action' => $action,
            'changed_by_user_id' => $changedByUserId,
            'batch_id' => $batchId,
            'occurred_at' => $occurredAt,
        ]);
    }
}
