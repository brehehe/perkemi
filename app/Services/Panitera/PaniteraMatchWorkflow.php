<?php

namespace App\Services\Panitera;

use App\Events\PaniteraMatchStateUpdated;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\TournamentMatch;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaniteraMatchWorkflow
{
    public function __construct(
        private readonly EmbuScoreCalculator $embuScoreCalculator,
        private readonly PaniteraTimerState $timerState,
    ) {}

    public const ActionCallOfficials = 'call_officials';

    public const ActionCallParticipants = 'call_participants';

    public const ActionStart = 'start';

    public const ActionPause = 'pause';

    public const ActionFinish = 'finish';

    public const ActionResetTimer = 'reset_timer';

    public const ActionConfigureTimer = 'configure_timer';

    /** @var list<string> */
    public const Actions = [
        self::ActionCallOfficials,
        self::ActionCallParticipants,
        self::ActionStart,
        self::ActionPause,
        self::ActionFinish,
        self::ActionResetTimer,
        self::ActionConfigureTimer,
    ];

    /** @param array{expected_timer_version?: int|null, timer_direction?: string, timer_duration_seconds?: int} $options */
    public function update(
        Event $event,
        TournamentMatch $match,
        string $action,
        string $operatorId,
        array $options = [],
    ): TournamentMatch {
        abort_unless($match->event_id === $event->id, 404);

        if (! $match->event_court_id) {
            throw ValidationException::withMessages([
                'match' => 'Partai belum memiliki court. Atur jadwal dan court sebelum melakukan pemanggilan.',
            ]);
        }

        return DB::transaction(function () use ($event, $match, $action, $operatorId, $options): TournamentMatch {
            $courtMatches = TournamentMatch::query()
                ->whereBelongsTo($event)
                ->where('event_court_id', $match->event_court_id)
                ->lockForUpdate()
                ->get();

            /** @var TournamentMatch $lockedMatch */
            $lockedMatch = $courtMatches->firstWhere('id', $match->id);
            abort_unless($lockedMatch instanceof TournamentMatch, 404);
            $lockedMatch->loadMissing('matchCategory:id,name,type');

            if (isset($options['expected_timer_version'])
                && (int) $lockedMatch->timer_version !== $options['expected_timer_version']) {
                throw ValidationException::withMessages([
                    'timer' => 'Status timer sudah berubah di perangkat lain. Data terbaru sudah dimuat; silakan ulangi perintah jika masih diperlukan.',
                ]);
            }

            if ($lockedMatch->status === 'completed') {
                throw ValidationException::withMessages([
                    'match' => 'Partai yang sudah selesai tidak dapat dipanggil atau dijalankan kembali.',
                ]);
            }

            if (data_get($lockedMatch->metadata, 'panitera.finished_at')) {
                throw ValidationException::withMessages([
                    'match' => 'Pertandingan sudah diselesaikan dan sedang menunggu verifikasi hasil.',
                ]);
            }

            if ($lockedMatch->is_bye) {
                throw ValidationException::withMessages([
                    'match' => 'Partai BYE tidak memerlukan pemanggilan Panitera.',
                ]);
            }

            if ($lockedMatch->metadata['placeholder'] ?? false) {
                throw ValidationException::withMessages([
                    'match' => 'Peserta partai belum lengkap. Tunggu hasil babak sebelumnya.',
                ]);
            }

            if (in_array($action, [self::ActionCallOfficials, self::ActionCallParticipants, self::ActionStart], true)) {
                $this->releaseOtherMatches($courtMatches, $lockedMatch);
            }

            $this->applyAction($lockedMatch, $action, $operatorId, $options);
            $updatedMatch = $lockedMatch->fresh(['matchCategory', 'court', 'embuScores', 'randoriScore']);
            abort_unless($updatedMatch instanceof TournamentMatch, 404);

            $this->broadcastMatchState($updatedMatch, $action);

            return $updatedMatch;
        });
    }

    /** @param Collection<int, TournamentMatch> $courtMatches */
    private function releaseOtherMatches($courtMatches, TournamentMatch $currentMatch): void
    {
        $courtMatches
            ->where('id', '!=', $currentMatch->id)
            ->filter(fn (TournamentMatch $match): bool => in_array($match->status, ['ready', 'in_progress'], true))
            ->each(function (TournamentMatch $match): void {
                $match->update([
                    'status' => 'pending',
                    'call_status' => 'waiting',
                    'called_at' => null,
                    'timer_status' => 'stopped',
                    'timer_started_at' => null,
                    'timer_started_at_ms' => null,
                    'timer_elapsed_seconds' => 0,
                    'timer_elapsed_ms' => 0,
                    'timer_version' => max(0, (int) $match->timer_version) + 1,
                ]);
                $this->broadcastMatchState($match, 'release');
            });
    }

    /** @param array{expected_timer_version?: int|null, timer_direction?: string, timer_duration_seconds?: int} $options */
    private function applyAction(TournamentMatch $match, string $action, string $operatorId, array $options): void
    {
        $attributes = match ($action) {
            self::ActionCallOfficials => $this->officialCallAttributes($match),
            self::ActionCallParticipants => $this->participantCallAttributes($match),
            self::ActionStart => $this->startAttributes($match),
            self::ActionPause => $this->pauseAttributes($match),
            self::ActionFinish => $this->finishAttributes($match),
            self::ActionResetTimer => $this->resetTimerAttributes($match),
            self::ActionConfigureTimer => $this->configureTimerAttributes($match),
            default => throw ValidationException::withMessages(['action' => 'Aksi alur Panitera tidak dikenal.']),
        };

        $metadata = $match->metadata ?? [];
        $finishDuration = $action === self::ActionFinish
            ? (int) $attributes['timer_elapsed_seconds']
            : null;
        $timePenalty = $finishDuration !== null
            ? $this->embuScoreCalculator->timePenalty($finishDuration, (string) $match->matchCategory?->name)
            : null;
        $metadata['panitera'] = [
            ...($metadata['panitera'] ?? []),
            ...($action === self::ActionConfigureTimer ? [
                'timer_direction' => $options['timer_direction'],
                'timer_duration_seconds' => $options['timer_duration_seconds'],
            ] : []),
            ...($action === self::ActionFinish ? [
                'finished_at' => now()->toIso8601String(),
                'duration_seconds' => $finishDuration,
                'time_penalty' => $timePenalty,
            ] : []),
            'last_action' => $action,
            'last_operator_id' => $operatorId,
            'updated_at' => now()->toIso8601String(),
        ];

        $match->update([
            ...$attributes,
            'timer_version' => max(0, (int) $match->timer_version) + 1,
            'metadata' => $metadata,
        ]);

        if ($action === self::ActionFinish && $finishDuration !== null && $timePenalty !== null) {
            $this->updateExistingEmbuScore($match, $finishDuration);
        }
    }

    /** @return array<string, mixed> */
    private function officialCallAttributes(TournamentMatch $match): array
    {
        return [
            'status' => $match->timer_status === 'running' ? 'in_progress' : 'ready',
            'call_status' => $match->call_status === 'participants_called' ? 'participants_called' : 'officials_called',
            'called_at' => now(),
        ];
    }

    /** @return array<string, mixed> */
    private function participantCallAttributes(TournamentMatch $match): array
    {
        return [
            'status' => $match->timer_status === 'running' ? 'in_progress' : 'ready',
            'call_status' => 'participants_called',
            'called_at' => now(),
        ];
    }

    /** @return array<string, mixed> */
    private function startAttributes(TournamentMatch $match): array
    {
        if ($match->call_status !== 'participants_called') {
            throw ValidationException::withMessages([
                'action' => 'Panggil peserta terlebih dahulu sebelum memulai pertandingan.',
            ]);
        }

        if ($match->timer_status === 'running') {
            return [];
        }

        $startedAt = now();

        return [
            'status' => 'in_progress',
            'timer_status' => 'running',
            'timer_started_at' => $startedAt,
            'timer_started_at_ms' => $startedAt->getTimestampMs(),
            'timer_elapsed_ms' => $this->storedElapsedMilliseconds($match),
        ];
    }

    /** @return array<string, mixed> */
    private function pauseAttributes(TournamentMatch $match): array
    {
        if ($match->timer_status !== 'running' || ! $match->timer_started_at) {
            throw ValidationException::withMessages([
                'action' => 'Timer belum berjalan sehingga tidak dapat dijeda.',
            ]);
        }

        $elapsedMilliseconds = $this->elapsedMilliseconds($match);

        return [
            'status' => 'in_progress',
            'timer_status' => 'paused',
            'timer_started_at' => null,
            'timer_started_at_ms' => null,
            'timer_elapsed_seconds' => (int) floor($elapsedMilliseconds / 1000),
            'timer_elapsed_ms' => $elapsedMilliseconds,
        ];
    }

    /** @return array<string, mixed> */
    private function finishAttributes(TournamentMatch $match): array
    {
        if ($match->matchCategory?->type !== 'embu') {
            throw ValidationException::withMessages([
                'action' => 'Aksi selesai dan perhitungan denda waktu hanya tersedia untuk pertandingan Embu.',
            ]);
        }

        if ($match->call_status !== 'participants_called') {
            throw ValidationException::withMessages([
                'action' => 'Panggil peserta terlebih dahulu sebelum menyelesaikan pertandingan.',
            ]);
        }

        if (! in_array($match->timer_status, ['running', 'paused'], true)) {
            throw ValidationException::withMessages([
                'action' => 'Mulai timer pertandingan terlebih dahulu sebelum menyelesaikan pertandingan.',
            ]);
        }

        $durationMilliseconds = $this->elapsedMilliseconds($match);
        $durationSeconds = (int) floor($durationMilliseconds / 1000);

        if ($durationSeconds < 1) {
            throw ValidationException::withMessages([
                'action' => 'Durasi pertandingan belum tercatat.',
            ]);
        }

        return [
            'status' => 'in_progress',
            'timer_status' => 'stopped',
            'timer_started_at' => null,
            'timer_started_at_ms' => null,
            'timer_elapsed_seconds' => $durationSeconds,
            'timer_elapsed_ms' => $durationMilliseconds,
        ];
    }

    /** @return array<string, mixed> */
    private function resetTimerAttributes(TournamentMatch $match): array
    {
        return [
            'status' => $match->call_status === 'waiting' ? 'pending' : 'ready',
            'timer_status' => 'stopped',
            'timer_started_at' => null,
            'timer_started_at_ms' => null,
            'timer_elapsed_seconds' => 0,
            'timer_elapsed_ms' => 0,
        ];
    }

    /** @return array<string, mixed> */
    private function configureTimerAttributes(TournamentMatch $match): array
    {
        if ($match->timer_status === 'running') {
            throw ValidationException::withMessages([
                'action' => 'Jeda atau reset timer sebelum mengubah mode waktunya.',
            ]);
        }

        return [];
    }

    private function storedElapsedMilliseconds(TournamentMatch $match): int
    {
        $storedMilliseconds = max(0, (int) $match->timer_elapsed_ms);

        if ($storedMilliseconds === 0 && $match->timer_elapsed_seconds > 0) {
            return $match->timer_elapsed_seconds * 1000;
        }

        return $storedMilliseconds;
    }

    private function elapsedMilliseconds(TournamentMatch $match): int
    {
        $elapsedMilliseconds = $this->storedElapsedMilliseconds($match);

        if ($match->timer_status !== 'running') {
            return $elapsedMilliseconds;
        }

        $startedAtMilliseconds = $match->timer_started_at_ms
            ?: $match->timer_started_at?->getTimestampMs();

        if (! $startedAtMilliseconds) {
            return $elapsedMilliseconds;
        }

        return $elapsedMilliseconds + max(0, now()->getTimestampMs() - $startedAtMilliseconds);
    }

    private function updateExistingEmbuScore(TournamentMatch $match, int $durationSeconds): void
    {
        $score = EmbuScore::query()
            ->whereBelongsTo($match)
            ->where('tiebreak_round', 0)
            ->first();

        if (! $score || $score->status === 'verified') {
            return;
        }

        $calculation = $this->embuScoreCalculator->calculate(
            $score->judge_scores,
            $durationSeconds,
            (string) $match->matchCategory?->name,
        );

        $score->update([
            'duration_seconds' => $durationSeconds,
            'time_penalty' => $calculation['time_penalty'],
            'middle_score' => $calculation['middle_score'],
            'final_score' => $calculation['final_score'],
        ]);
    }

    private function broadcastMatchState(TournamentMatch $match, string $action): void
    {
        $serverNow = now();

        PaniteraMatchStateUpdated::dispatch(
            eventId: $match->event_id,
            courtId: (string) $match->event_court_id,
            matchId: $match->id,
            action: $action,
            matchStatus: $match->status,
            callStatus: $match->call_status,
            timer: $this->timerState->timer($match),
            serverNow: $serverNow->toIso8601String(),
            serverNowMs: $serverNow->getTimestampMs(),
        );
    }
}
