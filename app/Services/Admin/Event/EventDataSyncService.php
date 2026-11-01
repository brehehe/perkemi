<?php

namespace App\Services\Admin\Event;

use App\Models\Event;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

class EventDataSyncService
{
    public const ExportFormat = 'smart_perkemi_event_package';

    public const Version = '2.0';

    /**
     * Export all data related to the event into a portable package array.
     *
     * @return array<string, mixed>
     */
    public function exportEvent(Event $event): array
    {
        $eventId = $event->id;

        // 1. Core Event & Config
        $eventData = DB::table('events')->where('id', $eventId)->first();
        $ageCategories = DB::table('event_age_categories')->where('event_id', $eventId)->get();
        $courts = DB::table('event_courts')->where('event_id', $eventId)->get();
        $matchCategories = DB::table('event_match_categories')->where('event_id', $eventId)->get();
        $rundowns = DB::table('rundowns')->where('event_id', $eventId)->get();

        // 2. Contingents & Athletes
        $contingents = DB::table('contingents')->where('event_id', $eventId)->get();
        $contingentIds = $contingents->pluck('id')->all();

        $officials = empty($contingentIds)
            ? collect()
            : DB::table('officials')->whereIn('contingent_id', $contingentIds)->get();

        $athletes = empty($contingentIds)
            ? collect()
            : DB::table('athletes')->whereIn('contingent_id', $contingentIds)->get();

        // 3. Registrations & Entries
        $registrations = DB::table('registrations')->where('event_id', $eventId)->get();
        $categoryEntries = DB::table('athlete_match_category_entries')->where('event_id', $eventId)->get();
        $embuTechniques = DB::table('embu_team_techniques')->where('event_id', $eventId)->get();
        $embuTechIds = $embuTechniques->pluck('technique_id')->filter()->unique()->all();
        $techniques = empty($embuTechIds)
            ? collect()
            : DB::table('techniques')->whereIn('id', $embuTechIds)->get();
        $drawings = DB::table('tournament_drawings')->where('event_id', $eventId)->get();

        // 4. Matches, Scores, and Results
        $matches = DB::table('tournament_matches')->where('event_id', $eventId)->get();
        $matchIds = $matches->pluck('id')->all();

        $embuScores = empty($matchIds)
            ? collect()
            : DB::table('embu_scores')->whereIn('tournament_match_id', $matchIds)->get();

        $embuJudgeScores = DB::table('embu_judge_scores')->where('event_id', $eventId)->get();

        $randoriScores = empty($matchIds)
            ? collect()
            : DB::table('randori_scores')
                ->where('event_id', $eventId)
                ->orWhereIn('tournament_match_id', $matchIds)
                ->get();

        $varReviews = empty($matchIds)
            ? collect()
            : DB::table('tournament_match_var_reviews')
                ->where('event_id', $eventId)
                ->orWhereIn('tournament_match_id', $matchIds)
                ->get();

        $tournamentResults = DB::table('tournament_results')->where('event_id', $eventId)->get();

        // 5. Staff, Assignments, Attendances
        $courtIds = $courts->pluck('id')->all();
        $courtAssignments = empty($courtIds)
            ? collect()
            : DB::table('event_court_assignments')->whereIn('event_court_id', $courtIds)->get();

        $refereeAttendances = DB::table('referee_attendances')->where('event_id', $eventId)->get();
        $refereeCourtAttendances = DB::table('referee_court_attendances')->where('event_id', $eventId)->get();
        $assignmentHistories = DB::table('referee_court_assignment_histories')->where('event_id', $eventId)->get();

        // Pivot tables & referenced staff records
        $eventRefereePivots = DB::table('event_referee')->where('event_id', $eventId)->get();
        $refereeIds = $eventRefereePivots->pluck('referee_id')->all();
        $referees = empty($refereeIds)
            ? collect()
            : DB::table('referees')->whereIn('id', $refereeIds)->get();

        $clerkPivots = DB::table('clerk_event')->where('event_id', $eventId)->get();
        $clerkIds = $clerkPivots->pluck('clerk_id')->all();
        $clerks = empty($clerkIds)
            ? collect()
            : DB::table('clerks')->whereIn('id', $clerkIds)->get();

        $coordPivots = DB::table('event_field_coordinator')->where('event_id', $eventId)->get();
        $coordIds = $coordPivots->pluck('field_coordinator_id')->all();
        $coordinators = empty($coordIds)
            ? collect()
            : DB::table('field_coordinators')->whereIn('id', $coordIds)->get();

        $paymentPivots = DB::table('event_payment_method')->where('event_id', $eventId)->get();
        $eventUsers = DB::table('event_user')->where('event_id', $eventId)->get();

        $exportData = [
            'event' => $eventData ? (array) $eventData : [],
            'event_age_categories' => $ageCategories->map(fn ($r) => (array) $r)->all(),
            'event_courts' => $courts->map(fn ($r) => (array) $r)->all(),
            'event_match_categories' => $matchCategories->map(fn ($r) => (array) $r)->all(),
            'rundowns' => $rundowns->map(fn ($r) => (array) $r)->all(),
            'contingents' => $contingents->map(fn ($r) => (array) $r)->all(),
            'officials' => $officials->map(fn ($r) => (array) $r)->all(),
            'athletes' => $athletes->map(fn ($r) => (array) $r)->all(),
            'registrations' => $registrations->map(fn ($r) => (array) $r)->all(),
            'athlete_match_category_entries' => $categoryEntries->map(fn ($r) => (array) $r)->all(),
            'embu_team_techniques' => $embuTechniques->map(fn ($r) => (array) $r)->all(),
            'tournament_drawings' => $drawings->map(fn ($r) => (array) $r)->all(),
            'tournament_matches' => $matches->map(fn ($r) => (array) $r)->all(),
            'embu_scores' => $embuScores->map(fn ($r) => (array) $r)->all(),
            'embu_judge_scores' => $embuJudgeScores->map(fn ($r) => (array) $r)->all(),
            'randori_scores' => $randoriScores->map(fn ($r) => (array) $r)->all(),
            'tournament_match_var_reviews' => $varReviews->map(fn ($r) => (array) $r)->all(),
            'tournament_results' => $tournamentResults->map(fn ($r) => (array) $r)->all(),
            'event_court_assignments' => $courtAssignments->map(fn ($r) => (array) $r)->all(),
            'referee_attendances' => $refereeAttendances->map(fn ($r) => (array) $r)->all(),
            'referee_court_attendances' => $refereeCourtAttendances->map(fn ($r) => (array) $r)->all(),
            'referee_court_assignment_histories' => $assignmentHistories->map(fn ($r) => (array) $r)->all(),
            'referees' => $referees->map(fn ($r) => (array) $r)->all(),
            'event_referee' => $eventRefereePivots->map(fn ($r) => (array) $r)->all(),
            'clerks' => $clerks->map(fn ($r) => (array) $r)->all(),
            'clerk_event' => $clerkPivots->map(fn ($r) => (array) $r)->all(),
            'field_coordinators' => $coordinators->map(fn ($r) => (array) $r)->all(),
            'event_field_coordinator' => $coordPivots->map(fn ($r) => (array) $r)->all(),
            'event_payment_method' => $paymentPivots->map(fn ($r) => (array) $r)->all(),
            'event_user' => $eventUsers->map(fn ($r) => (array) $r)->all(),
        ];

        $counts = [
            'courts' => count($exportData['event_courts']),
            'match_categories' => count($exportData['event_match_categories']),
            'age_categories' => count($exportData['event_age_categories']),
            'contingents' => count($exportData['contingents']),
            'athletes' => count($exportData['athletes']),
            'registrations' => count($exportData['registrations']),
            'matches' => count($exportData['tournament_matches']),
            'embu_scores' => count($exportData['embu_scores']),
            'embu_judge_scores' => count($exportData['embu_judge_scores']),
            'randori_scores' => count($exportData['randori_scores']),
            'tournament_results' => count($exportData['tournament_results']),
            'referees' => count($exportData['referees']),
        ];

        $payloadJson = json_encode($exportData, JSON_UNESCAPED_UNICODE);
        $checksum = hash('sha256', (string) $payloadJson);

        return [
            'format' => self::ExportFormat,
            'version' => self::Version,
            'exported_at' => now()->toIso8601String(),
            'event_id' => $event->id,
            'event_name' => $event->name,
            'event_slug' => $event->slug,
            'counts' => $counts,
            'checksum' => $checksum,
            'data' => $exportData,
        ];
    }

    /**
     * Import an exported event package and synchronize all relationships.
     *
     * @param  array<string, mixed>  $package
     * @return array<string, mixed>
     */
    public function importEvent(array $package): array
    {
        if (($package['format'] ?? null) !== self::ExportFormat) {
            throw new InvalidArgumentException('Format file tidak valid. Paket harus merupakan hasil ekspor Smart Perkemi Event.');
        }

        $data = $package['data'] ?? null;
        if (! is_array($data) || empty($data['event']['id'] ?? null)) {
            throw new InvalidArgumentException('Data event tidak ditemukan dalam file paket.');
        }

        $eventRow = $data['event'];
        $exportedEventId = $eventRow['id'];

        return DB::transaction(function () use ($data, $eventRow, $exportedEventId): array {
            // User existence cache to prevent repeated queries
            $userCache = [];
            $isUserValid = function (?string $uid) use (&$userCache): bool {
                if (empty($uid)) {
                    return false;
                }
                if (! isset($userCache[$uid])) {
                    $userCache[$uid] = DB::table('users')->where('id', $uid)->exists();
                }

                return $userCache[$uid];
            };

            // 0. Resolve target event in destination database (by ID or unique slug)
            $existingEvent = DB::table('events')
                ->where('id', $exportedEventId)
                ->when(! empty($eventRow['slug']), fn ($q) => $q->orWhere('slug', $eventRow['slug']))
                ->first();

            $targetEventId = $existingEvent ? $existingEvent->id : $exportedEventId;

            // 1. Upsert Referenced Master Staff with smart matching and ID mapping
            $refereeIdMap = [];
            if (! empty($data['referees'])) {
                $refereeColumns = Schema::getColumnListing('referees');
                foreach ($data['referees'] as $referee) {
                    $exportedId = $referee['id'];
                    $existing = DB::table('referees')
                        ->where('id', $exportedId)
                        ->when(! empty($referee['license_number']), fn ($q) => $q->orWhere('license_number', $referee['license_number']))
                        ->when(! empty($referee['email']), fn ($q) => $q->orWhere('email', $referee['email']))
                        ->first();

                    $targetRefereeId = $existing ? $existing->id : $exportedId;
                    $validUserId = null;
                    if ($isUserValid($referee['user_id'] ?? null)) {
                        $validUserId = $referee['user_id'];
                    } elseif ($existing && $isUserValid($existing->user_id)) {
                        $validUserId = $existing->user_id;
                    }

                    // user_id must be unique across referees
                    if ($validUserId && DB::table('referees')->where('user_id', $validUserId)->where('id', '!=', $targetRefereeId)->exists()) {
                        $validUserId = null;
                    }

                    if ($existing) {
                        $refereeIdMap[$exportedId] = $existing->id;
                        $updateData = collect($referee)
                            ->except(['id'])
                            ->put('user_id', $validUserId)
                            ->only($refereeColumns)
                            ->all();
                        DB::table('referees')->where('id', $existing->id)->update($updateData);
                    } else {
                        $insertData = collect($referee)
                            ->put('user_id', $validUserId)
                            ->only($refereeColumns)
                            ->all();
                        DB::table('referees')->insert($insertData);
                        $refereeIdMap[$exportedId] = $exportedId;
                    }
                }
            }

            $clerkIdMap = [];
            if (! empty($data['clerks'])) {
                $clerkColumns = Schema::getColumnListing('clerks');
                foreach ($data['clerks'] as $clerk) {
                    $exportedId = $clerk['id'];
                    $existing = DB::table('clerks')
                        ->where('id', $exportedId)
                        ->when(! empty($clerk['employee_number']), fn ($q) => $q->orWhere('employee_number', $clerk['employee_number']))
                        ->when(! empty($clerk['email']), fn ($q) => $q->orWhere('email', $clerk['email']))
                        ->first();

                    if ($existing) {
                        $clerkIdMap[$exportedId] = $existing->id;
                        $updateData = collect($clerk)->except(['id'])->only($clerkColumns)->all();
                        DB::table('clerks')->where('id', $existing->id)->update($updateData);
                    } else {
                        DB::table('clerks')->insert(collect($clerk)->only($clerkColumns)->all());
                        $clerkIdMap[$exportedId] = $exportedId;
                    }
                }
            }

            $coordIdMap = [];
            if (! empty($data['field_coordinators'])) {
                $coordColumns = Schema::getColumnListing('field_coordinators');
                foreach ($data['field_coordinators'] as $coord) {
                    $exportedId = $coord['id'];
                    $existing = DB::table('field_coordinators')
                        ->where('id', $exportedId)
                        ->when(! empty($coord['coordinator_number']), fn ($q) => $q->orWhere('coordinator_number', $coord['coordinator_number']))
                        ->when(! empty($coord['email']), fn ($q) => $q->orWhere('email', $coord['email']))
                        ->first();

                    if ($existing) {
                        $coordIdMap[$exportedId] = $existing->id;
                        $updateData = collect($coord)->except(['id'])->only($coordColumns)->all();
                        DB::table('field_coordinators')->where('id', $existing->id)->update($updateData);
                    } else {
                        DB::table('field_coordinators')->insert(collect($coord)->only($coordColumns)->all());
                        $coordIdMap[$exportedId] = $exportedId;
                    }
                }
            }

            // Sync or stub referenced techniques
            if (! empty($data['techniques'])) {
                $techColumns = Schema::getColumnListing('techniques');
                foreach ($data['techniques'] as $t) {
                    DB::table('techniques')->updateOrInsert(
                        ['id' => $t['id']],
                        collect($t)->only($techColumns)->all()
                    );
                }
            }
            $referencedTechIds = collect($data['embu_team_techniques'] ?? [])->pluck('technique_id')->filter()->unique();
            foreach ($referencedTechIds as $techId) {
                if (! DB::table('techniques')->where('id', $techId)->exists()) {
                    DB::table('techniques')->insert([
                        'id' => $techId,
                        'name' => 'Teknik Embu #'.substr($techId, 0, 8),
                        'category' => 'Embu',
                        'order' => 0,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // 2. Clean old child data for both target and exported event IDs
            $cleanupEventIds = array_unique([$targetEventId, $exportedEventId]);
            $oldMatches = DB::table('tournament_matches')->whereIn('event_id', $cleanupEventIds)->pluck('id')->all();
            $oldCourts = DB::table('event_courts')->whereIn('event_id', $cleanupEventIds)->pluck('id')->all();
            $oldContingents = DB::table('contingents')->whereIn('event_id', $cleanupEventIds)->pluck('id')->all();

            DB::table('tournament_results')->whereIn('event_id', $cleanupEventIds)->delete();

            if (! empty($oldMatches)) {
                DB::table('tournament_match_var_reviews')
                    ->whereIn('event_id', $cleanupEventIds)
                    ->orWhereIn('tournament_match_id', $oldMatches)
                    ->delete();
                DB::table('embu_scores')->whereIn('tournament_match_id', $oldMatches)->delete();
                DB::table('randori_scores')
                    ->whereIn('event_id', $cleanupEventIds)
                    ->orWhereIn('tournament_match_id', $oldMatches)
                    ->delete();
            }

            DB::table('embu_judge_scores')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('tournament_matches')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('tournament_drawings')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('embu_team_techniques')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('athlete_match_category_entries')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('registrations')->whereIn('event_id', $cleanupEventIds)->delete();

            DB::table('referee_court_assignment_histories')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('referee_court_attendances')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('referee_attendances')->whereIn('event_id', $cleanupEventIds)->delete();

            if (! empty($oldCourts)) {
                DB::table('event_court_assignments')->whereIn('event_court_id', $oldCourts)->delete();
            }

            if (! empty($oldContingents)) {
                DB::table('officials')->whereIn('contingent_id', $oldContingents)->delete();
                DB::table('athletes')->whereIn('contingent_id', $oldContingents)->delete();
            }

            DB::table('contingents')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('rundowns')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('event_match_categories')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('event_courts')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('event_age_categories')->whereIn('event_id', $cleanupEventIds)->delete();

            DB::table('event_referee')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('clerk_event')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('event_field_coordinator')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('event_payment_method')->whereIn('event_id', $cleanupEventIds)->delete();

            // 3. Upsert Event Core
            $eventColumns = Schema::getColumnListing('events');
            $eventSaveData = collect($eventRow)->put('id', $targetEventId)->only($eventColumns);
            if ($existingEvent) {
                DB::table('events')->where('id', $targetEventId)->update($eventSaveData->except(['id'])->all());
            } else {
                DB::table('events')->insert($eventSaveData->all());
            }

            // Remap event_id on child rows
            $fixEventId = function (array $rows) use ($targetEventId): array {
                return array_map(function ($row) use ($targetEventId) {
                    if (isset($row['event_id'])) {
                        $row['event_id'] = $targetEventId;
                    }

                    return $row;
                }, $rows);
            };

            // 4. Insert Child Tables in Dependency Order
            $this->bulkInsert('event_age_categories', $fixEventId($data['event_age_categories'] ?? []));
            $this->bulkInsert('event_courts', $fixEventId($data['event_courts'] ?? []));

            $matchCategories = collect($fixEventId($data['event_match_categories'] ?? []))->map(function ($mc) use ($isUserValid) {
                if (! $isUserValid($mc['scoring_locked_by'] ?? null)) {
                    $mc['scoring_locked_by'] = null;
                }

                return $mc;
            })->all();
            $this->bulkInsert('event_match_categories', $matchCategories);

            $this->bulkInsert('rundowns', $fixEventId($data['rundowns'] ?? []));

            // Contingents: ensure valid user_id and source_contingent_id
            $fallbackUserId = auth()->id() ?? DB::table('users')->value('id');
            $contingents = collect($fixEventId($data['contingents'] ?? []))->map(function ($c) use ($fallbackUserId, $isUserValid) {
                if (! $isUserValid($c['user_id'] ?? null)) {
                    $matched = ! empty($c['email']) ? DB::table('users')->where('email', $c['email'])->value('id') : null;
                    $c['user_id'] = $matched ?? $fallbackUserId;
                }
                if (! empty($c['source_contingent_id']) && ! DB::table('contingents')->where('id', $c['source_contingent_id'])->exists()) {
                    $c['source_contingent_id'] = null;
                }

                return $c;
            })->all();
            $this->bulkInsert('contingents', $contingents);

            $this->bulkInsert('officials', $data['officials'] ?? []);

            // Athletes: sanitize school_verified_by
            $athletes = collect($data['athletes'] ?? [])->map(function ($a) use ($isUserValid) {
                if (! $isUserValid($a['school_verified_by'] ?? null)) {
                    $a['school_verified_by'] = null;
                }

                return $a;
            })->all();
            $this->bulkInsert('athletes', $athletes);

            // Registrations: sanitize payment foreign keys
            $registrations = collect($fixEventId($data['registrations'] ?? []))->map(function ($r) use ($isUserValid) {
                if (! empty($r['payment_method_id']) && ! DB::table('payment_methods')->where('id', $r['payment_method_id'])->exists()) {
                    $r['payment_method_id'] = null;
                }
                if (! $isUserValid($r['payment_verified_by'] ?? null)) {
                    $r['payment_verified_by'] = null;
                }

                return $r;
            })->all();
            $this->bulkInsert('registrations', $registrations);

            // Category entries: sanitize weigh_in users
            $categoryEntries = collect($fixEventId($data['athlete_match_category_entries'] ?? []))->map(function ($ce) use ($isUserValid) {
                if (! $isUserValid($ce['weigh_in_by'] ?? null)) {
                    $ce['weigh_in_by'] = null;
                }
                if (! $isUserValid($ce['weigh_in_locked_by'] ?? null)) {
                    $ce['weigh_in_locked_by'] = null;
                }

                return $ce;
            })->all();
            $this->bulkInsert('athlete_match_category_entries', $categoryEntries);

            $this->bulkInsert('embu_team_techniques', $fixEventId($data['embu_team_techniques'] ?? []));
            $this->bulkInsert('tournament_drawings', $fixEventId($data['tournament_drawings'] ?? []));
            $this->bulkInsert('tournament_matches', $fixEventId($data['tournament_matches'] ?? []));

            // Embu scores: sanitize submitted_by / verified_by
            $embuScores = collect($data['embu_scores'] ?? [])->map(function ($es) use ($isUserValid) {
                if (! $isUserValid($es['submitted_by'] ?? null)) {
                    $es['submitted_by'] = null;
                }
                if (! $isUserValid($es['verified_by'] ?? null)) {
                    $es['verified_by'] = null;
                }

                return $es;
            })->all();
            $this->bulkInsert('embu_scores', $embuScores);

            // Embu judge scores: remap referee_id and sanitize user_id
            $embuJudgeScores = collect($fixEventId($data['embu_judge_scores'] ?? []))->map(function ($row) use ($refereeIdMap, $isUserValid) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                if (! $isUserValid($row['user_id'] ?? null)) {
                    $row['user_id'] = null;
                }

                return $row;
            })->all();
            $this->bulkInsert('embu_judge_scores', $embuJudgeScores);

            // Randori scores: sanitize users
            $randoriScores = collect($fixEventId($data['randori_scores'] ?? []))->map(function ($rs) use ($isUserValid) {
                if (! $isUserValid($rs['submitted_by'] ?? null)) {
                    $rs['submitted_by'] = null;
                }
                if (! $isUserValid($rs['verified_by'] ?? null)) {
                    $rs['verified_by'] = null;
                }
                if (! $isUserValid($rs['locked_by'] ?? null)) {
                    $rs['locked_by'] = null;
                }

                return $rs;
            })->all();
            $this->bulkInsert('randori_scores', $randoriScores);

            $this->bulkInsert('tournament_match_var_reviews', $fixEventId($data['tournament_match_var_reviews'] ?? []));
            $this->bulkInsert('tournament_results', $fixEventId($data['tournament_results'] ?? []));

            // Court assignments: remap staff_id based on staff_type
            $courtAssignments = collect($data['event_court_assignments'] ?? [])->map(function ($row) use ($refereeIdMap, $coordIdMap, $clerkIdMap) {
                $staffType = $row['staff_type'] ?? '';
                if ($staffType === 'referee') {
                    $row['staff_id'] = $refereeIdMap[$row['staff_id']] ?? $row['staff_id'];
                } elseif ($staffType === 'field_coordinator') {
                    $row['staff_id'] = $coordIdMap[$row['staff_id']] ?? $row['staff_id'];
                } elseif ($staffType === 'clerk') {
                    $row['staff_id'] = $clerkIdMap[$row['staff_id']] ?? $row['staff_id'];
                }

                return $row;
            })->unique(fn ($r) => ($r['event_court_id'] ?? '').'-'.($r['staff_type'] ?? '').'-'.$r['staff_id'])->values()->all();
            $this->bulkInsert('event_court_assignments', $courtAssignments);

            // Referee attendances: remap referee_id and sanitize checked_in_by_user_id
            $refereeAttendances = collect($fixEventId($data['referee_attendances'] ?? []))->map(function ($row) use ($refereeIdMap, $isUserValid) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                if (! $isUserValid($row['checked_in_by_user_id'] ?? null)) {
                    $row['checked_in_by_user_id'] = null;
                }

                return $row;
            })->unique(fn ($r) => $r['event_id'].'-'.$r['referee_id'].'-'.($r['attendance_date'] ?? ''))->values()->all();
            $this->bulkInsert('referee_attendances', $refereeAttendances);

            // Referee court attendances
            $refereeCourtAttendances = collect($data['referee_court_attendances'] ?? [])->map(function ($row) use ($refereeIdMap, $isUserValid) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                if (! $isUserValid($row['checked_in_by_user_id'] ?? null)) {
                    $row['checked_in_by_user_id'] = null;
                }

                return $row;
            })->unique(fn ($r) => ($r['event_court_id'] ?? '').'-'.$r['referee_id'].'-'.($r['attendance_date'] ?? ''))->values()->all();
            $this->bulkInsert('referee_court_attendances', $refereeCourtAttendances);

            // Referee assignment histories
            $assignmentHistories = collect($fixEventId($data['referee_court_assignment_histories'] ?? []))->map(function ($row) use ($refereeIdMap, $isUserValid) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                if (! $isUserValid($row['changed_by_user_id'] ?? null)) {
                    $row['changed_by_user_id'] = null;
                }

                return $row;
            })->all();
            $this->bulkInsert('referee_court_assignment_histories', $assignmentHistories);

            // Event referees
            $eventReferees = collect($fixEventId($data['event_referee'] ?? []))->map(function ($row) use ($refereeIdMap) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];

                return $row;
            })->unique(fn ($r) => $r['event_id'].'-'.$r['referee_id'])->values()->all();
            $this->bulkInsert('event_referee', $eventReferees);

            // Clerk events
            $clerkEvents = collect($fixEventId($data['clerk_event'] ?? []))->map(function ($row) use ($clerkIdMap) {
                $row['clerk_id'] = $clerkIdMap[$row['clerk_id']] ?? $row['clerk_id'];

                return $row;
            })->unique(fn ($r) => $r['clerk_id'].'-'.$r['event_id'])->values()->all();
            $this->bulkInsert('clerk_event', $clerkEvents);

            // Event field coordinators
            $eventCoords = collect($fixEventId($data['event_field_coordinator'] ?? []))->map(function ($row) use ($coordIdMap) {
                $row['field_coordinator_id'] = $coordIdMap[$row['field_coordinator_id']] ?? $row['field_coordinator_id'];

                return $row;
            })->unique(fn ($r) => $r['event_id'].'-'.$r['field_coordinator_id'])->values()->all();
            $this->bulkInsert('event_field_coordinator', $eventCoords);

            $this->bulkInsert('event_payment_method', $fixEventId($data['event_payment_method'] ?? []));

            if (! empty($data['event_user'])) {
                foreach ($data['event_user'] as $eu) {
                    if ($isUserValid($eu['user_id'])) {
                        DB::table('event_user')->updateOrInsert(
                            ['event_id' => $targetEventId, 'user_id' => $eu['user_id']],
                            array_merge($eu, ['event_id' => $targetEventId])
                        );
                    }
                }
            }

            return [
                'event_id' => $targetEventId,
                'event_name' => $eventRow['name'],
                'imported_counts' => [
                    'courts' => count($data['event_courts'] ?? []),
                    'match_categories' => count($data['event_match_categories'] ?? []),
                    'contingents' => count($data['contingents'] ?? []),
                    'athletes' => count($data['athletes'] ?? []),
                    'matches' => count($data['tournament_matches'] ?? []),
                    'embu_scores' => count($data['embu_scores'] ?? []),
                    'embu_judge_scores' => count($data['embu_judge_scores'] ?? []),
                    'randori_scores' => count($data['randori_scores'] ?? []),
                    'tournament_results' => count($data['tournament_results'] ?? []),
                ],
            ];
        });
    }

    /**
     * Safely bulk insert rows into a table, automatically filtering only existing columns.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function bulkInsert(string $table, array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        $columns = Schema::getColumnListing($table);
        $filtered = array_map(fn ($r) => collect($r)->only($columns)->all(), $rows);

        foreach (array_chunk($filtered, 100) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }
}
