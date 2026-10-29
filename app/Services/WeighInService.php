<?php

namespace App\Services;

use App\Models\AthleteMatchCategoryEntry;
use App\Models\Event;
use App\Models\EventMatchCategory;
use App\Models\TournamentMatch;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WeighInService
{
    /**
     * Evaluasi status timbang badan berdasarkan berat aktual dan batas kelas berat.
     */
    public function evaluateStatus(float $actualWeight, ?float $minWeight, ?float $maxWeight): string
    {
        if ($maxWeight !== null && $actualWeight > $maxWeight) {
            return 'overweight';
        }

        if ($minWeight !== null && $minWeight > 0 && $actualWeight < $minWeight) {
            return 'underweight';
        }

        return 'passed';
    }

    /**
     * Catat hasil timbang badan kenshi pada nomor pertandingan Hari-H.
     */
    public function recordWeighIn(
        AthleteMatchCategoryEntry $entry,
        float $actualWeight,
        ?string $notes,
        string $userId,
        bool $forceOverride = false
    ): AthleteMatchCategoryEntry {
        $category = $entry->matchCategory;

        if (! $forceOverride && ($entry->weigh_in_locked_at !== null || $category?->weigh_in_locked_at !== null)) {
            throw ValidationException::withMessages([
                'weigh_in' => 'Sesi penimbangan telah dikunci. Buka kunci terlebih dahulu untuk melakukan perubahan data.',
            ]);
        }

        $minWeight = $category?->min_weight !== null ? (float) $category->min_weight : null;
        $maxWeight = $category?->max_weight !== null ? (float) $category->max_weight : null;

        $status = $this->evaluateStatus($actualWeight, $minWeight, $maxWeight);

        return DB::transaction(function () use ($entry, $actualWeight, $status, $notes, $userId): AthleteMatchCategoryEntry {
            $entry->update([
                'actual_weight' => $actualWeight,
                'weigh_in_status' => $status,
                'weigh_in_notes' => $notes,
                'weigh_in_at' => now(),
                'weigh_in_by' => $userId,
            ]);

            $entry->athlete?->update(['weight' => $actualWeight]);

            $this->syncMatchDisqualifications($entry);

            return $entry->fresh(['athlete.contingent', 'matchCategory']);
        });
    }

    /**
     * Kunci sesi penimbangan kategori nomor tanding.
     */
    public function lockCategory(EventMatchCategory $category, string $userId): void
    {
        DB::transaction(function () use ($category, $userId): void {
            $category->update([
                'weigh_in_locked_at' => now(),
                'weigh_in_locked_by' => $userId,
            ]);

            AthleteMatchCategoryEntry::query()
                ->where('event_match_category_id', $category->id)
                ->whereNull('weigh_in_locked_at')
                ->update(['weigh_in_locked_at' => now(), 'weigh_in_by' => $userId]);
        });
    }

    /**
     * Buka kunci sesi penimbangan kategori nomor tanding.
     */
    public function unlockCategory(EventMatchCategory $category): void
    {
        DB::transaction(function () use ($category): void {
            $category->update([
                'weigh_in_locked_at' => null,
                'weigh_in_locked_by' => null,
            ]);

            AthleteMatchCategoryEntry::query()
                ->where('event_match_category_id', $category->id)
                ->update(['weigh_in_locked_at' => null]);
        });
    }

    /**
     * Terapkan kemenangan Walkover (WO) pada partai karena lawan gagal timbang.
     */
    public function applyWeighInWalkover(TournamentMatch $match, string $disqualifiedCorner): TournamentMatch
    {
        return DB::transaction(function () use ($match, $disqualifiedCorner): TournamentMatch {
            $winnerCorner = $disqualifiedCorner === 'red' ? 'blue' : 'red';
            $metadata = $match->metadata ?? [];
            $metadata['result'] = [
                'winner_corner' => $winnerCorner,
                'win_method' => 'walkover_weigh_in',
                'walkover_corner' => $disqualifiedCorner,
                'walkover_reason' => 'Diskualifikasi Berat Badan (Hari-H)',
                'is_walkover' => true,
                'aka_total' => $winnerCorner === 'red' ? 1 : 0,
                'shiro_total' => $winnerCorner === 'blue' ? 1 : 0,
            ];

            if ($disqualifiedCorner === 'red') {
                $metadata['red_weigh_in_disqualified'] = true;
            } else {
                $metadata['blue_weigh_in_disqualified'] = true;
            }

            $match->update([
                'status' => 'completed',
                'call_status' => 'completed',
                'timer_status' => 'stopped',
                'timer_started_at' => null,
                'timer_started_at_ms' => null,
                'metadata' => $metadata,
            ]);

            $winner = $metadata[$winnerCorner === 'red' ? 'red' : 'blue'] ?? null;

            if ($winner && $match->nextMatch) {
                $sources = $match->nextMatch->sourceMatches()->orderBy('match_sequence')->pluck('id')->values();
                $corner = $sources->search($match->id) === 1 ? 'blue' : 'red';

                $nextMetadata = $match->nextMatch->metadata ?? [];
                $nextMetadata[$corner] = $winner;
                $match->nextMatch->update([
                    $corner === 'red' ? 'red_entry_id' : 'blue_entry_id' => $winner['entry_id'] ?? null,
                    $corner === 'red' ? 'red_label' : 'blue_label' => $winner['label'] ?? 'Pemenang WO',
                    'metadata' => $nextMetadata,
                ]);
            }

            return $match->fresh(['nextMatch']);
        });
    }

    /**
     * Sinkronkan penanda diskualifikasi bagan jika atlet gagal timbang setelah bagan diundi.
     */
    public function syncMatchDisqualifications(AthleteMatchCategoryEntry $entry): void
    {
        $isDisqualified = in_array($entry->weigh_in_status, ['overweight', 'underweight', 'disqualified', 'failed'], true);

        $redMatches = TournamentMatch::query()
            ->where('event_match_category_id', $entry->event_match_category_id)
            ->where('red_entry_id', $entry->id)
            ->get();

        foreach ($redMatches as $match) {
            $meta = $match->metadata ?? [];
            $meta['red_weigh_in_disqualified'] = $isDisqualified;
            if ($isDisqualified) {
                $meta['red_disqualification_reason'] = match ($entry->weigh_in_status) {
                    'overweight' => 'Kelebihan Berat Badan',
                    'underweight' => 'Kekurangan Berat Badan',
                    default => 'Gagal Timbang Badan',
                };
            } else {
                unset($meta['red_disqualification_reason']);
            }
            $match->update(['metadata' => $meta]);

            if ($isDisqualified && $match->status === 'ready' && $match->blue_entry_id) {
                $this->applyWeighInWalkover($match, 'red');
            }
        }

        $blueMatches = TournamentMatch::query()
            ->where('event_match_category_id', $entry->event_match_category_id)
            ->where('blue_entry_id', $entry->id)
            ->get();

        foreach ($blueMatches as $match) {
            $meta = $match->metadata ?? [];
            $meta['blue_weigh_in_disqualified'] = $isDisqualified;
            if ($isDisqualified) {
                $meta['blue_disqualification_reason'] = match ($entry->weigh_in_status) {
                    'overweight' => 'Kelebihan Berat Badan',
                    'underweight' => 'Kekurangan Berat Badan',
                    default => 'Gagal Timbang Badan',
                };
            } else {
                unset($meta['blue_disqualification_reason']);
            }
            $match->update(['metadata' => $meta]);

            if ($isDisqualified && $match->status === 'ready' && $match->red_entry_id) {
                $this->applyWeighInWalkover($match, 'blue');
            }
        }
    }

    /**
     * Hitung rekapitulasi statistik penimbangan.
     *
     * @return array<string, int>
     */
    public function statistics(Event $event, ?EventMatchCategory $category = null): array
    {
        $query = AthleteMatchCategoryEntry::query()
            ->whereBelongsTo($event)
            ->whereHas('matchCategory', fn ($q) => $q->where('type', 'randori')->where('is_active', true));

        if ($category) {
            $query->where('event_match_category_id', $category->id);
        }

        $entries = $query->get(['id', 'weigh_in_status']);

        $total = $entries->count();
        $passed = $entries->where('weigh_in_status', 'passed')->count();
        $overweight = $entries->where('weigh_in_status', 'overweight')->count();
        $underweight = $entries->where('weigh_in_status', 'underweight')->count();
        $disqualified = $entries->whereIn('weigh_in_status', ['disqualified', 'failed'])->count();
        $pending = $entries->whereIn('weigh_in_status', ['pending', null])->count();
        $weighed = $total - $pending;

        return [
            'total' => $total,
            'weighed' => $weighed,
            'passed' => $passed,
            'overweight' => $overweight,
            'underweight' => $underweight,
            'disqualified' => $disqualified,
            'failed_total' => $overweight + $underweight + $disqualified,
            'pending' => $pending,
        ];
    }
}
