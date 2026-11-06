<?php

namespace App\Services\Tournament;

use App\Models\Athlete;
use App\Models\TournamentMatch;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class TournamentScheduleConflictDetector
{
    /**
     * Maximum start difference in minutes on the same date to consider as "tight" (jeda mepet / butuh space).
     */
    public const TIGHT_GAP_MINUTES = 30;

    /**
     * Analyze a collection of matches, detect athlete clashes (exact overlap & tight gap),
     * and annotate each match with athlete/contingent details and clash metadata.
     *
     * @param  Collection<int, TournamentMatch>  $matches
     * @return array{matches: Collection<int, array<string, mixed>>, summary: array<string, int|bool>}
     */
    public function detectAndAnnotate(Collection $matches): array
    {
        // 1. Collect all athlete IDs across all matches to pre-fetch any missing names in a single batch query
        $allAthleteIds = [];
        foreach ($matches as $match) {
            $meta = is_array($match->metadata) ? $match->metadata : [];
            if (! empty($meta['placeholder'])) {
                continue;
            }
            $ids = $this->extractAthleteIdsFromMatch($match);
            foreach ($ids as $id) {
                $allAthleteIds[] = $id;
            }
        }
        $allAthleteIds = array_values(array_unique(array_filter($allAthleteIds)));

        $athletesMap = ! empty($allAthleteIds)
            ? Athlete::whereIn('id', $allAthleteIds)
                ->with('contingent:id,name')
                ->get(['id', 'name', 'contingent_id'])
                ->keyBy('id')
            : collect();

        // 2. Extract match details
        $extracted = $matches->map(function (TournamentMatch $match) use ($athletesMap) {
            return $this->extractMatchDetails($match, $athletesMap);
        });

        // 3. Index by athlete identifier for clash detection (only for real assigned participants, not placeholder seeds)
        $athleteIndex = [];
        foreach ($extracted as $item) {
            if ($item['is_placeholder'] || ! $item['scheduled_start_raw'] || ! $item['scheduled_end_raw']) {
                continue;
            }

            $identifiers = [];
            foreach ($item['athlete_ids'] as $id) {
                $identifiers[] = 'id:'.$id;
            }
            foreach ($item['athlete_names_raw'] as $rawName) {
                $norm = $this->normalizeName($rawName);
                if ($norm !== '') {
                    $identifiers[] = 'name:'.$norm;
                }
            }
            $identifiers = array_values(array_unique($identifiers));

            foreach ($identifiers as $ident) {
                $athleteIndex[$ident][] = $item;
            }
        }

        // 4. Detect clashes
        $clashesByMatchId = [];
        foreach ($athleteIndex as $ident => $matchList) {
            $count = count($matchList);
            if ($count < 2) {
                continue;
            }

            for ($i = 0; $i < $count; $i++) {
                for ($j = $i + 1; $j < $count; $j++) {
                    $m1 = $matchList[$i];
                    $m2 = $matchList[$j];

                    if ($m1['id'] === $m2['id']) {
                        continue;
                    }

                    $start1 = $m1['scheduled_start_raw'];
                    $end1 = $m1['scheduled_end_raw'];
                    $start2 = $m2['scheduled_start_raw'];
                    $end2 = $m2['scheduled_end_raw'];

                    if (! $start1 || ! $end1 || ! $start2 || ! $end2) {
                        continue;
                    }

                    $sameDay = $start1->format('Y-m-d') === $start2->format('Y-m-d');
                    if (! $sameDay) {
                        continue;
                    }

                    // Identify common athlete name for display
                    $commonAthlete = $this->resolveCommonAthleteName($m1, $m2);

                    // Check exact overlap (waktu bertanding sama / tumpang tindih)
                    $isExactOverlap = $start1 < $end2 && $start2 < $end1;

                    if ($isExactOverlap) {
                        $this->registerClash($clashesByMatchId, $m1, $m2, 'exact', $commonAthlete, 0);
                        $this->registerClash($clashesByMatchId, $m2, $m1, 'exact', $commonAthlete, 0);
                    } else {
                        // Check tight gap: actual rest between the end of earlier match and start of later match is < 15 mins
                        $earlierEnd = $start1 < $start2 ? $end1 : $end2;
                        $laterStart = $start1 < $start2 ? $start2 : $start1;
                        $actualRestMinutes = abs($laterStart->diffInMinutes($earlierEnd));

                        if ($actualRestMinutes < 15) {
                            $this->registerClash($clashesByMatchId, $m1, $m2, 'tight', $commonAthlete, $actualRestMinutes);
                            $this->registerClash($clashesByMatchId, $m2, $m1, 'tight', $commonAthlete, $actualRestMinutes);
                        }
                    }
                }
            }
        }

        // 5. Attach clash info and format output
        $exactCount = 0;
        $tightCount = 0;

        $annotatedMatches = $extracted->map(function ($item) use ($clashesByMatchId, &$exactCount, &$tightCount) {
            $matchId = $item['id'];
            $clashes = $clashesByMatchId[$matchId] ?? [];

            $hasExact = collect($clashes)->contains('type', 'exact');
            $hasTight = collect($clashes)->contains('type', 'tight');

            $clashType = 'none';
            if ($hasExact) {
                $clashType = 'exact';
                $exactCount++;
            } elseif ($hasTight) {
                $clashType = 'tight';
                $tightCount++;
            }

            // Deduplicate clashes by other_match_id
            $uniqueClashes = collect($clashes)->unique('other_match_id')->values()->all();

            $clashSummary = null;
            $clashBadgeText = null;

            if ($clashType === 'exact') {
                $first = $uniqueClashes[0] ?? null;
                $clashSummary = $first
                    ? "Bentrok jam sama dengan Partai #{$first['other_sequence']} di {$first['other_court']} ({$first['other_time']})"
                    : 'Bentrok waktu sama dengan partai lain';
                $clashBadgeText = $first ? "Bentrok Partai #{$first['other_sequence']}" : 'Bentrok Waktu';
            } elseif ($clashType === 'tight') {
                $first = $uniqueClashes[0] ?? null;
                $clashSummary = $first
                    ? "Jeda mepet ({$first['gap_minutes']} mnt) dengan Partai #{$first['other_sequence']} di {$first['other_court']} ({$first['other_time']}) — Butuh space"
                    : 'Jeda waktu mepet — butuh space waktu';
                $clashBadgeText = $first ? "Jeda Mepet ({$first['gap_minutes']} mnt)" : 'Jeda Mepet';
            }

            $item['clash_type'] = $clashType;
            $item['clashes'] = $uniqueClashes;
            $item['clash_summary'] = $clashSummary;
            $item['clash_badge_text'] = $clashBadgeText;

            // Remove internal raw Carbon objects from payload
            unset($item['scheduled_start_raw'], $item['scheduled_end_raw'], $item['athlete_names_raw']);

            return $item;
        });

        $summary = [
            'total_scheduled' => $matches->count(),
            'exact_clashes_count' => $exactCount,
            'tight_clashes_count' => $tightCount,
            'has_clashes' => ($exactCount > 0 || $tightCount > 0),
        ];

        return [
            'matches' => $annotatedMatches,
            'summary' => $summary,
        ];
    }

    /**
     * Extract athlete IDs from match.
     *
     * @return list<string>
     */
    protected function extractAthleteIdsFromMatch(TournamentMatch $match): array
    {
        $meta = is_array($match->metadata) ? $match->metadata : [];
        $athleteIds = $meta['athlete_ids'] ?? [];

        if (! empty($meta['red']['athlete_ids']) && is_array($meta['red']['athlete_ids'])) {
            $athleteIds = array_merge($athleteIds, $meta['red']['athlete_ids']);
        }
        if (! empty($meta['blue']['athlete_ids']) && is_array($meta['blue']['athlete_ids'])) {
            $athleteIds = array_merge($athleteIds, $meta['blue']['athlete_ids']);
        }
        if ($match->participantEntry?->athlete_id) {
            $athleteIds[] = $match->participantEntry->athlete_id;
        }
        if ($match->redEntry?->athlete_id) {
            $athleteIds[] = $match->redEntry->athlete_id;
        }
        if ($match->blueEntry?->athlete_id) {
            $athleteIds[] = $match->blueEntry->athlete_id;
        }

        return array_values(array_unique(array_filter($athleteIds)));
    }

    /**
     * Extract full athlete, contingent, and time details from a TournamentMatch.
     *
     * @param  Collection<string, Athlete>  $athletesMap
     * @return array<string, mixed>
     */
    protected function extractMatchDetails(TournamentMatch $match, Collection $athletesMap): array
    {
        $meta = is_array($match->metadata) ? $match->metadata : [];
        $categoryType = $match->matchCategory?->type ?? 'randori';
        $isPlaceholder = ! empty($meta['placeholder']);

        // 1. Athlete IDs
        $athleteIds = $this->extractAthleteIdsFromMatch($match);

        // 2. Athlete Names & Contingents
        $athleteNames = [];
        $contingentName = null;
        $redAthlete = null;
        $blueAthlete = null;
        $redContingent = null;
        $blueContingent = null;

        if ($categoryType === 'embu') {
            $contingentName = $meta['contingent_name']
                ?? $meta['city']
                ?? $match->participantEntry?->athlete?->contingent?->name
                ?? null;

            if (! empty($meta['members']) && is_array($meta['members'])) {
                foreach ($meta['members'] as $member) {
                    if (is_string($member) && trim($member) !== '') {
                        $athleteNames[] = $this->cleanAthleteName($member);
                    }
                }
            } elseif ($match->participantEntry?->athlete?->name) {
                $athleteNames[] = $match->participantEntry->athlete->name;
            } elseif (! $isPlaceholder && ! empty($athleteIds)) {
                foreach ($athleteIds as $id) {
                    if ($a = $athletesMap->get($id)) {
                        $athleteNames[] = $a->name;
                        if (! $contingentName && $a->contingent?->name) {
                            $contingentName = $a->contingent->name;
                        }
                    }
                }
            }
        } else {
            // Randori
            $redAthlete = $match->redEntry?->athlete?->name
                ?? $meta['red']['label']
                ?? (! str_starts_with(strtolower((string) $match->red_label), 'pemenang') && strtolower((string) $match->red_label) !== 'bye' ? $match->red_label : null);

            $blueAthlete = $match->blueEntry?->athlete?->name
                ?? $meta['blue']['label']
                ?? (! str_starts_with(strtolower((string) $match->blue_label), 'pemenang') && strtolower((string) $match->blue_label) !== 'bye' ? $match->blue_label : null);

            $redContingent = $meta['red']['contingent_name']
                ?? $meta['red']['city']
                ?? $match->redEntry?->athlete?->contingent?->name
                ?? null;

            $blueContingent = $meta['blue']['contingent_name']
                ?? $meta['blue']['city']
                ?? $match->blueEntry?->athlete?->contingent?->name
                ?? null;

            // Fallback from athletesMap if not resolved
            if (! $redAthlete && ! empty($meta['red']['athlete_ids'][0])) {
                $a = $athletesMap->get($meta['red']['athlete_ids'][0]);
                if ($a) {
                    $redAthlete = $a->name;
                    $redContingent = $redContingent ?: $a->contingent?->name;
                }
            }
            if (! $blueAthlete && ! empty($meta['blue']['athlete_ids'][0])) {
                $a = $athletesMap->get($meta['blue']['athlete_ids'][0]);
                if ($a) {
                    $blueAthlete = $a->name;
                    $blueContingent = $blueContingent ?: $a->contingent?->name;
                }
            }

            if ($redAthlete) {
                $athleteNames[] = $this->cleanAthleteName($redAthlete);
            }
            if ($blueAthlete) {
                $athleteNames[] = $this->cleanAthleteName($blueAthlete);
            }

            $contingentName = $redContingent ?: $blueContingent;
        }

        $athleteNames = array_values(array_unique(array_filter($athleteNames)));
        $athleteNamesDisplay = ! empty($athleteNames) ? implode(' & ', $athleteNames) : null;

        $participant = $match->participant_label
            ?: implode(' vs ', array_filter([$match->red_label, $match->blue_label]));

        return [
            'id' => $match->id,
            'category_id' => $match->event_match_category_id,
            'category_name' => $match->matchCategory?->name,
            'category_type' => $categoryType,
            'court_id' => $match->event_court_id,
            'court' => $match->court?->name,
            'session_id' => $match->rundown_id,
            'session' => $match->rundown?->name,
            'phase' => $match->phase,
            'round_label' => $match->round_label,
            'sequence' => $match->match_sequence,
            'participant' => $participant,
            'participant_label' => $match->participant_label,
            'status' => $match->status,
            'is_bye' => (bool) $match->is_bye,
            'is_placeholder' => $isPlaceholder,
            'scheduled_start_raw' => $match->scheduled_start_at,
            'scheduled_end_raw' => $match->scheduled_end_at,
            'scheduled_date' => $match->scheduled_start_at?->format('Y-m-d'),
            'scheduled_date_formatted' => $match->scheduled_start_at?->translatedFormat('d M Y'),
            'scheduled_start' => $match->scheduled_start_at?->format('H:i'),
            'scheduled_start_formatted' => $match->scheduled_start_at?->format('H:i'),
            'scheduled_start_input' => $match->scheduled_start_at?->format('H:i'),
            'scheduled_end' => $match->scheduled_end_at?->format('H:i'),
            'scheduled_end_formatted' => $match->scheduled_end_at?->format('H:i'),

            // Athletes & Contingents
            'athlete_ids' => $athleteIds,
            'athlete_names' => $athleteNames,
            'athlete_names_raw' => $athleteNames,
            'athlete_name' => $athleteNamesDisplay,
            'contingent_name' => $contingentName,
            'red_athlete' => $redAthlete ? $this->cleanAthleteName($redAthlete) : null,
            'blue_athlete' => $blueAthlete ? $this->cleanAthleteName($blueAthlete) : null,
            'red_contingent' => $redContingent,
            'blue_contingent' => $blueContingent,
            'red_label' => $match->red_label,
            'blue_label' => $match->blue_label,
            'aka_label' => $match->red_label,
            'shiro_label' => $match->blue_label,
            'aka_contingent' => $redContingent,
            'shiro_contingent' => $blueContingent,
        ];
    }

    /**
     * Clean athlete name by removing parenthetical city/contingent suffixes like '(Kota Malang)'.
     */
    protected function cleanAthleteName(string $name): string
    {
        $clean = preg_replace('/\s*\([^)]*\)\s*$/', '', trim($name));

        return trim((string) $clean) ?: trim($name);
    }

    /**
     * Normalize name for matching.
     */
    protected function normalizeName(string $name): string
    {
        $clean = $this->cleanAthleteName($name);

        return Str::lower(preg_replace('/[^a-zA-Z0-9]/', '', $clean));
    }

    /**
     * Resolve a common athlete name between two matches.
     */
    protected function resolveCommonAthleteName(array $m1, array $m2): string
    {
        $names1 = $m1['athlete_names'] ?? [];
        $names2 = $m2['athlete_names'] ?? [];

        foreach ($names1 as $n1) {
            foreach ($names2 as $n2) {
                if ($this->normalizeName($n1) === $this->normalizeName($n2)) {
                    return $n1;
                }
            }
        }

        return $names1[0] ?? $names2[0] ?? 'Atlet';
    }

    /**
     * Register a clash item into the lookup map.
     */
    protected function registerClash(
        array &$clashesMap,
        array $current,
        array $other,
        string $type,
        string $athleteName,
        float|int $gapMinutes
    ): void {
        $message = $type === 'exact'
            ? "Bentrok Waktu Sama: {$athleteName} bertanding bersamaan di {$other['court']} (Partai #{$other['sequence']}, {$other['scheduled_start']})"
            : "Jeda Mepet ({$gapMinutes} mnt): {$athleteName} bertanding di {$other['court']} (Partai #{$other['sequence']}, {$other['scheduled_start']}) — butuh space waktu";

        $clashesMap[$current['id']][] = [
            'type' => $type,
            'athlete_name' => $athleteName,
            'other_match_id' => $other['id'],
            'other_sequence' => $other['sequence'],
            'other_category' => $other['category_name'],
            'other_court' => $other['court'] ?: 'Court',
            'other_time' => $other['scheduled_start'],
            'gap_minutes' => (int) $gapMinutes,
            'message' => $message,
        ];
    }
}
