<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\Rundown;
use App\Models\TournamentMatch;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TournamentScheduleUpdater
{
    /**
     * @param  array{event_court_id: string, rundown_id: string, start_time: string, swap_with_match_id?: string|null}  $schedule
     */
    public function update(Event $event, TournamentMatch $match, array $schedule): void
    {
        if ($match->is_bye) {
            throw ValidationException::withMessages([
                'schedule' => 'Partai BYE lolos otomatis dan tidak dapat dijadwalkan.',
            ]);
        }

        if ($match->status === 'completed') {
            throw ValidationException::withMessages([
                'schedule' => 'Partai yang sudah selesai dipertandingkan tidak dapat diubah jadwalnya demi integritas rekam hasil.',
            ]);
        }

        $court = $event->courts()
            ->where('is_active', true)
            ->find($schedule['event_court_id']);
        $session = $event->rundowns()
            ->where('is_match_session', true)
            ->find($schedule['rundown_id']);

        if ($court === null || $session === null) {
            throw ValidationException::withMessages([
                'schedule' => 'Court atau sesi pertandingan tidak tersedia pada event ini.',
            ]);
        }

        $duration = max(1, (int) $event->match_duration_minutes);
        $start = CarbonImmutable::instance($session->date)
            ->setTimeFromTimeString($schedule['start_time']);
        $end = $start->addMinutes($duration);
        $sessionStart = CarbonImmutable::instance($session->date);
        $sessionEnd = $session->end_time
            ? CarbonImmutable::instance($session->end_time)
            : $sessionStart->addHours(4);

        if ($start->lessThan($sessionStart) || $end->greaterThan($sessionEnd)) {
            throw ValidationException::withMessages([
                'start_time' => 'Jam pertandingan harus berada di dalam rentang sesi yang dipilih.',
            ]);
        }

        if (((int) $sessionStart->diffInMinutes($start)) % $duration !== 0) {
            throw ValidationException::withMessages([
                'start_time' => "Jam pertandingan harus mengikuti kelipatan slot {$duration} menit dari awal sesi.",
            ]);
        }

        DB::transaction(function () use ($court, $event, $match, $schedule, $session, $start): void {
            $eventMatches = $event->tournamentMatches()
                ->where('is_bye', false)
                ->with(['drawing:id,status', 'matchCategory:id,type'])
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $currentMatch = $eventMatches->firstWhere('id', $match->id);

            if (! $currentMatch instanceof TournamentMatch) {
                throw ValidationException::withMessages([
                    'schedule' => 'Partai yang dipindahkan tidak tersedia pada event ini.',
                ]);
            }

            $swapTarget = $this->resolveSwapTarget(
                $eventMatches,
                $currentMatch,
                $schedule['swap_with_match_id'] ?? null,
                $court->id,
                $session->id,
                $start,
            );
            $movedSchedules = $this->movedMatchSchedules(
                $currentMatch,
                $court->id,
                $session->id,
                $start,
                $swapTarget,
            );
            $proposedSchedules = $this->proposedEventSchedules(
                $eventMatches,
                $movedSchedules,
            );

            $this->ensureMovedSchedulesFitSessions($event, $movedSchedules);
            $this->ensureScheduleIntegrity($proposedSchedules, (int) $event->minimum_rest_minutes);
            $this->persistSchedule($eventMatches, $movedSchedules);
        }, attempts: 3);
    }

    /**
     * Move all active matches of a category to another court and automatically adjust their schedule.
     *
     * @param  array{event_court_id: string, target_rundown_id?: string|null, target_start_time?: string|null, placement_mode?: string|null}  $payload
     * @return int Number of matches moved and scheduled
     */
    public function moveCategory(Event $event, EventMatchCategory $category, array $payload): int
    {
        if ($category->event_id !== $event->id) {
            throw ValidationException::withMessages([
                'category' => 'Nomor pertandingan tidak terdaftar pada event ini.',
            ]);
        }

        $targetCourt = $event->courts()
            ->where('is_active', true)
            ->find($payload['event_court_id']);

        if (! $targetCourt instanceof EventCourt) {
            throw ValidationException::withMessages([
                'event_court_id' => 'Court tujuan tidak tersedia atau tidak aktif pada event ini.',
            ]);
        }

        return DB::transaction(function () use ($category, $event, $payload, $targetCourt): int {
            $eventMatches = $event->tournamentMatches()
                ->where('is_bye', false)
                ->with(['drawing:id,status', 'matchCategory:id,name,type,order'])
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $categoryMatches = $eventMatches
                ->where('event_match_category_id', $category->id)
                ->sortBy('match_sequence')
                ->values();

            if ($categoryMatches->isEmpty()) {
                throw ValidationException::withMessages([
                    'category' => 'Tidak ada partai yang dapat dijadwalkan pada nomor pertandingan ini.',
                ]);
            }

            $matchesToMove = $categoryMatches->where('status', '!=', 'completed')->values();

            if ($matchesToMove->isEmpty()) {
                throw ValidationException::withMessages([
                    'category' => 'Seluruh partai pada nomor pertandingan ini sudah selesai dipertandingkan.',
                ]);
            }

            $sessions = $event->rundowns()
                ->where('is_match_session', true)
                ->orderBy('date')
                ->orderBy('order')
                ->orderBy('id')
                ->get();

            if ($sessions->isEmpty()) {
                throw ValidationException::withMessages([
                    'schedule' => 'Belum ada sesi pertandingan (rundown) yang aktif pada event ini.',
                ]);
            }

            $duration = max(1, (int) $event->match_duration_minutes);
            $minimumRest = max(0, (int) $event->minimum_rest_minutes);

            $allCourtSlots = $this->buildCourtSlots($sessions, $targetCourt->id, $duration);

            if ($allCourtSlots->isEmpty()) {
                throw ValidationException::withMessages([
                    'schedule' => 'Tidak ada slot waktu pertandingan yang tersedia pada sesi yang ada.',
                ]);
            }

            $matchesBeingMovedIds = $matchesToMove->pluck('id')->all();
            $otherMatchesOnTargetCourt = $eventMatches
                ->where('event_court_id', $targetCourt->id)
                ->reject(fn (TournamentMatch $m): bool => in_array($m->id, $matchesBeingMovedIds, true))
                ->filter(fn (TournamentMatch $m): bool => $m->scheduled_start_at !== null && $m->scheduled_end_at !== null)
                ->values();

            $targetRundownId = $payload['target_rundown_id'] ?? null;
            $targetStartTime = $payload['target_start_time'] ?? null;
            $placementMode = $payload['placement_mode'] ?? 'auto';

            $assignedSlots = $this->allocateCategorySlots(
                $event,
                $matchesToMove,
                $allCourtSlots,
                $otherMatchesOnTargetCourt,
                $eventMatches,
                $targetRundownId,
                $targetStartTime,
                $placementMode,
                $minimumRest,
            );

            if ($assignedSlots === null || $assignedSlots->count() !== $matchesToMove->count()) {
                throw ValidationException::withMessages([
                    'schedule' => 'Tidak tersedia slot waktu yang cukup pada court tujuan tanpa bentrok jadwal atau jeda istirahat atlet.',
                ]);
            }

            $movedSchedules = $matchesToMove->map(function (TournamentMatch $match, int $index) use ($assignedSlots): array {
                $slot = $assignedSlots->get($index);

                return [
                    'id' => $match->id,
                    'court_id' => $slot['court_id'],
                    'rundown_id' => $slot['rundown_id'],
                    'start' => $slot['start'],
                    'end' => $slot['end'],
                ];
            });

            $proposedSchedules = $this->proposedEventSchedules($eventMatches, $movedSchedules);

            $this->ensureMovedSchedulesFitSessions($event, $movedSchedules);
            $this->ensureScheduleIntegrity($proposedSchedules, $minimumRest);
            $this->persistSchedule($eventMatches, $movedSchedules);

            return $matchesToMove->count();
        }, attempts: 3);
    }

    /** @param EloquentCollection<int, TournamentMatch> $eventMatches */
    private function resolveSwapTarget(
        EloquentCollection $eventMatches,
        TournamentMatch $match,
        ?string $swapTargetId,
        string $destinationCourtId,
        string $destinationSessionId,
        CarbonImmutable $destinationStart,
    ): ?TournamentMatch {
        if ($swapTargetId === null || $swapTargetId === '') {
            return null;
        }

        if ($swapTargetId === $match->id) {
            throw ValidationException::withMessages([
                'schedule' => 'Pilih partai lain sebagai tujuan pertukaran.',
            ]);
        }

        $swapTarget = $eventMatches->firstWhere('id', $swapTargetId);

        if (! $swapTarget instanceof TournamentMatch
            || $swapTarget->scheduled_start_at === null
            || $swapTarget->scheduled_end_at === null
            || $swapTarget->event_court_id === null
            || $swapTarget->rundown_id === null) {
            throw ValidationException::withMessages([
                'schedule' => 'Partai tujuan pertukaran tidak tersedia pada jadwal event ini.',
            ]);
        }

        if ($swapTarget->status === 'completed') {
            throw ValidationException::withMessages([
                'schedule' => 'Partai tujuan pertukaran sudah selesai dipertandingkan dan tidak dapat ditukar.',
            ]);
        }

        $targetStart = CarbonImmutable::instance($swapTarget->scheduled_start_at);
        $targetHasMoved = $swapTarget->event_court_id !== $destinationCourtId
            || $swapTarget->rundown_id !== $destinationSessionId
            || ! $targetStart->equalTo($destinationStart);

        if ($targetHasMoved) {
            throw ValidationException::withMessages([
                'schedule' => 'Jadwal tujuan sudah berubah. Muat ulang halaman lalu coba pertukaran kembali.',
            ]);
        }

        if ($match->scheduled_start_at === null
            || $match->scheduled_end_at === null
            || $match->event_court_id === null
            || $match->rundown_id === null) {
            throw ValidationException::withMessages([
                'schedule' => 'Partai asal belum memiliki slot yang dapat ditukar.',
            ]);
        }

        return $swapTarget;
    }

    /**
     * Move only the selected match. When the destination is occupied, only
     * the source and destination matches swap their schedule slots.
     *
     * @return Collection<int, array{id: string, court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function movedMatchSchedules(
        TournamentMatch $match,
        string $destinationCourtId,
        string $destinationSessionId,
        CarbonImmutable $destinationStart,
        ?TournamentMatch $swapTarget,
    ): Collection {
        if ($match->scheduled_start_at === null
            || $match->scheduled_end_at === null
            || $match->event_court_id === null
            || $match->rundown_id === null) {
            if ($swapTarget !== null) {
                throw ValidationException::withMessages([
                    'schedule' => 'Partai belum terjadwal hanya dapat ditempatkan pada slot kosong, bukan menukar partai terjadwal.',
                ]);
            }

            $duration = max(1, (int) ($match->event?->match_duration_minutes ?: 10));
            $destinationEnd = $destinationStart->addMinutes($duration);

            return collect([[
                'id' => $match->id,
                'court_id' => $destinationCourtId,
                'rundown_id' => $destinationSessionId,
                'start' => $destinationStart,
                'end' => $destinationEnd,
            ]]);
        }

        $sourceStart = CarbonImmutable::instance($match->scheduled_start_at);
        $sourceSchedule = $this->shiftedSchedule(
            $match,
            $destinationCourtId,
            $destinationSessionId,
            $destinationStart->getTimestamp() - $sourceStart->getTimestamp(),
        );

        if ($swapTarget === null) {
            return collect([$sourceSchedule]);
        }

        $targetStart = CarbonImmutable::instance($swapTarget->scheduled_start_at);
        $targetSchedule = $this->shiftedSchedule(
            $swapTarget,
            $match->event_court_id,
            $match->rundown_id,
            $sourceStart->getTimestamp() - $targetStart->getTimestamp(),
        );

        return collect([$sourceSchedule, $targetSchedule]);
    }

    /**
     * @param  Collection<int, array{id: string, court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>  $movedSchedules
     */
    private function ensureMovedSchedulesFitSessions(Event $event, Collection $movedSchedules): void
    {
        $sessions = $event->rundowns()
            ->where('is_match_session', true)
            ->whereIn('id', $movedSchedules->pluck('rundown_id')->unique()->all())
            ->get()
            ->keyBy('id');

        $outsideSession = $movedSchedules->contains(function (array $schedule) use ($sessions): bool {
            $session = $sessions->get($schedule['rundown_id']);

            if ($session === null) {
                return true;
            }

            $sessionStart = CarbonImmutable::instance($session->date);
            $sessionEnd = $session->end_time
                ? CarbonImmutable::instance($session->end_time)
                : $sessionStart->addHours(4);

            return $schedule['start']->lessThan($sessionStart)
                || $schedule['end']->greaterThan($sessionEnd);
        });

        if ($outsideSession) {
            throw ValidationException::withMessages([
                'schedule' => 'Partai yang dipindahkan harus muat di dalam sesi tujuan.',
            ]);
        }
    }

    /**
     * @return array{id: string, court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}
     */
    private function shiftedSchedule(
        TournamentMatch $match,
        string $courtId,
        string $sessionId,
        int $seconds,
    ): array {
        return [
            'id' => $match->id,
            'court_id' => $courtId,
            'rundown_id' => $sessionId,
            'start' => CarbonImmutable::instance($match->scheduled_start_at)->addSeconds($seconds),
            'end' => CarbonImmutable::instance($match->scheduled_end_at)->addSeconds($seconds),
        ];
    }

    /**
     * @param  EloquentCollection<int, TournamentMatch>  $eventMatches
     * @param  Collection<int, array{id: string, court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>  $movedSchedules
     * @return Collection<int, array{id: string, category_id: string, category_type: string|null, sequence: int, court_id: string, rundown_id: string|null, start: CarbonImmutable, end: CarbonImmutable, athlete_ids: Collection<int, string>}>
     */
    private function proposedEventSchedules(
        EloquentCollection $eventMatches,
        Collection $movedSchedules,
    ): Collection {
        $movedSchedulesById = $movedSchedules->keyBy('id');

        return $eventMatches
            ->filter(fn (TournamentMatch $eventMatch): bool => ($eventMatch->scheduled_start_at !== null
                && $eventMatch->scheduled_end_at !== null
                && $eventMatch->event_court_id !== null)
                || $movedSchedulesById->has($eventMatch->id))
            ->map(function (TournamentMatch $eventMatch) use ($movedSchedulesById): array {
                $movedSchedule = $movedSchedulesById->get($eventMatch->id);

                return [
                    'id' => $eventMatch->id,
                    'category_id' => $eventMatch->event_match_category_id,
                    'category_type' => $eventMatch->matchCategory?->type,
                    'phase' => $eventMatch->phase,
                    'next_match_id' => $eventMatch->next_match_id,
                    'sequence' => (int) $eventMatch->match_sequence,
                    'court_id' => $movedSchedule['court_id'] ?? $eventMatch->event_court_id,
                    'rundown_id' => $movedSchedule['rundown_id'] ?? $eventMatch->rundown_id,
                    'start' => $movedSchedule['start'] ?? CarbonImmutable::instance($eventMatch->scheduled_start_at),
                    'end' => $movedSchedule['end'] ?? CarbonImmutable::instance($eventMatch->scheduled_end_at),
                    'athlete_ids' => $this->athleteIds($eventMatch),
                ];
            })
            ->values();
    }

    /**
     * @param  Collection<int, array{id: string, category_id: string, category_type: string|null, sequence: int, court_id: string, rundown_id: string|null, start: CarbonImmutable, end: CarbonImmutable, athlete_ids: Collection<int, string>}>  $schedules
     */
    private function ensureScheduleIntegrity(Collection $schedules, int $minimumRestMinutes): void
    {
        $this->ensureCategorySequence($schedules);
        $this->ensureCourtIsAvailable($schedules);
        $this->ensureAthleteRest($schedules, max(0, $minimumRestMinutes));
        $this->ensureEmbuBeforeRandori($schedules);
    }

    /**
     * Ensure bracket progression integrity:
     * - A match must finish before its subsequent match (next_match_id) begins.
     * - Preliminary matches must finish before final matches in the same category.
     *
     * Matches in the same round or without prerequisite dependencies can be freely scheduled
     * in any order, moved to any empty slot, or swapped.
     *
     * @param  Collection<int, array{id: string, category_id: string, sequence: int, phase: string|null, next_match_id: string|null, start: CarbonImmutable, end: CarbonImmutable}>  $schedules
     */
    private function ensureCategorySequence(Collection $schedules): void
    {
        $schedulesById = $schedules->keyBy('id');

        // 1. Check next_match_id dependencies (pemenang babak sebelumnya)
        foreach ($schedules as $schedule) {
            $nextMatchId = $schedule['next_match_id'] ?? null;
            if ($nextMatchId && $nextSchedule = $schedulesById->get($nextMatchId)) {
                if ($schedule['end']->greaterThan($nextSchedule['start'])) {
                    throw ValidationException::withMessages([
                        'schedule' => "Partai babak sebelumnya (#{$schedule['sequence']}) harus selesai sebelum partai babak berikutnya (#{$nextSchedule['sequence']}) dimulai.",
                    ]);
                }
            }
        }

        // 2. Check preliminary vs final phase in the same category
        foreach ($schedules->groupBy('category_id') as $categorySchedules) {
            $preliminaryMatches = $categorySchedules->where('phase', 'preliminary');
            $finalMatches = $categorySchedules->where('phase', 'final');

            if ($preliminaryMatches->isNotEmpty() && $finalMatches->isNotEmpty()) {
                $lastPrelimEnd = $preliminaryMatches->max('end');
                $firstFinalStart = $finalMatches->min('start');

                if ($lastPrelimEnd && $firstFinalStart && $lastPrelimEnd->greaterThan($firstFinalStart)) {
                    throw ValidationException::withMessages([
                        'schedule' => 'Partai babak penyisihan harus selesai sebelum babak final pada nomor pertandingan yang sama.',
                    ]);
                }
            }
        }
    }

    /** @param Collection<int, array{court_id: string, start: CarbonImmutable, end: CarbonImmutable}> $schedules */
    private function ensureCourtIsAvailable(Collection $schedules): void
    {
        foreach ($schedules->groupBy('court_id') as $courtSchedules) {
            $ordered = $courtSchedules
                ->sortBy(fn (array $schedule): int => $schedule['start']->getTimestamp())
                ->values();

            foreach ($ordered->sliding(2) as $pair) {
                if ($pair->last()['start']->lessThan($pair->first()['end'])) {
                    throw ValidationException::withMessages([
                        'schedule' => 'Jadwal bentrok dengan partai lain pada court yang dipilih.',
                    ]);
                }
            }
        }
    }

    /** @param Collection<int, array{category_id: string, start: CarbonImmutable, end: CarbonImmutable, athlete_ids: Collection<int, string>}> $schedules */
    private function ensureAthleteRest(Collection $schedules, int $minimumRestMinutes): void
    {
        $athleteSchedules = $schedules->flatMap(fn (array $schedule): Collection => $schedule['athlete_ids']
            ->map(fn (string $athleteId): array => [
                'athlete_id' => $athleteId,
                'category_id' => $schedule['category_id'],
                'start' => $schedule['start'],
                'end' => $schedule['end'],
            ]));

        foreach ($athleteSchedules->groupBy('athlete_id') as $matches) {
            $ordered = $matches
                ->sortBy(fn (array $schedule): int => $schedule['start']->getTimestamp())
                ->values();

            foreach ($ordered->sliding(2) as $pair) {
                if ($pair->last()['category_id'] !== $pair->first()['category_id']
                    && $pair->last()['start']->lessThan($pair->first()['end']->addMinutes($minimumRestMinutes))) {
                    throw ValidationException::withMessages([
                        'schedule' => "Atlet memerlukan jeda minimal {$minimumRestMinutes} menit dari partai lainnya.",
                    ]);
                }
            }
        }
    }

    /** @param Collection<int, array{category_type: string|null, start: CarbonImmutable, end: CarbonImmutable}> $schedules */
    private function ensureEmbuBeforeRandori(Collection $schedules): void
    {
        $embuSchedules = $schedules->where('category_type', 'embu');
        $randoriSchedules = $schedules->where('category_type', 'randori');

        if ($embuSchedules->isEmpty() || $randoriSchedules->isEmpty()) {
            return;
        }

        $lastEmbuEnd = $embuSchedules
            ->sortBy(fn (array $schedule): int => $schedule['end']->getTimestamp())
            ->last()['end'];
        $firstRandoriStart = $randoriSchedules
            ->sortBy(fn (array $schedule): int => $schedule['start']->getTimestamp())
            ->first()['start'];

        if ($lastEmbuEnd->greaterThan($firstRandoriStart)) {
            throw ValidationException::withMessages([
                'schedule' => 'Seluruh pertandingan Embu harus selesai sebelum Randori dimulai.',
            ]);
        }
    }

    /**
     * @param  EloquentCollection<int, TournamentMatch>  $eventMatches
     * @param  Collection<int, array{id: string, court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>  $movedSchedules
     */
    private function persistSchedule(
        EloquentCollection $eventMatches,
        Collection $movedSchedules,
    ): void {
        foreach ($movedSchedules as $schedule) {
            $scheduledMatch = $eventMatches->firstWhere('id', $schedule['id']);

            if ($scheduledMatch instanceof TournamentMatch) {
                $scheduledMatch->update([
                    'event_court_id' => $schedule['court_id'],
                    'rundown_id' => $schedule['rundown_id'],
                    'scheduled_start_at' => $schedule['start'],
                    'scheduled_end_at' => $schedule['end'],
                ]);
            }
        }
    }

    /**
     * @param  EloquentCollection<int, Rundown>  $sessions
     * @return Collection<int, array{court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>
     */
    private function buildCourtSlots(Collection $sessions, string $courtId, int $duration): Collection
    {
        $slots = collect();

        foreach ($sessions as $session) {
            $start = CarbonImmutable::instance($session->date);
            $end = $session->end_time
                ? CarbonImmutable::instance($session->end_time)
                : $start->addHours(4);

            for ($cursor = $start; $cursor->addMinutes($duration)->lessThanOrEqualTo($end); $cursor = $cursor->addMinutes($duration)) {
                $slots->push([
                    'court_id' => $courtId,
                    'rundown_id' => $session->id,
                    'start' => $cursor,
                    'end' => $cursor->addMinutes($duration),
                ]);
            }
        }

        return $slots;
    }

    /**
     * @param  Collection<int, TournamentMatch>  $matchesToMove
     * @param  Collection<int, array{court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>  $allCourtSlots
     * @param  Collection<int, TournamentMatch>  $otherMatchesOnTargetCourt
     * @param  EloquentCollection<int, TournamentMatch>  $eventMatches
     * @return Collection<int, array{court_id: string, rundown_id: string, start: CarbonImmutable, end: CarbonImmutable}>|null
     */
    private function allocateCategorySlots(
        Event $event,
        Collection $matchesToMove,
        Collection $allCourtSlots,
        Collection $otherMatchesOnTargetCourt,
        EloquentCollection $eventMatches,
        ?string $targetRundownId,
        ?string $targetStartTime,
        string $placementMode,
        int $minimumRestMinutes,
    ): ?Collection {
        $requiredCount = $matchesToMove->count();
        $totalSlots = $allCourtSlots->count();

        if ($totalSlots < $requiredCount) {
            return null;
        }

        $startingIndex = 0;

        if ($targetRundownId !== null && $targetStartTime !== null) {
            $foundIndex = $allCourtSlots->search(fn (array $slot): bool => $slot['rundown_id'] === $targetRundownId
                && $slot['start']->format('H:i') === $targetStartTime);

            if ($foundIndex !== false) {
                $startingIndex = (int) $foundIndex;
            }
        } elseif ($placementMode === 'append') {
            $latestEnd = $otherMatchesOnTargetCourt
                ->map(fn (TournamentMatch $m): CarbonImmutable => CarbonImmutable::instance($m->scheduled_end_at))
                ->sortByDesc(fn (CarbonImmutable $c): int => $c->getTimestamp())
                ->first();

            if ($latestEnd instanceof CarbonImmutable) {
                $foundIndex = $allCourtSlots->search(fn (array $slot): bool => $slot['start']->greaterThanOrEqualTo($latestEnd));

                if ($foundIndex !== false) {
                    $startingIndex = (int) $foundIndex;
                }
            }
        }

        $matchesBeingMovedIds = $matchesToMove->pluck('id')->all();
        $otherScheduledEventMatches = $eventMatches
            ->reject(fn (TournamentMatch $m): bool => in_array($m->id, $matchesBeingMovedIds, true))
            ->filter(fn (TournamentMatch $m): bool => $m->scheduled_start_at !== null && $m->scheduled_end_at !== null)
            ->values();

        $categoryType = $matchesToMove->first()?->matchCategory?->type;

        $otherEmbuMatches = $otherScheduledEventMatches->filter(fn (TournamentMatch $m): bool => $m->matchCategory?->type === 'embu');
        $otherRandoriMatches = $otherScheduledEventMatches->filter(fn (TournamentMatch $m): bool => $m->matchCategory?->type === 'randori');

        $latestOtherEmbuEnd = $otherEmbuMatches
            ->map(fn (TournamentMatch $m): CarbonImmutable => CarbonImmutable::instance($m->scheduled_end_at))
            ->sortByDesc(fn (CarbonImmutable $c): int => $c->getTimestamp())
            ->first();

        $earliestOtherRandoriStart = $otherRandoriMatches
            ->map(fn (TournamentMatch $m): CarbonImmutable => CarbonImmutable::instance($m->scheduled_start_at))
            ->sortBy(fn (CarbonImmutable $c): int => $c->getTimestamp())
            ->first();

        $athleteBusyIntervals = collect();
        foreach ($otherScheduledEventMatches as $otherMatch) {
            $otherAthleteIds = $this->athleteIds($otherMatch);
            if ($otherAthleteIds->isEmpty()) {
                continue;
            }

            $oStart = CarbonImmutable::instance($otherMatch->scheduled_start_at);
            $oEnd = CarbonImmutable::instance($otherMatch->scheduled_end_at);

            foreach ($otherAthleteIds as $athleteId) {
                if (! isset($athleteBusyIntervals[$athleteId])) {
                    $athleteBusyIntervals[$athleteId] = collect();
                }
                $athleteBusyIntervals[$athleteId]->push([
                    'category_id' => $otherMatch->event_match_category_id,
                    'start' => $oStart,
                    'end' => $oEnd,
                ]);
            }
        }

        $occupiedIntervals = $otherMatchesOnTargetCourt->map(fn (TournamentMatch $m): array => [
            'start' => CarbonImmutable::instance($m->scheduled_start_at),
            'end' => CarbonImmutable::instance($m->scheduled_end_at),
        ]);

        for ($i = $startingIndex; $i <= $totalSlots - $requiredCount; $i++) {
            $candidateBlock = $allCourtSlots->slice($i, $requiredCount)->values();

            $isConsecutive = $candidateBlock->sliding(2)->every(
                fn (Collection $pair): bool => $pair->last()['start']->greaterThanOrEqualTo($pair->first()['end']),
            );

            if (! $isConsecutive) {
                continue;
            }

            $hasCourtOverlap = $candidateBlock->contains(function (array $slot) use ($occupiedIntervals): bool {
                return $occupiedIntervals->contains(function (array $occ) use ($slot): bool {
                    return $slot['start']->lessThan($occ['end']) && $slot['end']->greaterThan($occ['start']);
                });
            });

            if ($hasCourtOverlap) {
                continue;
            }

            if ($categoryType === 'embu' && $earliestOtherRandoriStart instanceof CarbonImmutable) {
                if ($candidateBlock->last()['end']->greaterThan($earliestOtherRandoriStart)) {
                    continue;
                }
            } elseif ($categoryType === 'randori' && $latestOtherEmbuEnd instanceof CarbonImmutable) {
                if ($candidateBlock->first()['start']->lessThan($latestOtherEmbuEnd)) {
                    continue;
                }
            }

            $hasAthleteRestViolation = false;
            foreach ($matchesToMove as $matchIndex => $match) {
                $slot = $candidateBlock->get($matchIndex);
                $matchAthletes = $this->athleteIds($match);

                foreach ($matchAthletes as $athleteId) {
                    $intervals = $athleteBusyIntervals->get($athleteId);
                    if ($intervals === null) {
                        continue;
                    }

                    foreach ($intervals as $interval) {
                        $slotStart = $slot['start'];
                        $slotEnd = $slot['end'];
                        $intStart = $interval['start'];
                        $intEnd = $interval['end'];

                        if ($slotStart->lessThan($intEnd->addMinutes($minimumRestMinutes))
                            && $intStart->lessThan($slotEnd->addMinutes($minimumRestMinutes))) {
                            $hasAthleteRestViolation = true;
                            break 3;
                        }
                    }
                }
            }

            if ($hasAthleteRestViolation) {
                continue;
            }

            return $candidateBlock;
        }

        return null;
    }

    /** @return Collection<int, string> */
    private function athleteIds(TournamentMatch $match): Collection
    {
        return collect($match->metadata['athlete_ids'] ?? [])
            ->filter(fn (mixed $athleteId): bool => is_string($athleteId) && $athleteId !== '')
            ->unique()
            ->values();
    }
}
