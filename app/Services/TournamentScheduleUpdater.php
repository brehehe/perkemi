<?php

namespace App\Services;

use App\Models\Event;
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

        if ($swapTarget->drawing?->status !== 'generated') {
            throw ValidationException::withMessages([
                'schedule' => 'Partai tujuan masih terkunci. Kembalikan publikasi ke tahap penyusunan terlebih dahulu.',
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
            ->filter(fn (TournamentMatch $eventMatch): bool => $eventMatch->scheduled_start_at !== null
                && $eventMatch->scheduled_end_at !== null
                && $eventMatch->event_court_id !== null)
            ->map(function (TournamentMatch $eventMatch) use ($movedSchedulesById): array {
                $movedSchedule = $movedSchedulesById->get($eventMatch->id);

                return [
                    'id' => $eventMatch->id,
                    'category_id' => $eventMatch->event_match_category_id,
                    'category_type' => $eventMatch->matchCategory?->type,
                    'sequence' => (int) $eventMatch->match_sequence,
                    'court_id' => $movedSchedule['court_id'] ?? $eventMatch->event_court_id,
                    'rundown_id' => $movedSchedule['rundown_id'] ?? $eventMatch->rundown_id,
                    'start' => $movedSchedule['start'] ?? CarbonImmutable::instance($eventMatch->scheduled_start_at),
                    'end' => $movedSchedule['end'] ?? CarbonImmutable::instance($eventMatch->scheduled_end_at),
                    'athlete_ids' => collect($eventMatch->metadata['athlete_ids'] ?? [])
                        ->filter(fn (mixed $athleteId): bool => is_string($athleteId) && $athleteId !== '')
                        ->unique()
                        ->values(),
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

    /** @param Collection<int, array{category_id: string, sequence: int, start: CarbonImmutable, end: CarbonImmutable}> $schedules */
    private function ensureCategorySequence(Collection $schedules): void
    {
        foreach ($schedules->groupBy('category_id') as $categorySchedules) {
            $ordered = $categorySchedules->sortBy('sequence')->values();

            foreach ($ordered->sliding(2) as $pair) {
                if ($pair->last()['start']->lessThan($pair->first()['end'])) {
                    throw ValidationException::withMessages([
                        'schedule' => 'Urutan waktu harus tetap mengikuti urutan partai pada nomor pertandingan.',
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
}
