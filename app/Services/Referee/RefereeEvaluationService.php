<?php

namespace App\Services\Referee;

use App\Models\Contingent;
use App\Models\EmbuJudgeScore;
use App\Models\Event;
use App\Models\Referee;
use App\Models\TournamentMatch;
use App\Services\EmbuParticipantDetails;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
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
     *     ranking: array<string, mixed>,
     *     score_distribution: list<array<string, mixed>>,
     *     contingent_analysis: list<array<string, mixed>>,
     *     arbitration_recommendations: array<string, mixed>,
     *     heatmap: array<string, mixed>,
     *     certification_options: list<string>
     * }
     */
    public function evaluate(Event $event, array $filters = []): array
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $certificationFilter = trim((string) ($filters['certification'] ?? ''));
        $statusFilter = trim((string) ($filters['status'] ?? 'all'));

        $cacheVersion = $this->resolveCacheVersion($event);
        $cacheKey = "event:{$event->id}:referee_eval_base:{$cacheVersion}";

        $baseData = Cache::remember($cacheKey, 60, function () use ($event): array {
            return $this->computeBaseEvaluation($event);
        });

        $filteredReferees = $this->applyFilters(
            $baseData['referees'],
            $search,
            $certificationFilter,
            $statusFilter,
        );

        return [
            'summary' => $baseData['summary'],
            'referees' => $filteredReferees,
            'ranking' => $baseData['ranking'],
            'score_distribution' => $baseData['score_distribution'],
            'contingent_analysis' => $baseData['contingent_analysis'],
            'arbitration_recommendations' => $baseData['arbitration_recommendations'],
            'heatmap' => $baseData['heatmap'],
            'certification_options' => $baseData['certification_options'],
        ];
    }

    /**
     * Generate cache invalidation fingerprint based on score count, referee count, and timestamp.
     */
    private function resolveCacheVersion(Event $event): string
    {
        $latestScore = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->where('status', 'submitted')
            ->max('updated_at');

        $scoreCount = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->where('status', 'submitted')
            ->count();

        $assignedCount = $event->referees()->count();

        return md5("{$event->id}_{$event->updated_at?->timestamp}_{$scoreCount}_{$latestScore}_{$assignedCount}");
    }

    /**
     * Compute base evaluation metrics across all referees in the event.
     *
     * @return array{
     *     summary: array<string, mixed>,
     *     referees: list<array<string, mixed>>,
     *     heatmap: array<string, mixed>,
     *     certification_options: list<string>
     * }
     */
    private function computeBaseEvaluation(Event $event): array
    {
        // 1. Load referee IDs
        $assignedRefereeIds = $event->referees()->pluck('referees.id');
        $scoringRefereeIds = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->where('status', 'submitted')
            ->distinct()
            ->pluck('referee_id');

        $allRefereeIds = $assignedRefereeIds->merge($scoringRefereeIds)->filter()->unique()->values();

        $referees = Referee::query()
            ->whereIn('id', $allRefereeIds)
            ->select(['id', 'name', 'gender', 'region', 'certification_level', 'dan_grade', 'license_number', 'is_active'])
            ->orderBy('name')
            ->get();

        // 2. Preload matches and relationships with eager loading
        $matches = TournamentMatch::query()
            ->whereBelongsTo($event)
            ->whereHas('matchCategory', fn ($q) => $q->where('type', 'embu'))
            ->select([
                'id',
                'event_id',
                'event_court_id',
                'event_match_category_id',
                'match_sequence',
                'round_label',
                'participant_label',
                'participant_entry_id',
                'metadata',
            ])
            ->with([
                'matchCategory:id,name,type',
                'court:id,name',
                'participantEntry.athlete.contingent:id,name,city',
            ])
            ->get()
            ->keyBy('id');

        // Batch load any contingent IDs found solely in match metadata
        $missingContingentIds = $matches
            ->filter(fn (TournamentMatch $m): bool => ! $m->participantEntry?->athlete?->contingent)
            ->map(fn (TournamentMatch $m) => data_get($m->metadata, 'contingent_id'))
            ->filter()
            ->unique()
            ->values();

        $extraContingents = $missingContingentIds->isNotEmpty()
            ? Contingent::query()->whereIn('id', $missingContingentIds)->get(['id', 'name', 'city'])->keyBy('id')
            : collect();

        // 3. Load submitted judge scores
        $judgeScores = EmbuJudgeScore::query()
            ->whereBelongsTo($event)
            ->where('status', 'submitted')
            ->select(['id', 'event_id', 'tournament_match_id', 'referee_id', 'total_score'])
            ->get();

        // 4. Precompute per-match statistics in O(M)
        $scoresByMatch = $judgeScores->groupBy('tournament_match_id');
        $matchStats = [];
        $contingentCities = collect();

        foreach ($matches as $match) {
            $mScores = $scoresByMatch->get($match->id, collect());
            $allVals = $mScores->pluck('total_score')->map(fn ($v): float => (float) $v);
            $count = $allVals->count();

            $contingent = $match->participantEntry?->athlete?->contingent
                ?? ($match->metadata && isset($extraContingents[data_get($match->metadata, 'contingent_id')])
                    ? $extraContingents[data_get($match->metadata, 'contingent_id')]
                    : null);

            $contingentName = $contingent?->name
                ?? data_get($match->metadata, 'contingent_name')
                ?? 'Kontingen';

            $contingentCity = $contingent?->city
                ?? data_get($match->metadata, 'city')
                ?? data_get($match->metadata, 'contingent_city')
                ?? $contingentName;

            if ($contingentCity) {
                $contingentCities->push($contingentCity);
            }

            $matchStats[$match->id] = [
                'match' => $match,
                'contingent_name' => $contingentName,
                'contingent_city' => $contingentCity,
                'score_count' => $count,
                'min_score' => $count >= 3 ? $allVals->min() : null,
                'max_score' => $count >= 3 ? $allVals->max() : null,
                'sum_score' => (float) $allVals->sum(),
            ];
        }

        // 5. Invert score lookup: group submitted scores by referee
        $scoresByReferee = $judgeScores->groupBy('referee_id');
        $evaluations = [];
        $certificationSet = collect();
        $regionalMatrix = [];

        foreach ($referees as $referee) {
            $certification = trim((string) ($referee->certification_level ?: 'Wasit Daerah'));
            $certificationSet->push($certification);

            $refereeScores = collect();
            $matchesJudged = [];
            $trimmedCount = 0;
            $sameRegionScores = [];
            $sameRegionPeerScores = [];
            $otherRegionScores = [];

            $refScores = $scoresByReferee->get($referee->id, collect());

            foreach ($refScores as $scoreRecord) {
                $matchStat = $matchStats[$scoreRecord->tournament_match_id] ?? null;
                if (! $matchStat) {
                    continue;
                }

                /** @var TournamentMatch $match */
                $match = $matchStat['match'];
                $scoreVal = (float) $scoreRecord->total_score;
                $refereeScores->push($scoreVal);

                $mCount = $matchStat['score_count'];
                $isTrimmed = false;
                if ($mCount >= 3) {
                    if ($scoreVal === $matchStat['min_score'] || $scoreVal === $matchStat['max_score']) {
                        $isTrimmed = true;
                        $trimmedCount++;
                    }
                }

                $peerAvgUnrounded = $mCount > 1
                    ? ($matchStat['sum_score'] - $scoreVal) / ($mCount - 1)
                    : $scoreVal;
                $peerAvg = round($peerAvgUnrounded, 2);
                $peerDev = $mCount > 1
                    ? round($scoreVal - $peerAvgUnrounded, 2)
                    : 0.0;

                $contingentName = $matchStat['contingent_name'];
                $contingentCity = $matchStat['contingent_city'];

                $isSameRegion = $this->isSameOrigin($referee->region, $contingentCity, $contingentName);
                if ($isSameRegion) {
                    $sameRegionScores[] = $scoreVal;
                    if ($mCount > 1) {
                        $sameRegionPeerScores[] = $peerAvgUnrounded;
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
                    'participant' => $contingentName ?: $match->participant_label,
                    'contingent_city' => $contingentCity,
                    'score' => $scoreVal,
                    'peer_average' => $peerAvg,
                    'peer_deviation' => $peerDev,
                    'is_trimmed' => $isTrimmed,
                    'is_same_region' => $isSameRegion,
                ];

                // Heatmap data collection: Referee -> Contingent City
                $cityKey = $contingentCity ?: 'Lainnya';
                $regionalMatrix[$referee->id][$cityKey][] = [
                    'referee_score' => $scoreVal,
                    'peer_avg' => $peerAvgUnrounded,
                    'deviation' => $peerDev,
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
            $hasPeerComparison = count($sameRegionPeerScores) > 0;
            $sameOriginAvg = $sameOriginCount > 0 ? round(array_sum($sameRegionScores) / $sameOriginCount, 2) : 0.0;
            $sameOriginPeerAvg = $hasPeerComparison ? round(array_sum($sameRegionPeerScores) / count($sameRegionPeerScores), 2) : 0.0;
            $regionalDelta = ($sameOriginCount > 0 && $hasPeerComparison) ? round($sameOriginAvg - $sameOriginPeerAvg, 2) : 0.0;

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

            if ($sameOriginCount > 0 && $hasPeerComparison && $regionalDelta >= 3.0) {
                $flags[] = [
                    'code' => 'regional_bias',
                    'severity' => 'critical',
                    'label' => "Indikasi Bias Kedaerahan (+{$regionalDelta})",
                    'description' => "Wasit memberikan rata-rata +{$regionalDelta} poin lebih tinggi untuk kontingen daerah asal ({$referee->region}) dibandingkan rata-rata juri lainnya.",
                ];
            } elseif ($sameOriginCount > 0 && $hasPeerComparison && $regionalDelta >= 1.5) {
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

            // Calculate Quality & Objectivity Index (0 - 100)
            if ($count > 0) {
                $agreementScore = max(0.0, min(100.0, 100.0 - ($trimmedRate * 1.25)));
                $neutralityScore = ($sameOriginCount > 0 && $hasPeerComparison)
                    ? max(0.0, min(100.0, 100.0 - (abs($regionalDelta) * 20.0)))
                    : 100.0;
                $consistencyScore = $count > 1
                    ? max(0.0, min(100.0, 100.0 - ($stdDev * 10.0)))
                    : 85.0;
                $participationFactor = min(1.0, 0.70 + ($count * 0.06));
                $rawIndex = (($agreementScore * 0.40) + ($neutralityScore * 0.35) + ($consistencyScore * 0.25)) * $participationFactor;

                if ($hasCritical) {
                    $rawIndex = min($rawIndex, 64.9);
                } elseif ($hasWarning) {
                    $rawIndex = min($rawIndex, 79.9);
                }

                $qualityIndex = round($rawIndex, 1);
            } else {
                $qualityIndex = 0.0;
            }

            $grade = match (true) {
                $count === 0 => ['code' => '-', 'label' => 'Belum Bertugas', 'tone' => 'slate'],
                $qualityIndex >= 90.0 => ['code' => 'A+', 'label' => 'Wasit Sangat Objektif & Teladan', 'tone' => 'emerald'],
                $qualityIndex >= 80.0 => ['code' => 'A', 'label' => 'Wasit Objektif & Konsisten', 'tone' => 'blue'],
                $qualityIndex >= 70.0 => ['code' => 'B', 'label' => 'Wasit Cukup Objektif', 'tone' => 'amber'],
                $qualityIndex >= 60.0 => ['code' => 'C', 'label' => 'Perlu Pemantauan Arbitrase', 'tone' => 'amber'],
                default => ['code' => 'D', 'label' => 'Anomali / Perlu Rotasi', 'tone' => 'rose'],
            };

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
                hasPeerComparison: $hasPeerComparison,
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
                'has_peer_comparison' => $hasPeerComparison,
                'quality_index' => $qualityIndex,
                'grade' => $grade['code'],
                'grade_label' => $grade['label'],
                'grade_tone' => $grade['tone'],
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

        // Rank referees by quality index descending
        $activeJudges = collect($evaluations)
            ->filter(fn ($r) => $r['matches_judged_count'] > 0)
            ->sortBy([
                ['quality_index', 'desc'],
                ['matches_judged_count', 'desc'],
                ['std_dev', 'asc'],
            ])
            ->values();

        $inactiveJudges = collect($evaluations)
            ->filter(fn ($r) => $r['matches_judged_count'] === 0)
            ->sortBy('name')
            ->values();

        $rankedReferees = [];
        $rankCounter = 1;
        foreach ($activeJudges as $ref) {
            $ref['rank'] = $rankCounter;
            $ref['rank_badge'] = match ($rankCounter) {
                1 => 'gold',
                2 => 'silver',
                3 => 'bronze',
                default => null,
            };
            $ref['rank_label'] = match ($rankCounter) {
                1 => 'Juara 1 — Wasit Terbaik',
                2 => 'Juara 2 — Wasit Terbaik',
                3 => 'Juara 3 — Wasit Terbaik',
                default => "Peringkat #{$rankCounter}",
            };
            $rankedReferees[] = $ref;
            $rankCounter++;
        }

        foreach ($inactiveJudges as $ref) {
            $ref['rank'] = null;
            $ref['rank_badge'] = null;
            $ref['rank_label'] = 'Belum Bertugas';
            $rankedReferees[] = $ref;
        }

        $evaluations = $rankedReferees;

        // Compute aggregate metrics
        $allEvaluatedReferees = collect($evaluations)->filter(fn ($r): bool => $r['matches_judged_count'] > 0);
        $totalActiveJudges = $allEvaluatedReferees->count();
        $overallAvgScore = $totalActiveJudges > 0 ? round((float) $allEvaluatedReferees->avg('average_score'), 2) : 0.0;
        $overallAvgStdDev = $totalActiveJudges > 0 ? round((float) $allEvaluatedReferees->avg('std_dev'), 2) : 0.0;
        $totalFlagged = collect($evaluations)->where('status', 'flagged')->count();
        $totalWarning = collect($evaluations)->where('status', 'warning')->count();
        $totalNormal = collect($evaluations)->where('status', 'normal')->count();
        $objectivityRate = count($evaluations) > 0 ? round(($totalNormal / count($evaluations)) * 100, 1) : 100.0;

        $podium = collect($rankedReferees)->filter(fn ($referee): bool => $referee['rank'] === 1)->values()->all();
        $leaderboard = collect($rankedReferees)->filter(fn ($r) => $r['rank'] !== null)->values()->all();
        $topReferee = $podium[0] ?? null;

        // Score Distribution Analysis (Histogram)
        $allSubmittedValues = $judgeScores->pluck('total_score')->map(fn ($v): float => (float) $v);
        $maxRecordedScore = (float) ($allSubmittedValues->max() ?? 0.0);
        $isHundredScale = $maxRecordedScore <= 120.0;

        $scoreBuckets = $isHundredScale ? [
            ['key' => 'tier_1', 'label' => '< 94.0', 'min' => 0.0, 'max' => 93.99, 'color' => '#64748b'],
            ['key' => 'tier_2', 'label' => '94.0 – 95.9', 'min' => 94.0, 'max' => 95.99, 'color' => '#3b82f6'],
            ['key' => 'tier_3', 'label' => '96.0 – 97.4', 'min' => 96.0, 'max' => 97.49, 'color' => '#06b6d4'],
            ['key' => 'tier_4', 'label' => '97.5 – 98.9', 'min' => 97.5, 'max' => 98.99, 'color' => '#10b981'],
            ['key' => 'tier_5', 'label' => '99.0 – 99.9', 'min' => 99.0, 'max' => 99.99, 'color' => '#f59e0b'],
            ['key' => 'tier_6', 'label' => '100.0', 'min' => 100.0, 'max' => 999.0, 'color' => '#d4a843'],
        ] : [
            ['key' => 'tier_1', 'label' => '< 250', 'min' => 0.0, 'max' => 249.99, 'color' => '#64748b'],
            ['key' => 'tier_2', 'label' => '250 – 259', 'min' => 250.0, 'max' => 259.99, 'color' => '#3b82f6'],
            ['key' => 'tier_3', 'label' => '260 – 269', 'min' => 260.0, 'max' => 269.99, 'color' => '#06b6d4'],
            ['key' => 'tier_4', 'label' => '270 – 279', 'min' => 270.0, 'max' => 279.99, 'color' => '#10b981'],
            ['key' => 'tier_5', 'label' => '280 – 289', 'min' => 280.0, 'max' => 289.99, 'color' => '#f59e0b'],
            ['key' => 'tier_6', 'label' => '≥ 290', 'min' => 290.0, 'max' => 999.0, 'color' => '#d4a843'],
        ];

        $totalSubmittedScores = $allSubmittedValues->count();
        $scoreDistribution = [];
        foreach ($scoreBuckets as $bucket) {
            $matchingCount = $allSubmittedValues->filter(fn (float $v): bool => $v >= $bucket['min'] && $v <= $bucket['max'])->count();
            $percentage = $totalSubmittedScores > 0 ? round(($matchingCount / $totalSubmittedScores) * 100, 1) : 0.0;
            $scoreDistribution[] = [
                'key' => $bucket['key'],
                'label' => $bucket['label'],
                'count' => $matchingCount,
                'percentage' => $percentage,
                'color' => $bucket['color'],
            ];
        }

        // Contingent Correlation & Anomaly Analysis
        $scoresByContingent = [];
        foreach ($matches as $match) {
            $mScores = $scoresByMatch->get($match->id, collect());
            if ($mScores->isEmpty()) {
                continue;
            }

            $stat = $matchStats[$match->id] ?? null;
            $cName = $stat['contingent_name'] ?? 'Kontingen';
            $cCity = $stat['contingent_city'] ?? $cName;
            $key = $cCity ?: $cName;

            if (! isset($scoresByContingent[$key])) {
                $scoresByContingent[$key] = [
                    'contingent_name' => $cName,
                    'contingent_city' => $cCity,
                    'matches_count' => 0,
                    'scores' => [],
                    'same_region_scores' => [],
                    'other_region_scores' => [],
                    'regional_referees' => [],
                ];
            }

            $scoresByContingent[$key]['matches_count']++;

            foreach ($mScores as $scoreRec) {
                $referee = $referees->firstWhere('id', $scoreRec->referee_id);
                $refRegion = $referee?->region;
                $scoreVal = (float) $scoreRec->total_score;
                $isSame = $this->isSameOrigin($refRegion, $cCity, $cName);

                $scoresByContingent[$key]['scores'][] = $scoreVal;
                if ($isSame) {
                    $scoresByContingent[$key]['same_region_scores'][] = $scoreVal;
                    if ($referee && ! in_array($referee->name, $scoresByContingent[$key]['regional_referees'], true)) {
                        $scoresByContingent[$key]['regional_referees'][] = $referee->name;
                    }
                } else {
                    $scoresByContingent[$key]['other_region_scores'][] = $scoreVal;
                }
            }
        }

        $contingentAnalysis = [];
        foreach ($scoresByContingent as $cData) {
            $totalCount = count($cData['scores']);
            $avgScore = $totalCount > 0 ? round(array_sum($cData['scores']) / $totalCount, 2) : 0.0;
            $sameCount = count($cData['same_region_scores']);
            $otherCount = count($cData['other_region_scores']);

            $sameAvg = $sameCount > 0 ? round(array_sum($cData['same_region_scores']) / $sameCount, 2) : 0.0;
            $otherAvg = $otherCount > 0 ? round(array_sum($cData['other_region_scores']) / $otherCount, 2) : 0.0;
            $delta = ($sameCount > 0 && $otherCount > 0) ? round($sameAvg - $otherAvg, 2) : 0.0;

            $status = match (true) {
                $sameCount > 0 && $otherCount > 0 && $delta >= 3.0 => 'anomali',
                $sameCount > 0 && $otherCount > 0 && $delta >= 1.5 => 'warning',
                $sameCount === 0 => 'neutral',
                default => 'normal',
            };

            $statusLabel = match ($status) {
                'anomali' => 'Indikasi Bias Kedaerahan (Δ ≥ +3.0)',
                'warning' => 'Perhatian Pengawas (Δ ≥ +1.5)',
                'neutral' => 'Bebas Konflik (Tanpa Juri Asal)',
                default => 'Objektif & Seimbang',
            };

            $recommendation = match ($status) {
                'anomali' => 'Disarankan rotasi juri asal daerah ini pada babak gugur dan final untuk menjamin netralitas.',
                'warning' => 'Pantau penugasan juri pada tatami yang melibatkan kontingen ini.',
                'neutral' => 'Penilaian sepenuhnya dinilai oleh juri independen lintas kontingen.',
                default => 'Korelasi penilaian juri daerah dan juri luar daerah selaras dan proporsional.',
            };

            $contingentAnalysis[] = [
                'contingent_name' => $cData['contingent_name'],
                'contingent_city' => $cData['contingent_city'],
                'matches_count' => $cData['matches_count'],
                'total_scores' => $totalCount,
                'average_score' => $avgScore,
                'regional_referees_count' => count($cData['regional_referees']),
                'regional_referees_names' => $cData['regional_referees'],
                'regional_scores_count' => $sameCount,
                'regional_avg_score' => $sameAvg,
                'other_avg_score' => $otherAvg,
                'regional_delta' => $delta,
                'status' => $status,
                'status_label' => $statusLabel,
                'recommendation' => $recommendation,
            ];
        }

        // Sort contingent analysis by delta descending
        usort($contingentAnalysis, fn ($a, $b) => $b['regional_delta'] <=> $a['regional_delta'] ?: $b['matches_count'] <=> $a['matches_count']);

        // Arbitration recommendations
        $finalCandidates = collect($rankedReferees)
            ->filter(fn ($r) => $r['rank'] !== null && $r['status'] === 'normal' && in_array($r['grade'], ['A+', 'A'], true))
            ->take(5)
            ->map(fn ($r) => [
                'id' => $r['id'],
                'name' => $r['name'],
                'rank' => $r['rank'],
                'grade' => $r['grade'],
                'grade_label' => $r['grade_label'],
                'quality_index' => $r['quality_index'],
                'region' => $r['region'],
                'certification_level' => $r['certification_level'],
                'matches_judged_count' => $r['matches_judged_count'],
            ])
            ->values()
            ->all();

        $supervisionList = collect($rankedReferees)
            ->filter(fn ($r) => in_array($r['status'], ['flagged', 'warning'], true))
            ->map(fn ($r) => [
                'id' => $r['id'],
                'name' => $r['name'],
                'status' => $r['status'],
                'status_label' => $r['status_label'],
                'flags' => $r['flags'],
                'region' => $r['region'],
                'action' => $r['narrative']['recommendation'] ?? 'Lakukan pengawasan ketat saat bertugas.',
            ])
            ->values()
            ->all();

        $contingentAlerts = collect($contingentAnalysis)
            ->filter(fn ($c) => in_array($c['status'], ['anomali', 'warning'], true))
            ->values()
            ->all();

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
                    $avgDev = round((float) collect($scoresInCity)->avg('deviation'), 2);
                    $avgScore = round((float) collect($scoresInCity)->avg('referee_score'), 2);
                    $isSame = collect($scoresInCity)->contains('is_same_origin', true);
                    $row['cells'][$city] = [
                        'count' => count($scoresInCity),
                        'avg_score' => $avgScore,
                        'deviation' => $avgDev,
                        'delta' => $avgDev,
                        'is_same_origin' => $isSame,
                        'bias_level' => $avgDev >= 3.0 ? 'danger' : ($avgDev >= 1.5 ? 'warning' : 'none'),
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
                'active_judged_referees' => $totalActiveJudges,
                'overall_average_score' => $overallAvgScore,
                'average_score' => $overallAvgScore,
                'overall_std_dev' => $overallAvgStdDev,
                'average_std_dev' => $overallAvgStdDev,
                'total_scores_recorded' => $judgeScores->count(),
                'flagged_count' => $totalFlagged,
                'warning_count' => $totalWarning,
                'needs_attention_count' => $totalWarning,
                'normal_count' => $totalNormal,
                'objectivity_rate' => $objectivityRate,
                'top_referee' => $topReferee ? [
                    'name' => $topReferee['name'],
                    'quality_index' => $topReferee['quality_index'],
                    'grade' => $topReferee['grade'],
                    'grade_label' => $topReferee['grade_label'],
                    'region' => $topReferee['region'],
                ] : null,
            ],
            'referees' => $evaluations,
            'ranking' => [
                'podium' => $podium,
                'leaderboard' => $leaderboard,
            ],
            'score_distribution' => $scoreDistribution,
            'contingent_analysis' => $contingentAnalysis,
            'arbitration_recommendations' => [
                'final_candidates' => $finalCandidates,
                'supervision_list' => $supervisionList,
                'contingent_alerts' => $contingentAlerts,
                'overall_statement' => $totalFlagged > 0
                    ? "Terdapat {$totalFlagged} wasit dengan anomali penilaian dan {$totalWarning} wasit dalam status pantauan yang memerlukan atensi Dewan Arbitrase."
                    : ($totalWarning > 0
                        ? "Penilaian wasit secara umum berjalan baik dengan {$totalWarning} wasit dalam pemantauan wajar."
                        : 'Seluruh wasit yang bertugas memiliki tingkat objektivitas dan konsistensi penilaian yang prima.'),
            ],
            'heatmap' => [
                'cities' => $uniqueCities,
                'contingent_cities' => $uniqueCities,
                'rows' => $heatmapMatrix,
            ],
            'certification_options' => $certificationSet->filter()->unique()->values()->all(),
        ];
    }

    /**
     * Apply search, certification, and status filters in memory on evaluated referee collection.
     *
     * @param  list<array<string, mixed>>  $evaluations
     * @return list<array<string, mixed>>
     */
    private function applyFilters(
        array $evaluations,
        string $search,
        string $certificationFilter,
        string $statusFilter,
    ): array {
        return collect($evaluations)
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

        $cleanRef = Str::lower((string) preg_replace('/(kabupaten|kab\.|kota|provinsi|prov\.|dojo)/i', '', $refereeRegion));
        $cleanCity = Str::lower((string) preg_replace('/(kabupaten|kab\.|kota|provinsi|prov\.|dojo)/i', '', (string) $contingentCity));
        $cleanName = Str::lower((string) preg_replace('/(kabupaten|kab\.|kota|provinsi|prov\.|dojo)/i', '', (string) $contingentName));

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
     * @return array{
     *     headline: string,
     *     consistency: string,
     *     trimmed_analysis: string,
     *     regional_bias: string,
     *     recommendation: string
     * }
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
        bool $hasPeerComparison = true,
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
        } elseif (! $hasPeerComparison) {
            $regionalBias = "Menilai kontingen asal ({$referee->region}), namun belum ada pembanding nilai juri lain pada partai tersebut.";
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
