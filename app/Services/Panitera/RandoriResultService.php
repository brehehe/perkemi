<?php

namespace App\Services\Panitera;

use App\Models\RandoriScore;
use App\Models\TournamentMatch;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RandoriResultService
{
    public function __construct(private RandoriScoreCalculator $calculator) {}

    /**
     * @param  array<string, int|string>  $akaBreakdown
     * @param  array<string, int|string>  $shiroBreakdown
     * @param  array<string, string>|null  $signatures
     * @param  array<string, string|null>|null  $signatureNames
     */
    public function record(
        TournamentMatch $match,
        array $akaBreakdown,
        array $shiroBreakdown,
        ?array $signatures,
        ?array $signatureNames,
        ?string $notes,
        string $userId,
    ): RandoriScore {
        $akaTotal = $this->calculator->total($akaBreakdown);
        $shiroTotal = $this->calculator->total($shiroBreakdown);

        if ($akaTotal === $shiroTotal) {
            throw ValidationException::withMessages([
                'score' => 'Poin sama (Hikiwake). Tentukan pemenang melalui Yusei Kachi atau Mujoken Kachi.',
            ]);
        }

        return DB::transaction(function () use ($match, $akaBreakdown, $shiroBreakdown, $akaTotal, $shiroTotal, $signatures, $signatureNames, $notes, $userId): RandoriScore {
            $winnerCorner = $akaTotal > $shiroTotal ? 'aka' : 'shiro';
            $score = RandoriScore::query()
                ->where('tournament_match_id', $match->id)
                ->lockForUpdate()
                ->first();

            if ($score?->locked_at) {
                throw ValidationException::withMessages([
                    'result' => 'Nilai Randori sudah dikunci dan tidak dapat diubah lagi.',
                ]);
            }

            $score ??= new RandoriScore(['tournament_match_id' => $match->id]);
            $score->fill([
                'event_id' => $match->event_id,
                'aka_breakdown' => $akaBreakdown,
                'shiro_breakdown' => $shiroBreakdown,
                'aka_total' => $akaTotal,
                'shiro_total' => $shiroTotal,
                'winner_corner' => $winnerCorner,
                'signatures' => $signatures,
                'signature_names' => collect($signatureNames)
                    ->only(RandoriScore::SignatureKeys)
                    ->map(fn (mixed $name): ?string => is_string($name) && trim($name) !== '' ? trim($name) : null)
                    ->all(),
                'status' => 'verified',
                'submitted_by' => $userId,
                'verified_by' => $userId,
                'verified_at' => now(),
                'notes' => $notes,
            ]);
            $score->save();

            $metadata = $match->metadata ?? [];
            $metadata['result'] = [
                'aka_total' => $akaTotal,
                'shiro_total' => $shiroTotal,
                'winner_corner' => $winnerCorner,
            ];
            $runningMilliseconds = $match->timer_started_at_ms
                ? max(0, now()->getTimestampMs() - $match->timer_started_at_ms)
                : ($match->timer_started_at
                    ? (int) floor($match->timer_started_at->diffInMilliseconds(now()))
                    : 0);
            $elapsedMilliseconds = max(0, (int) $match->timer_elapsed_ms);

            if ($elapsedMilliseconds === 0 && $match->timer_elapsed_seconds > 0) {
                $elapsedMilliseconds = $match->timer_elapsed_seconds * 1000;
            }

            $elapsedMilliseconds += $runningMilliseconds;
            $match->update([
                'status' => 'completed',
                'call_status' => 'completed',
                'timer_status' => 'stopped',
                'timer_started_at' => null,
                'timer_started_at_ms' => null,
                'timer_elapsed_seconds' => (int) floor($elapsedMilliseconds / 1000),
                'timer_elapsed_ms' => $elapsedMilliseconds,
                'timer_version' => max(0, (int) $match->timer_version) + 1,
                'metadata' => $metadata,
            ]);

            $winner = $metadata[$winnerCorner === 'aka' ? 'red' : 'blue'] ?? null;
            $loser = $metadata[$winnerCorner === 'aka' ? 'blue' : 'red'] ?? null;
            $this->routeResult($match->fresh(['drawing', 'nextMatch']), $winner, $loser);

            return $score;
        });
    }

    public function lock(TournamentMatch $match, string $userId): RandoriScore
    {
        return DB::transaction(function () use ($match, $userId): RandoriScore {
            $score = RandoriScore::query()
                ->where('tournament_match_id', $match->id)
                ->lockForUpdate()
                ->first();

            if (! $score) {
                throw ValidationException::withMessages([
                    'result' => 'Simpan hasil nilai Randori terlebih dahulu sebelum menguncinya.',
                ]);
            }

            $completedSignatures = collect($score->signatures)
                ->only(RandoriScore::SignatureKeys)
                ->filter(fn (mixed $signature): bool => is_string($signature) && $signature !== '')
                ->count();

            if ($completedSignatures !== count(RandoriScore::SignatureKeys)) {
                throw ValidationException::withMessages([
                    'result' => 'Enam tanda tangan wajib lengkap sebelum nilai Randori dikunci.',
                ]);
            }

            if (! $score->locked_at) {
                $score->update([
                    'locked_by' => $userId,
                    'locked_at' => now(),
                ]);
            }

            return $score;
        });
    }

    /** @param array<string, mixed>|null $winner @param array<string, mixed>|null $loser */
    private function routeResult(TournamentMatch $match, ?array $winner, ?array $loser): void
    {
        if (! $winner) {
            return;
        }

        if ($match->drawing?->bracket_type !== 'double_elimination') {
            if ($match->nextMatch) {
                $sources = $match->nextMatch->sourceMatches()->orderBy('match_sequence')->pluck('id')->values();
                $corner = $sources->search($match->id) === 1 ? 'blue' : 'red';
                $this->placeParticipant($match->nextMatch, $corner, $winner);
            }

            return;
        }

        $matches = TournamentMatch::query()
            ->where('event_match_category_id', $match->event_match_category_id)
            ->get()
            ->keyBy('round_label');

        if ($match->round_label === 'Upper Bracket') {
            $upperMatches = TournamentMatch::query()
                ->where('event_match_category_id', $match->event_match_category_id)
                ->where('round_label', 'Upper Bracket')
                ->orderBy('match_sequence')
                ->pluck('id')
                ->values();
            $corner = $upperMatches->search($match->id) === 1 ? 'blue' : 'red';
            $this->placeParticipant($matches->get('Final Upper Bracket'), $corner, $winner);
            $this->placeParticipant($matches->get('Lower Bracket · Babak 1'), $corner, $loser);

            return;
        }

        if ($match->round_label === 'Lower Bracket · Babak 1') {
            $this->placeParticipant($matches->get('Final Lower Bracket'), 'red', $winner);

            return;
        }

        if ($match->round_label === 'Final Upper Bracket') {
            $this->placeParticipant($matches->get('Grand Final'), 'red', $winner);
            $this->placeParticipant($matches->get('Final Lower Bracket'), 'blue', $loser);

            return;
        }

        if ($match->round_label === 'Final Lower Bracket') {
            $this->placeParticipant($matches->get('Grand Final'), 'blue', $winner);
        }
    }

    /** @param array<string, mixed>|null $participant */
    private function placeParticipant(?TournamentMatch $target, string $corner, ?array $participant): void
    {
        if (! $target || ! $participant) {
            return;
        }

        $metadata = $target->metadata ?? [];
        $metadata[$corner] = $participant;
        $metadata['placeholder'] = ! isset($metadata['red'], $metadata['blue']);
        $metadata['athlete_ids'] = collect([
            $metadata['red']['athlete_ids'] ?? [],
            $metadata['blue']['athlete_ids'] ?? [],
        ])->flatten()->unique()->values()->all();

        $target->update([
            $corner.'_entry_id' => $participant['entry_id'] ?? null,
            $corner.'_label' => $participant['label'] ?? 'Peserta',
            'metadata' => $metadata,
        ]);
    }
}
