<?php

namespace App\Services\Referee;

use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\Referee;
use App\Models\TournamentMatch;
use App\Services\EmbuParticipantDetails;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class RefereeEvaluationService
{
    public function __construct(
        private EmbuParticipantDetails $participantDetails,
    ) {}

    /**
     * Evaluate referees for the given event with optional filtering.
     *
     * @param  array{search?: string|null, certification?: string|null, status?: string|null}  $filters
     * @return array{
     *     summary: array<string, mixed>,
     *     referees: list<array<string, mixed>>,
     *     heatmap: array<string, mixed>,
     *     certification_options: list<string>
     * }
     */
    public function evaluate(Event $event, array $filters = []): array
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $certificationFilter = trim((string) ($filters['certification'] ?? ''));
        $statusFilter = trim((string) ($filters['status'] ?? 'all'));

        // Load all active or assigned referees in this event
        $assignedRefereeIds = $event->referees()->pluck('referees.id');
        $scoringRefereeIds = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->where('status', 'submitted')
            ->distinct()
            ->pluck('referee_id');

        $allRefereeIds = $assignedRefereeIds->merge($scoringRefereeIds)->filter()->unique()->values();

        $referees = Referee::query()
            ->whereIn('id', $allRefereeIds)
            ->orderBy('name')
            ->get();

        // Preload matches and scores for this event to avoid N+1 queries
        $matchesWithScores = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereHas('matchCategory', fn ($q) => $q->where('type', 'embu'))
            ->with([
                'matchCategory:id,name,type',
                'court:id,name',
                'embuJudgeScores' => fn ($q) => $q->where('status', 'submitted'),
                'participantEntry.athlete.contingent:id,name,city',
            ])
            ->get()
            ->keyBy('id');

        $evaluations = [];
        $certificationSet = collect();
        $regionalMatrix = [];
        $contingentCities = collect();

        foreach ($referees as $referee) {
            $certification = trim((string) ($referee->certification_level ?: 'Wasit Daerah'));
            $certificationSet->push($certification);

            $refereeScores = collect();
            $matchesJudged = [];
            $trimmedCount = 0;
            $sameRegionScores = [];
            $sameRegionPeerScores = [];
            $otherRegionScores = [];

            // Group referee's submitted scores across matches
            foreach ($matchesWithScores as $match) {
                /** @var EmbuJudgeScore|null $judgeScore */
                $judgeScore = $match->embuJudgeScores->firstWhere('referee_id', $referee->id);

                if (! $judgeScore || $judgeScore->status !== 'submitted') {
                    continue;
                }

                $scoreVal = (float) $judgeScore->total_score;
                $refereeScores->push($scoreVal);

                // Analyze peer scores in this match
                $allMatchScores = $match->embuJudgeScores->pluck('total_score')->map(fn ($v) => (float) $v);
                $peerScores = $match->embuJudgeScores
                    ->filter(fn ($s) => $s->id !== $judgeScore->id)
                    ->pluck('total_score')
                    ->map(fn ($v) => (float) $v);

                $isTrimmed = false;
                if ($allMatchScores->count() >= 3) {
                    $minVal = $allMatchScores->min();
                    $maxVal = $allMatchScores->max();
                    if ($scoreVal === $minVal || $scoreVal === $maxVal) {
                        $isTrimmed = true;
                        $trimmedCount++;
                    }
                }

                // Check participant contingent region/city
                $participant = $this->participantDetails->forMatch($event, $match);
                $contingentName = $participant['contingent_name'] ?? ($match->participantEntry?->athlete?->contingent?->name ?? 'Kontingen');
                $contingentCity = $match->participantEntry?->athlete?->contingent?->city ?? $contingentName;

                if ($contingentCity) {
                    $contingentCities->push($contingentCity);
                }

                $isSameRegion = $this->isSameOrigin($referee->region, $contingentCity, $contingentName);
                if ($isSameRegion) {
                    $sameRegionScores[] = $scoreVal;
                    if ($peerScores->isNotEmpty()) {
                        $sameRegionPeerScores[] = $peerScores->avg();
                    }
                } else {
                    $otherRegionScores[] = $scoreVal;
                }

                $matchesJudged[] = [
                    'match_id' => $match->id,
                    'sequence' => $match->match_sequence,
                    'category' => $match->matchCategory?->name ?? 'Embu',
                    'round' => $match->round_label,
                    'court' => $match->court?->name,
                    'participant' => $participant['contingent_name'] ?: $match->participant_label,
                    'contingent_city' => $contingentCity,
                    'score' => $scoreVal,
                    'peer_average' => $peerScores->isNotEmpty() ? round($peerScores->avg(), 2) : $scoreVal,
                    'peer_deviation' => $peerScores->isNotEmpty() ? round($scoreVal - $peerScores->avg(), 2) : 0.0,
                    'is_trimmed' => $isTrimmed,
                    'is_same_region' => $isSameRegion,
                ];

                // Heatmap data collection: Referee -> Contingent City
                $cityKey = $contingentCity ?: 'Lainnya';
                $regionalMatrix[$referee->id][$cityKey][] = [
                    'referee_score' => $scoreVal,
                    'peer_avg' => $peerScores->isNotEmpty() ? $peerScores->avg() : $scoreVal,
                    'deviation' => $peerScores->isNotEmpty() ? round($scoreVal - $peerScores->avg(), 2) : 0.0,
                    'is_same_origin' => $isSameRegion,
                ];
            }

            $count = $refereeScores->count();
            $avgScore = $count > 0 ? round($refereeScores->avg(), 2) : 0.0;
            $stdDev = $count > 1 ? $this->calculateStdDev($refereeScores->all(), $avgScore) : 0.0;
            $minScore = $count > 0 ? round($refereeScores->min(), 2) : 0.0;
            $maxScore = $count > 0 ? round($refereeScores->max(), 2) : 0.0;
            $scoreRange = round($maxScore - $minScore, 2);
            $trimmedRate = $count > 0 ? round(($trimmedCount / $count) * 100, 1) : 0.0;

            // Same origin bias calculation
            $sameOriginCount = count($sameRegionScores);
            $sameOriginAvg = $sameOriginCount > 0 ? round(array_sum($sameRegionScores) / $sameOriginCount, 2) : 0.0;
            $sameOriginPeerAvg = count($sameRegionPeerScores) > 0 ? round(array_sum($sameRegionPeerScores) / count($sameRegionPeerScores), 2) : 0.0;
            $regionalDelta = $sameOriginCount > 0 ? round($sameOriginAvg - $sameOriginPeerAvg, 2) : 0.0;

            // Anomaly warning rules
            $flags = [];
            if ($count >= 2 && $stdDev > 6.0) {
                $flags[] = [
                    'code' => 'high_std_dev',
                    'severity' => $stdDev > 8.0 ? 'critical' : 'warning',
                    'label' => "Standar Deviasi Tinggi ({$stdDev})",
                    'description' => 'Variasi penilaian antar partai sangat tajam (melebihi ambang batas toleransi 6.0).',
                ];
            }

            if ($count >= 3 && $trimmedRate >= 40.0) {
                $flags[] = [
                    'code' => 'high_trimmed_rate',
                    'severity' => $trimmedRate >= 50.0 ? 'critical' : 'warning',
                    'label' => "Nilai Kerap Dibuang ({$trimmedRate}%)",
                    'description' => "Sebesar {$trimmedRate}% nilai wasit terbuang sebagai skor ekstrem (outlier min/max) pada sistem trimmed mean 5 juri.",
                ];
            }

            if ($sameOriginCount > 0 && $regionalDelta >= 3.0) {
                $flags[] = [
                    'code' => 'regional_bias',
                    'severity' => 'critical',
                    'label' => "Indikasi Bias Kedaerahan (+{$regionalDelta})",
                    'description' => "Wasit memberikan rata-rata +{$regionalDelta} poin lebih tinggi untuk kontingen daerah asal ({$referee->region}) dibandingkan rata-rata juri lainnya.",
                ];
            } elseif ($sameOriginCount > 0 && $regionalDelta >= 1.5) {
                $flags[] = [
                    'code' => 'slight_regional_bias',
                    'severity' => 'warning',
                    'label' => "Kecenderungan Skor Daerah (+{$regionalDelta})",
                    'description' => "Terdapat selisih positif +{$regionalDelta} poin saat menilai kontingen daerah asal ({$referee->region}).",
                ];
            }

            $hasCritical = collect($flags)->contains('severity', 'critical');
            $hasWarning = collect($flags)->contains('severity', 'warning');
            $status = $hasCritical ? 'flagged' : ($hasWarning ? 'warning' : 'normal');

            // Generate narrative analysis
            $narrative = $this->generateNarrative(
                referee: $referee,
                count: $count,
                avgScore: $avgScore,
                stdDev: $stdDev,
                trimmedRate: $trimmedRate,
                sameOriginCount: $sameOriginCount,
                regionalDelta: $regionalDelta,
                flags: $flags,
                status: $status,
            );

            $evaluations[] = [
                'id' => $referee->id,
                'name' => $referee->name,
                'dan_grade' => $referee->dan_grade,
                'license_number' => $referee->license_number,
                'certification_level' => $certification,
                'region' => $referee->region ?: 'Nasional',
                'is_active' => (bool) $referee->is_active,
                'matches_judged_count' => $count,
                'average_score' => $avgScore,
                'std_dev' => $stdDev,
                'min_score' => $minScore,
                'max_score' => $maxScore,
                'score_range' => $scoreRange,
                'trimmed_count' => $trimmedCount,
                'trimmed_rate' => $trimmedRate,
                'same_origin_count' => $sameOriginCount,
                'same_origin_avg' => $sameOriginAvg,
                'same_origin_peer_avg' => $sameOriginPeerAvg,
                'regional_delta' => $regionalDelta,
                'flags' => $flags,
                'status' => $status,
                'status_label' => match ($status) {
                    'flagged' => 'Anomali Terdeteksi',
                    'warning' => 'Perlu Perhatian',
                    default => 'Objektif & Konsisten',
                },
                'status_tone' => match ($status) {
                    'flagged' => 'rose',
                    'warning' => 'amber',
                    default => 'emerald',
                },
                'narrative' => $narrative,
                'matches' => $matchesJudged,
            ];
        }

        // Apply search filter
        $filteredEvaluations = collect($evaluations)
            ->when($search !== '', function (Collection $items) use ($search): Collection {
                $needle = Str::lower($search);

                return $items->filter(function (array $item) use ($needle): bool {
                    return Str::contains(Str::lower($item['name']), $needle)
                        || Str::contains(Str::lower((string) $item['license_number']), $needle)
                        || Str::contains(Str::lower((string) $item['region']), $needle)
                        || Str::contains(Str::lower((string) $item['certification_level']), $needle);
                });
            })
            ->when($certificationFilter !== '' && $certificationFilter !== 'all', function (Collection $items) use ($certificationFilter): Collection {
                $needle = Str::lower($certificationFilter);

                return $items->filter(fn (array $item): bool => Str::contains(Str::lower($item['certification_level']), $needle));
            })
            ->when($statusFilter !== 'all', function (Collection $items) use ($statusFilter): Collection {
                if ($statusFilter === 'flagged_only') {
                    return $items->filter(fn (array $item): bool => in_array($item['status'], ['flagged', 'warning'], true));
                }
                if ($statusFilter === 'normal_only') {
                    return $items->filter(fn (array $item): bool => $item['status'] === 'normal');
                }

                return $items;
            })
            ->values()
            ->all();

        // Compute aggregate metrics
        $allEvaluatedReferees = collect($evaluations)->filter(fn ($r) => $r['matches_judged_count'] > 0);
        $totalActiveJudges = $allEvaluatedReferees->count();
        $overallAvgScore = $totalActiveJudges > 0 ? round($allEvaluatedReferees->avg('average_score'), 2) : 0.0;
        $overallAvgStdDev = $totalActiveJudges > 0 ? round($allEvaluatedReferees->avg('std_dev'), 2) : 0.0;
        $totalFlagged = collect($evaluations)->where('status', 'flagged')->count();
        $totalWarning = collect($evaluations)->where('status', 'warning')->count();
        $totalNormal = collect($evaluations)->where('status', 'normal')->count();
        $objectivityRate = count($evaluations) > 0 ? round(($totalNormal / count($evaluations)) * 100, 1) : 100.0;

        // Compile Heatmap data
        $uniqueCities = $contingentCities->filter()->unique()->sort()->values()->all();
        $heatmapMatrix = [];
        foreach ($evaluations as $item) {
            $refId = $item['id'];
            $row = [
                'referee_id' => $refId,
                'referee_name' => $item['name'],
                'referee_region' => $item['region'],
                'cells' => [],
            ];

            foreach ($uniqueCities as $city) {
                $scoresInCity = $regionalMatrix[$refId][$city] ?? [];
                if (empty($scoresInCity)) {
                    $row['cells'][$city] = null;
                } else {
                    $avgDev = round(collect($scoresInCity)->avg('deviation'), 2);
                    $avgScore = round(collect($scoresInCity)->avg('referee_score'), 2);
                    $isSame = collect($scoresInCity)->contains('is_same_origin', true);
                    $row['cells'][$city] = [
                        'count' => count($scoresInCity),
                        'avg_score' => $avgScore,
                        'deviation' => $avgDev,
                        'is_same_origin' => $isSame,
                        'intensity' => $avgDev >= 3.0 ? 'high_positive' : ($avgDev >= 1.5 ? 'med_positive' : ($avgDev <= -3.0 ? 'high_negative' : ($avgDev <= -1.5 ? 'med_negative' : 'neutral'))),
                    ];
                }
            }

            $heatmapMatrix[] = $row;
        }

        return [
            'summary' => [
                'total_referees' => count($evaluations),
                'active_scoring_referees' => $totalActiveJudges,
                'overall_average_score' => $overallAvgScore,
                'overall_std_dev' => $overallAvgStdDev,
                'flagged_count' => $totalFlagged,
                'warning_count' => $totalWarning,
                'normal_count' => $totalNormal,
                'objectivity_rate' => $objectivityRate,
            ],
            'referees' => $filteredEvaluations,
            'heatmap' => [
                'cities' => $uniqueCities,
                'rows' => $heatmapMatrix,
            ],
            'certification_options' => $certificationSet->filter()->unique()->values()->all(),
        ];
    }

    /**
     * Calculate sample / population standard deviation.
     *
     * @param  list<float>  $values
     */
    private function calculateStdDev(array $values, float $mean): float
    {
        $count = count($values);
        if ($count <= 1) {
            return 0.0;
        }

        $variance = 0.0;
        foreach ($values as $val) {
            $variance += ($val - $mean) ** 2;
        }

        return round(sqrt($variance / $count), 2);
    }

    /**
     * Determine if a referee region and participant city/contingent originate from the same locale.
     */
    private function isSameOrigin(?string $refereeRegion, ?string $contingentCity, ?string $contingentName): bool
    {
        if (! $refereeRegion || (! $contingentCity && ! $contingentName)) {
            return false;
        }

        $cleanRef = Str::lower(preg_replace('/(kabupaten|kab\.|kota|provinsi|prov\.|dojo)/i', '', $refereeRegion));
        $cleanCity = Str::lower(preg_replace('/(kabupaten|kab\.|kota|provinsi|prov\.|dojo)/i', '', (string) $contingentCity));
        $cleanName = Str::lower(preg_replace('/(kabupaten|kab\.|kota|provinsi|prov\.|dojo)/i', '', (string) $contingentName));

        $cleanRef = trim($cleanRef);
        $cleanCity = trim($cleanCity);
        $cleanName = trim($cleanName);

        if ($cleanRef === '' || ($cleanCity === '' && $cleanName === '')) {
            return false;
        }

        return Str::contains($cleanCity, $cleanRef)
            || Str::contains($cleanRef, $cleanCity)
            || Str::contains($cleanName, $cleanRef)
            || Str::contains($cleanRef, $cleanName);
    }

    /**
     * Generate narrative evaluation report based on referee metrics.
     *
     * @param  list<array<string, mixed>>  $flags
     */
    private function generateNarrative(
        Referee $referee,
        int $count,
        float $avgScore,
        float $stdDev,
        float $trimmedRate,
        int $sameOriginCount,
        float $regionalDelta,
        array $flags,
        string $status,
    ): array {
        if ($count === 0) {
            return [
                'headline' => 'Belum Ada Data Penilaian Pertandingan',
                'consistency' => 'Wasit belum mencatatkan penilaian resmi pada event ini.',
                'trimmed_analysis' => 'Menunggu jadwal penugasan dan pengesahan nilai tatami.',
                'regional_bias' => 'Belum ada data evaluasi silang asal kontingen.',
                'recommendation' => 'Siap ditugaskan sesuai jadwal rotasi tatami dewan wasit.',
            ];
        }

        // 1. Consistency
        if ($stdDev <= 3.0) {
            $consistency = "Wasit menunjukkan konsistensi penilaian sangat prima (Std Dev {$stdDev}), kalibrasi pemahaman teknik sangat selaras dengan standar PB Perkemi.";
        } elseif ($stdDev <= 6.0) {
            $consistency = "Konsistensi penilaian tergolong normal dan wajar (Std Dev {$stdDev}), rentang skor mencerminkan variasi performa peserta secara proporsional.";
        } else {
            $consistency = "Perhatian: Fluktuasi penilaian wasit cukup tajam (Std Dev {$stdDev} > 6.0), disarankan penyelarasan standar penilaian pada briefing wasit.";
        }

        // 2. Trimmed Rate
        if ($trimmedRate < 25.0) {
            $trimmedAnalysis = "Akurasi tinggi: Nilai wasit hampir selalu berada dalam rentang skor tengah yang diakui dan jarang terbuang sebagai outlier ({$trimmedRate}% terbuang).";
        } elseif ($trimmedRate < 40.0) {
            $trimmedAnalysis = "Tingkat skor terbuang ({$trimmedRate}%) berada dalam batas toleransi wajar sistem Trimmed Mean 5 juri PB Perkemi.";
        } else {
            $trimmedAnalysis = "Peringatan Outlier: Sebesar {$trimmedRate}% nilai wasit terbuang karena terlalu tinggi atau terlalu rendah dibandingkan 4 juri sejawat pada tatami yang sama.";
        }

        // 3. Regional Bias
        if ($sameOriginCount === 0) {
            $regionalBias = "Netral: Wasit tidak pernah bertugas menilai kontingen yang memiliki kesamaan asal kedaerahan ({$referee->region}).";
        } elseif ($regionalDelta < 1.5) {
            $regionalBias = "Objektif: Wasit dinilai tidak memihak. Deviasi skor terhadap kontingen daerah asal ({$referee->region}) sebesar {$regionalDelta} poin berada dalam batas wajar panel.";
        } elseif ($regionalDelta < 3.0) {
            $regionalBias = "Kecenderungan Moderat: Terdeteksi deviasi +{$regionalDelta} poin lebih tinggi saat menilai kontingen daerah asal ({$referee->region}), namun masih dalam batas supervisi.";
        } else {
            $regionalBias = "Indikasi Bias Kedaerahan: Ditemukan kecenderungan pemberian skor +{$regionalDelta} poin lebih tinggi kepada kontingen daerah asal ({$referee->region}) dibandingkan rata-rata 4 juri lainnya.";
        }

        // 4. Recommendation
        if ($status === 'normal') {
            $headline = 'Penilaian Objektif & Sangat Konsisten';
            $recommendation = 'Direkomendasikan memimpin partai krusial babak perempat final, semifinal, dan grand final.';
        } elseif ($status === 'warning') {
            $headline = 'Penilaian Memerlukan Pemantauan';
            $recommendation = 'Dapat ditugaskan pada babak penyisihan dengan supervisi Wasit Utama (Chief Judge). Perhatikan konsistensi rentang nilai.';
        } else {
            $headline = 'Perlu Evaluasi Dewan Arbitrase';
            $recommendation = "Disarankan rotasi court tatami dan pembatasan penugasan pada nomor tanding yang melibatkan kontingen daerah asal ({$referee->region}).";
        }

        return [
            'headline' => $headline,
            'consistency' => $consistency,
            'trimmed_analysis' => $trimmedAnalysis,
            'regional_bias' => $regionalBias,
            'recommendation' => $recommendation,
        ];
    }
}
