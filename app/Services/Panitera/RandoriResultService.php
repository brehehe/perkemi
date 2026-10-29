<?php

namespace App\Services\Panitera;

use App\Events\PaniteraMatchStateUpdated;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\RandoriScore;
use App\Models\TournamentMatch;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RandoriResultService
{
    public function __construct(
        private RandoriScoreCalculator $calculator,
        private readonly PaniteraTimerState $timerState,
    ) {}

    /**
     * @param  array<string, int|string>  $akaBreakdown
     * @param  array<string, int|string>  $shiroBreakdown
     * @param  array<string, string>|null  $signatures
     * @param  array<string, string|null>|null  $signatureNames
     * @param  array<string, mixed>|null  $decisionOverride
     */
    public function record(
        TournamentMatch $match,
        array $akaBreakdown,
        array $shiroBreakdown,
        ?array $signatures,
        ?array $signatureNames,
        ?string $notes,
        string $userId,
        ?array $decisionOverride = null,
    ): RandoriScore {
        $akaTotal = $this->calculator->total($akaBreakdown);
        $shiroTotal = $this->calculator->total($shiroBreakdown);

        $overrideType = $decisionOverride['type'] ?? null;
        $affectedCorner = $decisionOverride['affected_corner'] ?? null;
        $overrideReason = $decisionOverride['reason'] ?? null;
        $disqualificationScope = $decisionOverride['disqualification_scope'] ?? 'match';

        if ($overrideType === 'medical_stop' && in_array($affectedCorner, ['aka', 'shiro'], true)) {
            $winnerCorner = $affectedCorner === 'aka' ? 'shiro' : 'aka';
            $winMethod = 'kiken';
        } elseif ($overrideType === 'disqualification' && in_array($affectedCorner, ['aka', 'shiro'], true)) {
            $winnerCorner = $affectedCorner === 'aka' ? 'shiro' : 'aka';
            $winMethod = 'hansoku_gachi';
        } else {
            $akaIpponWin = $this->calculator->hasIpponWin($akaBreakdown);
            $shiroIpponWin = $this->calculator->hasIpponWin($shiroBreakdown);
            $akaMethod = $this->calculator->winMethod($akaBreakdown);
            $shiroMethod = $this->calculator->winMethod($shiroBreakdown);

            if ($akaIpponWin && ! $shiroIpponWin) {
                $winnerCorner = 'aka';
                $winMethod = $akaMethod;
            } elseif ($shiroIpponWin && ! $akaIpponWin) {
                $winnerCorner = 'shiro';
                $winMethod = $shiroMethod;
            } elseif ($akaTotal === $shiroTotal) {
                throw ValidationException::withMessages([
                    'score' => 'Poin sama (Hikiwake). Tentukan pemenang melalui Yusei Kachi, Mujoken Kachi, atau opsi Stop Medis / Diskualifikasi.',
                ]);
            } else {
                $winnerCorner = $akaTotal > $shiroTotal ? 'aka' : 'shiro';
                $winMethod = 'point';
            }
        }

        return DB::transaction(function () use (
            $match,
            $akaBreakdown,
            $shiroBreakdown,
            $akaTotal,
            $shiroTotal,
            $winnerCorner,
            $winMethod,
            $overrideType,
            $affectedCorner,
            $overrideReason,
            $disqualificationScope,
            $signatures,
            $signatureNames,
            $notes,
            $userId
        ): RandoriScore {
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
                'win_method' => $winMethod,
                'is_auto_ippon' => $winMethod === 'waza_ari_awasete_ippon',
            ];

            if ($overrideType) {
                $metadata['result']['decision_override'] = [
                    'type' => $overrideType,
                    'affected_corner' => $affectedCorner,
                    'reason' => $overrideReason,
                    'disqualification_scope' => $disqualificationScope,
                ];

                $affectedEntryId = $affectedCorner === 'aka'
                    ? ($match->red_entry_id ?? $metadata['red']['entry_id'] ?? null)
                    : ($match->blue_entry_id ?? $metadata['blue']['entry_id'] ?? null);

                if ($affectedEntryId) {
                    $entry = AthleteMatchCategoryEntry::find($affectedEntryId);
                    if ($entry) {
                        if ($overrideType === 'medical_stop') {
                            $entry->update([
                                'competition_status' => 'stopped',
                                'status_notes' => 'Doctor / Medical Stop: '.($overrideReason ?: 'Cedera fisik saat bertanding'),
                            ]);
                        } elseif ($overrideType === 'disqualification') {
                            $statusNote = ($disqualificationScope === 'global' ? 'Shikkaku (Global Turnamen): ' : 'Hansoku Make (Partai Ini): ').($overrideReason ?: 'Pelanggaran disiplin/peraturan');

                            if ($disqualificationScope === 'global' && $entry->athlete_id) {
                                AthleteMatchCategoryEntry::query()
                                    ->where('athlete_id', $entry->athlete_id)
                                    ->where('event_id', $match->event_id)
                                    ->update([
                                        'competition_status' => 'disqualified',
                                        'status_notes' => $statusNote,
                                    ]);
                            } else {
                                $entry->update([
                                    'competition_status' => 'disqualified',
                                    'status_notes' => $statusNote,
                                ]);
                            }
                        }
                    }
                }
            }

            $elapsedMilliseconds = $this->timerState->elapsedMilliseconds($match);
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
            $loser = $overrideType ? null : ($metadata[$winnerCorner === 'aka' ? 'blue' : 'red'] ?? null);
            $this->routeResult($match->fresh(['drawing', 'nextMatch']), $winner, $loser);

            if ($match->event_court_id) {
                $serverNow = now();
                PaniteraMatchStateUpdated::dispatch(
                    eventId: $match->event_id,
                    courtId: $match->event_court_id,
                    matchId: $match->id,
                    action: 'save_result',
                    matchStatus: 'completed',
                    callStatus: 'completed',
                    timer: $this->timerState->timer($match),
                    serverNow: $serverNow->toIso8601String(),
                    serverNowMs: $serverNow->getTimestampMs(),
                );
            }

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

            return;
        }

        if ($match->round_label === 'Grand Final') {
            /** @var TournamentMatch|null $gf2 */
            $gf2 = $matches->get('Grand Final Ulang (GF2)');
            if ($gf2) {
                // Red corner is the Upper Bracket finalist (WB)
                // Blue corner is the Lower Bracket finalist (LB)
                $winnerCorner = ($match->red_entry_id && $winner['entry_id'] === $match->red_entry_id) ? 'red' : 'blue';
                $gf2Metadata = $gf2->metadata ?? [];

                if ($winnerCorner === 'red') {
                    // Pemenang berasal dari Upper Bracket (WB). Slot GF2 dilewati otomatis ketika tidak diperlukan!
                    $gf2Metadata['notes'] = 'Slot GF2 dilewati otomatis karena pemenang Grand Final berasal dari Upper Bracket (WB).';
                    $gf2Metadata['gf2_status'] = 'skipped';
                    $gf2->update([
                        'status' => 'completed',
                        'is_bye' => true,
                        'winner_corner' => null,
                        'scheduled_start_at' => null,
                        'scheduled_end_at' => null,
                        'event_court_id' => null,
                        'rundown_id' => null,
                        'metadata' => $gf2Metadata,
                    ]);
                } else {
                    // Pemenang berasal dari Lower Bracket (LB). GF2 berjalan dan diaktifkan sesuai aturan resmi!
                    $redParticipant = $match->metadata['red'] ?? null;
                    $blueParticipant = $match->metadata['blue'] ?? null;
                    $this->placeParticipant($gf2, 'red', $redParticipant);
                    $this->placeParticipant($gf2, 'blue', $blueParticipant);
                    $gf2Metadata = $gf2->fresh()->metadata ?? [];
                    $gf2Metadata['notes'] = 'GF2 diaktifkan karena pemenang Grand Final berasal dari jalur Lower Bracket (LB).';
                    $gf2Metadata['gf2_status'] = 'active';
                    $gf2->update([
                        'status' => 'pending',
                        'is_bye' => false,
                        'metadata' => $gf2Metadata,
                    ]);
                }
            }
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
