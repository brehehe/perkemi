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
    /**
     * Stage 1: Koordinator Pertandingan membagi seluruh wasit aktif ke Court 1 & 2
     * dengan penyeimbangan kota (selisih antar court max 1) dan kualifikasi DAN.
     */
    public function execute(Event $event, ?string $changedByUserId): int
    {
        return $this->allocateCourts($event, $changedByUserId);
    }

    /**
     * Membagi pool wasit ke seluruh court aktif (Koordinator Pertandingan).
     */
    public function allocateCourts(Event $event, ?string $changedByUserId): int
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

            $requiredTotal = $courts->count() * 5;

            if ($presentRefereeIds->count() < $requiredTotal) {
                $shortage = $requiredTotal - $presentRefereeIds->count();

                throw ValidationException::withMessages([
                    'generate' => "Dibutuhkan {$requiredTotal} wasit aktif yang hadir untuk {$courts->count()} court. Saat ini tersedia {$presentRefereeIds->count()}; tambahkan absensi {$shortage} wasit lagi.",
                ]);
            }

            $referees = Referee::query()
                ->whereIn('id', $presentRefereeIds)
                ->lockForUpdate()
                ->get();

            // Pisahkan kualifikasi: Wasit Utama (IV DAN+) dan Wasit Pembantu (III DAN-)
            $chiefCandidates = $referees->filter(fn (Referee $r): bool => self::isChiefQualified($r));
            $assistantCandidates = $referees->reject(fn (Referee $r): bool => self::isChiefQualified($r));

            if ($chiefCandidates->count() < $courts->count()) {
                $shortageChief = $courts->count() - $chiefCandidates->count();

                throw ValidationException::withMessages([
                    'generate' => "Dibutuhkan minimal {$courts->count()} wasit dengan kualifikasi IV DAN ke atas / Wasit Nasional untuk posisi Wasit Utama. Saat ini hanya tersedia {$chiefCandidates->count()}; tambahkan {$shortageChief} wasit IV DAN ke atas lagi.",
                ]);
            }

            // 3.1: Pembagian Court 1 & 2 dengan penyeimbangan kota (selisih antar court max 1)
            $courtPools = $this->distributeRefereesEquallyAcrossCourts($courts, $chiefCandidates, $assistantCandidates);

            $occurredAt = now();
            $batchId = (string) Str::uuid();

            // Simpan riwayat penghapusan penugasan lama
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

            // Bersihkan penugasan & check-in court hari ini untuk refresh
            EventCourtAssignment::query()
                ->whereIn('event_court_id', $courts->modelKeys())
                ->where('staff_type', 'referee')
                ->delete();

            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereIn('event_court_id', $courts->modelKeys())
                ->whereDate('attendance_date', now()->toDateString())
                ->delete();

            $totalAssigned = 0;

            // 3.2 & 3.3: Untuk setiap court, seleksi 5 wasit bertugas dengan saringan kota (max 2 per kota)
            foreach ($courts as $court) {
                /** @var Collection<int, Referee> $poolForCourt */
                $poolForCourt = $courtPools->get($court->id, collect());

                $panel = $this->selectMatchPanel($poolForCourt);

                $newAssignments = collect();

                // 1. Wasit Utama (IV DAN+)
                $newAssignments->push(EventCourtAssignment::query()->create([
                    'event_court_id' => $court->id,
                    'staff_type' => 'referee',
                    'staff_id' => $panel['chief']->id,
                    'role' => RefereeCourtRole::Chief->value,
                ]));

                // 2. Wasit Pembantu (4 posisi: Regional 1, Regional 2, Assistant 1, Assistant 2)
                $assistantRoles = [
                    RefereeCourtRole::RegionalOne,
                    RefereeCourtRole::RegionalTwo,
                    RefereeCourtRole::AssistantOne,
                    RefereeCourtRole::AssistantTwo,
                ];

                foreach ($panel['assistants'] as $index => $assistant) {
                    $roleEnum = $assistantRoles[$index] ?? RefereeCourtRole::AssistantTwo;
                    $newAssignments->push(EventCourtAssignment::query()->create([
                        'event_court_id' => $court->id,
                        'staff_type' => 'referee',
                        'staff_id' => $assistant->id,
                        'role' => $roleEnum->value,
                    ]));
                }

                // 3. Cadangan / Pool court ini yang tidak masuk 5 besar (untuk rotasi)
                foreach ($panel['reserves'] as $reserve) {
                    $newAssignments->push(EventCourtAssignment::query()->create([
                        'event_court_id' => $court->id,
                        'staff_type' => 'referee',
                        'staff_id' => $reserve->id,
                        'role' => 'reserve',
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

                $totalAssigned += $newAssignments->count();
            }

            return $totalAssigned;
        });
    }

    /**
     * Stage 2 & Rotasi: Koordinator Court merotasi susunan wasit untuk nomor pertandingan berikutnya
     * dari kelompok pool court tersebut (3.4).
     */
    public function rotateCourtPanel(EventCourt $court, ?string $changedByUserId): int
    {
        return DB::transaction(function () use ($court, $changedByUserId): int {
            EventCourt::query()->whereKey($court->id)->lockForUpdate()->firstOrFail();
            $event = $court->event()->lockForUpdate()->firstOrFail();

            // Ambil semua wasit yang sudah dialokasikan ke court ini (baik aktif maupun reserve)
            $courtAssignments = EventCourtAssignment::query()
                ->where('event_court_id', $court->id)
                ->where('staff_type', 'referee')
                ->lockForUpdate()
                ->get();

            if ($courtAssignments->count() < 5) {
                throw ValidationException::withMessages([
                    'rotate' => "Court {$court->name} belum memiliki minimal 5 wasit dalam kelompok court-nya. Jalankan Pembagian Court oleh Koordinator Pertandingan terlebih dahulu.",
                ]);
            }

            $courtRefereeIds = $courtAssignments->pluck('staff_id');
            $referees = Referee::query()
                ->whereIn('id', $courtRefereeIds)
                ->where('is_active', true)
                ->get();

            $currentChiefId = $courtAssignments->firstWhere('role', RefereeCourtRole::Chief->value)?->staff_id;
            $currentChief = $currentChiefId ? $referees->firstWhere('id', $currentChiefId) : null;
            $currentReserveIds = $courtAssignments->where('role', 'reserve')->pluck('staff_id')->toArray();

            // Pilih panel baru dengan rotasi: prioritaskan yang sedang di reserve
            $panel = $this->selectMatchPanel($referees, $currentChief, $currentReserveIds);

            $occurredAt = now();
            $batchId = (string) Str::uuid();

            // Simpan riwayat pencopotan panel lama
            $this->recordAssignmentHistory(
                event: $event,
                eventCourt: $court,
                assignments: $courtAssignments,
                action: RefereeCourtAssignmentHistory::ActionRemoved,
                changedByUserId: $changedByUserId,
                batchId: $batchId,
                occurredAt: $occurredAt,
            );

            // Bersihkan penugasan lama court ini
            EventCourtAssignment::query()
                ->where('event_court_id', $court->id)
                ->where('staff_type', 'referee')
                ->delete();

            // Hapus check-in court lama agar wasit yang baru ditugaskan melakukan scan ulang
            RefereeCourtAttendance::query()
                ->whereBelongsTo($event)
                ->whereBelongsTo($court, 'court')
                ->whereDate('attendance_date', now()->toDateString())
                ->delete();

            $newAssignments = collect();

            // 1. Wasit Utama baru
            $newAssignments->push(EventCourtAssignment::query()->create([
                'event_court_id' => $court->id,
                'staff_type' => 'referee',
                'staff_id' => $panel['chief']->id,
                'role' => RefereeCourtRole::Chief->value,
            ]));

            // 2. Wasit Pembantu baru
            $assistantRoles = [
                RefereeCourtRole::RegionalOne,
                RefereeCourtRole::RegionalTwo,
                RefereeCourtRole::AssistantOne,
                RefereeCourtRole::AssistantTwo,
            ];

            foreach ($panel['assistants'] as $index => $assistant) {
                $roleEnum = $assistantRoles[$index] ?? RefereeCourtRole::AssistantTwo;
                $newAssignments->push(EventCourtAssignment::query()->create([
                    'event_court_id' => $court->id,
                    'staff_type' => 'referee',
                    'staff_id' => $assistant->id,
                    'role' => $roleEnum->value,
                ]));
            }

            // 3. Cadangan baru
            foreach ($panel['reserves'] as $reserve) {
                $newAssignments->push(EventCourtAssignment::query()->create([
                    'event_court_id' => $court->id,
                    'staff_type' => 'referee',
                    'staff_id' => $reserve->id,
                    'role' => 'reserve',
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

            return $newAssignments->count();
        });
    }

    /**
     * Membagi wasit ke court dengan algoritma penyeimbangan kota:
     * Selisih per kota antar court maksimal 1 orang.
     *
     * @param  Collection<int, EventCourt>  $courts
     * @param  Collection<int, Referee>  $chiefs
     * @param  Collection<int, Referee>  $assistants
     * @return Collection<string, Collection<int, Referee>> Map court_id => Collection<Referee>
     */
    protected function distributeRefereesEquallyAcrossCourts(
        Collection $courts,
        Collection $chiefs,
        Collection $assistants,
    ): Collection {
        $courtPools = collect();
        $courtCityCounts = [];
        $courtTotalCounts = [];

        foreach ($courts as $court) {
            $courtPools->put($court->id, collect());
            $courtCityCounts[$court->id] = [];
            $courtTotalCounts[$court->id] = 0;
        }

        // Helper untuk memasukkan wasit ke court yang paling seimbang
        $assignRefereeToBestCourt = function (Referee $referee) use ($courts, &$courtPools, &$courtCityCounts, &$courtTotalCounts): void {
            $city = self::normalizeCity($referee->region);

            // Cari court dengan jumlah personil kota tersebut paling sedikit
            $bestCourtId = null;
            $minCityCount = PHP_INT_MAX;
            $minTotalCount = PHP_INT_MAX;

            foreach ($courts as $court) {
                $cityCount = $courtCityCounts[$court->id][$city] ?? 0;
                $totalCount = $courtTotalCounts[$court->id];

                if ($cityCount < $minCityCount || ($cityCount === $minCityCount && $totalCount < $minTotalCount)) {
                    $minCityCount = $cityCount;
                    $minTotalCount = $totalCount;
                    $bestCourtId = $court->id;
                }
            }

            $courtPools->get($bestCourtId)->push($referee);
            $courtCityCounts[$bestCourtId][$city] = ($courtCityCounts[$bestCourtId][$city] ?? 0) + 1;
            $courtTotalCounts[$bestCourtId]++;
        };

        // 1. Distribusikan Wasit Utama (IV DAN+) seimbang per kota
        $chiefsByCity = $chiefs->shuffle()->groupBy(fn (Referee $r): string => self::normalizeCity($r->region))
            ->sortByDesc(fn ($group) => $group->count());

        foreach ($chiefsByCity as $group) {
            foreach ($group as $referee) {
                $assignRefereeToBestCourt($referee);
            }
        }

        // 2. Distribusikan Wasit Pembantu (III DAN-) seimbang per kota
        $assistantsByCity = $assistants->shuffle()->groupBy(fn (Referee $r): string => self::normalizeCity($r->region))
            ->sortByDesc(fn ($group) => $group->count());

        foreach ($assistantsByCity as $group) {
            foreach ($group as $referee) {
                $assignRefereeToBestCourt($referee);
            }
        }

        return $courtPools;
    }

    /**
     * Memilih 5 personil penugasan partai/nomor pertandingan dari pool court:
     * - 1 Wasit Utama (IV DAN+)
     * - 4 Wasit Pembantu (III DAN- diprioritaskan)
     * - Saringan Kota (3.3): Maksimal 2 wasit dari kota yang sama dalam 1 nomor.
     *   Diambil masing-masing kota 1, bila masih kurang baru ditambah 1 (max 2).
     * - Rotasi (3.4): Memprioritaskan wasit yang di reserve / istirahat pada partai sebelumnya.
     *
     * @param  Collection<int, Referee>  $courtReferees
     * @param  list<string>  $prioritizeReserveIds
     * @return array{
     *     chief: Referee,
     *     assistants: Collection<int, Referee>,
     *     reserves: Collection<int, Referee>
     * }
     */
    public function selectMatchPanel(
        Collection $courtReferees,
        ?Referee $currentChief = null,
        array $prioritizeReserveIds = [],
    ): array {
        // 1. Pilih Wasit Utama (IV DAN+)
        $chiefCandidates = $courtReferees->filter(fn (Referee $r): bool => self::isChiefQualified($r));

        if ($chiefCandidates->isEmpty()) {
            // Fallback jika tidak ada IV DAN di pool
            $chiefCandidates = $courtReferees;
        }

        // Prioritas Wasit Utama: yang sedang di reserve dan bukan Chief sebelumnya
        $chosenChief = $chiefCandidates->first(function (Referee $r) use ($currentChief, $prioritizeReserveIds): bool {
            return in_array($r->id, $prioritizeReserveIds, true) && ($currentChief === null || $r->id !== $currentChief->id);
        })
            ?? $chiefCandidates->first(fn (Referee $r): bool => $currentChief === null || $r->id !== $currentChief->id)
            ?? $chiefCandidates->first();

        $selectedCities = [
            self::normalizeCity($chosenChief->region) => 1,
        ];

        // 2. Pool untuk Wasit Pembantu (semua wasit court selain Chief yang terpilih)
        $remainingPool = $courtReferees->where('id', '!=', $chosenChief->id);

        // Beri bobot / urutkan kandidat pembantu:
        // Prioritas 1: Sedang di reserve (istirahat)
        // Prioritas 2: III DAN (Wasit Pembantu resmi)
        $sortedCandidates = $remainingPool->sort(function (Referee $a, Referee $b) use ($prioritizeReserveIds): int {
            $aReserve = in_array($a->id, $prioritizeReserveIds, true) ? 1 : 0;
            $bReserve = in_array($b->id, $prioritizeReserveIds, true) ? 1 : 0;
            if ($aReserve !== $bReserve) {
                return $bReserve <=> $aReserve;
            }

            $aRegional = self::isRegionalQualified($a) ? 1 : 0;
            $bRegional = self::isRegionalQualified($b) ? 1 : 0;

            return $bRegional <=> $aRegional;
        })->values();

        $chosenAssistants = collect();

        // 3.3 Pass 1: Ambil masing-masing kota hanya 1 (diversity first)
        foreach ($sortedCandidates as $candidate) {
            if ($chosenAssistants->count() >= 4) {
                break;
            }

            $city = self::normalizeCity($candidate->region);
            $currentCityCount = $selectedCities[$city] ?? 0;

            if ($currentCityCount === 0) {
                $chosenAssistants->push($candidate);
                $selectedCities[$city] = 1;
            }
        }

        // 3.3 Pass 2: Bila masih kurang dari 4, tambahkan 1 diantara kota yang sudah ada (maksimal 2)
        if ($chosenAssistants->count() < 4) {
            foreach ($sortedCandidates as $candidate) {
                if ($chosenAssistants->count() >= 4) {
                    break;
                }

                if ($chosenAssistants->contains('id', $candidate->id)) {
                    continue;
                }

                $city = self::normalizeCity($candidate->region);
                $currentCityCount = $selectedCities[$city] ?? 0;

                if ($currentCityCount < 2) {
                    $chosenAssistants->push($candidate);
                    $selectedCities[$city] = $currentCityCount + 1;
                }
            }
        }

        // Pass 3 (Fallback darurat jika pool sangat kecil dan constraint kota tidak terpenuhi)
        if ($chosenAssistants->count() < 4) {
            foreach ($sortedCandidates as $candidate) {
                if ($chosenAssistants->count() >= 4) {
                    break;
                }
                if (! $chosenAssistants->contains('id', $candidate->id)) {
                    $chosenAssistants->push($candidate);
                }
            }
        }

        $activeIds = $chosenAssistants->pluck('id')->push($chosenChief->id);
        $reserves = $courtReferees->whereNotIn('id', $activeIds)->values();

        return [
            'chief' => $chosenChief,
            'assistants' => $chosenAssistants,
            'reserves' => $reserves,
        ];
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

    public static function normalizeCity(?string $region): string
    {
        $cleaned = trim((string) $region);
        if ($cleaned === '') {
            return 'LAINNYA';
        }

        return mb_strtoupper($cleaned);
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
