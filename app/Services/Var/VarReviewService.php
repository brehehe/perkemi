<?php

namespace App\Services\Var;

use App\Events\VarReviewStateUpdated;
use App\Models\TournamentMatch;
use App\Models\TournamentMatchVarReview;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class VarReviewService
{
    /**
     * Calculate remaining VAR challenge cards for AKA and SHIRO corners.
     * Each corner begins with 1 challenge card. If a challenge is rejected (upheld),
     * the card is consumed (0 remaining). If overturned or inconclusive, the card is retained.
     *
     * @return array{aka: int, shiro: int}
     */
    public function calculateCardsRemaining(TournamentMatch $match): array
    {
        $reviews = TournamentMatchVarReview::query()
            ->where('tournament_match_id', $match->id)
            ->whereIn('status', ['overturned', 'upheld', 'inconclusive'])
            ->get();

        $akaLost = $reviews->first(fn ($r) => in_array($r->requested_by, ['aka_coach', 'aka'], true) && $r->status === 'upheld' && ! $r->challenge_card_retained);
        $shiroLost = $reviews->first(fn ($r) => in_array($r->requested_by, ['shiro_coach', 'shiro'], true) && $r->status === 'upheld' && ! $r->challenge_card_retained);

        return [
            'aka' => $akaLost ? 0 : 1,
            'shiro' => $shiroLost ? 0 : 1,
        ];
    }

    /**
     * Start a new VAR review for the match.
     *
     * @param  array{
     *     corner?: string,
     *     requested_by?: string,
     *     reason: string,
     *     match_second?: int,
     *     camera_angle?: string,
     *     video_url?: string|null
     * }  $input
     */
    public function startReview(TournamentMatch $match, array $input, ?string $userName = null): TournamentMatchVarReview
    {
        $corner = $input['corner'] ?? 'neutral';
        $requestedBy = $input['requested_by'] ?? ($corner === 'aka' ? 'aka_coach' : ($corner === 'shiro' ? 'shiro_coach' : 'referee'));
        $cards = $this->calculateCardsRemaining($match);

        if (in_array($requestedBy, ['aka_coach', 'aka'], true) && $cards['aka'] <= 0) {
            throw new InvalidArgumentException('Sudut AKA sudah tidak memiliki kuota kartu challenge VAR.');
        }

        if (in_array($requestedBy, ['shiro_coach', 'shiro'], true) && $cards['shiro'] <= 0) {
            throw new InvalidArgumentException('Sudut SHIRO sudah tidak memiliki kuota kartu challenge VAR.');
        }

        return DB::transaction(function () use ($match, $input, $corner, $requestedBy, $userName, $cards) {
            // Check if active review already exists
            $existing = TournamentMatchVarReview::query()
                ->where('tournament_match_id', $match->id)
                ->where('status', 'reviewing')
                ->first();

            if ($existing) {
                return $existing;
            }

            // Auto-pause match timer if currently running
            $metadata = $match->metadata ?? [];
            if ($match->timer_status === 'running') {
                $now = now();
                $elapsed = (int) ($match->timer_elapsed_seconds ?? 0);
                if ($match->timer_started_at) {
                    $elapsed += max(0, $now->diffInSeconds($match->timer_started_at));
                }

                $match->update([
                    'timer_status' => 'paused',
                    'timer_elapsed_seconds' => $elapsed,
                    'timer_started_at' => null,
                ]);
            }

            $metadata['under_var_review'] = true;
            $metadata['var_review_reason'] = $input['reason'] ?? 'Tantangan Video Review';
            $metadata['var_review_corner'] = $corner;
            $match->update(['metadata' => $metadata]);

            $review = TournamentMatchVarReview::query()->create([
                'tournament_match_id' => $match->id,
                'event_id' => $match->event_id,
                'corner' => $corner,
                'requested_by' => $requestedBy,
                'reason' => $input['reason'] ?? 'Pemeriksaan Video Replay',
                'match_second' => (int) ($input['match_second'] ?? $match->timer_elapsed_seconds ?? 0),
                'status' => 'reviewing',
                'camera_angle' => $input['camera_angle'] ?? 'cam_table',
                'video_url' => $input['video_url'] ?? null,
                'reviewed_by' => $userName,
            ]);

            // Broadcast real-time event to Court Monitor & Panitera
            event(new VarReviewStateUpdated(
                eventId: $match->event_id,
                courtId: (string) ($match->event_court_id ?? ''),
                matchId: $match->id,
                isUnderReview: true,
                reviewData: $this->formatReview($review),
                cardsRemaining: $cards,
            ));

            return $review;
        });
    }

    /**
     * Resolve an active VAR review with a final verdict.
     *
     * @param  array{
     *     status: 'overturned'|'upheld'|'inconclusive',
     *     verdict_notes?: string|null,
     *     reviewed_by?: string|null
     * }  $verdict
     */
    public function resolveReview(TournamentMatchVarReview $review, array $verdict, ?string $userName = null): TournamentMatchVarReview
    {
        $status = $verdict['status'] ?? 'upheld';
        if (! in_array($status, ['overturned', 'upheld', 'inconclusive'], true)) {
            throw new InvalidArgumentException('Status putusan VAR tidak valid.');
        }

        return DB::transaction(function () use ($review, $verdict, $status, $userName) {
            $match = $review->match;

            // Retained if decision was overturned or inconclusive
            $retained = ($status === 'overturned' || $status === 'inconclusive');

            $review->update([
                'status' => $status,
                'verdict_notes' => $verdict['verdict_notes'] ?? null,
                'reviewed_by' => $verdict['reviewed_by'] ?? $userName ?? $review->reviewed_by,
                'challenge_card_retained' => $retained,
                'resolved_at' => now(),
            ]);

            // Clear under_var_review flag
            $metadata = $match->metadata ?? [];
            $metadata['under_var_review'] = false;
            $metadata['last_var_verdict'] = [
                'status' => $status,
                'corner' => $review->corner,
                'resolved_at' => now()->toIso8601String(),
            ];
            $match->update(['metadata' => $metadata]);

            $cards = $this->calculateCardsRemaining($match);

            // Broadcast resolution
            event(new VarReviewStateUpdated(
                eventId: $match->event_id,
                courtId: (string) ($match->event_court_id ?? ''),
                matchId: $match->id,
                isUnderReview: false,
                reviewData: $this->formatReview($review),
                cardsRemaining: $cards,
            ));

            return $review;
        });
    }

    /**
     * Format review model to array representation for frontend display.
     *
     * @return array<string, mixed>
     */
    public function formatReview(TournamentMatchVarReview $review): array
    {
        return [
            'id' => $review->id,
            'match_id' => $review->tournament_match_id,
            'corner' => $review->corner,
            'corner_label' => match ($review->corner) {
                'aka' => 'AKA (Merah)',
                'shiro' => 'SHIRO (Putih)',
                default => 'Netral / Wasit',
            },
            'requested_by' => $review->requested_by,
            'requested_by_label' => match ($review->requested_by) {
                'aka_coach', 'aka' => 'Pelatih Sudut AKA',
                'shiro_coach', 'shiro' => 'Pelatih Sudut SHIRO',
                'chief_judge' => 'Ketua Dewan Wasit',
                default => 'Wasit Lapangan',
            },
            'reason' => $review->reason,
            'match_second' => $review->match_second,
            'match_time_formatted' => sprintf('%02d:%02d', floor($review->match_second / 60), $review->match_second % 60),
            'status' => $review->status,
            'status_label' => match ($review->status) {
                'reviewing' => 'Dalam Pemeriksaan VAR',
                'overturned' => 'Tantangan Diterima (Overturned)',
                'upheld' => 'Tantangan Ditolak (Upheld)',
                'inconclusive' => 'Bukti Tidak Cukup (Inconclusive)',
                default => $review->status,
            },
            'status_tone' => match ($review->status) {
                'reviewing' => 'amber',
                'overturned' => 'emerald',
                'upheld' => 'rose',
                default => 'slate',
            },
            'camera_angle' => $review->camera_angle,
            'camera_angle_label' => match ($review->camera_angle) {
                'cam_corner_aka' => 'Kamera Sudut AKA',
                'cam_corner_shiro' => 'Kamera Sudut SHIRO',
                'cam_overhead' => 'Kamera Tatami Atas',
                default => 'Kamera Meja Panitera',
            },
            'video_url' => $review->video_url,
            'verdict_notes' => $review->verdict_notes,
            'reviewed_by' => $review->reviewed_by,
            'challenge_card_retained' => (bool) $review->challenge_card_retained,
            'created_at' => $review->created_at?->translatedFormat('H:i:s'),
            'resolved_at' => $review->resolved_at?->translatedFormat('H:i:s'),
        ];
    }
}
