<?php

namespace App\Services\Admin\Event;

use App\Models\Event;
use App\Models\Role;
use App\Models\User;
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
        $athleteIds = $athletes->pluck('id')->all();

        $rankHistories = empty($athleteIds)
            ? collect()
            : DB::table('athlete_rank_histories')->whereIn('athlete_id', $athleteIds)->get();

        // 3. Registrations & Entries
        $registrations = DB::table('registrations')->where('event_id', $eventId)->get();
        $categoryEntries = DB::table('athlete_match_category_entries')->where('event_id', $eventId)->get();
        $embuTechniques = DB::table('embu_team_techniques')->where('event_id', $eventId)->get();
        $embuTechIds = $embuTechniques->pluck('technique_id')->filter()->unique()->all();
        $techniques = empty($embuTechIds)
            ? collect()
            : DB::table('techniques')->whereIn('id', $embuTechIds)->get();

        $weightClassIds = $matchCategories->pluck('weight_class_id')->filter()->unique()->all();
        $weightClasses = empty($weightClassIds)
            ? collect()
            : DB::table('weight_classes')->whereIn('id', $weightClassIds)->get();

        $drawings = DB::table('tournament_drawings')->where('event_id', $eventId)->get();

        // 4. Matches, Scores, and Results
        $matches = DB::table('tournament_matches')->where('event_id', $eventId)->get();
        $matchIds = $matches->pluck('id')->all();

        $embuScores = empty($matchIds)
            ? DB::table('embu_scores')->where('event_id', $eventId)->get()
            : DB::table('embu_scores')
                ->where('event_id', $eventId)
                ->orWhereIn('tournament_match_id', $matchIds)
                ->get();

        $embuJudgeScores = DB::table('embu_judge_scores')->where('event_id', $eventId)->get();

        $randoriScores = empty($matchIds)
            ? DB::table('randori_scores')->where('event_id', $eventId)->get()
            : DB::table('randori_scores')
                ->where('event_id', $eventId)
                ->orWhereIn('tournament_match_id', $matchIds)
                ->get();

        $varReviews = empty($matchIds)
            ? DB::table('tournament_match_var_reviews')->where('event_id', $eventId)->get()
            : DB::table('tournament_match_var_reviews')
                ->where('event_id', $eventId)
                ->orWhereIn('tournament_match_id', $matchIds)
                ->get();

        $tournamentResults = DB::table('tournament_results')->where('event_id', $eventId)->get();

        // 5. Staff, Assignments, Attendances & Check-In Codes
        $courtIds = $courts->pluck('id')->all();
        $courtAssignments = empty($courtIds)
            ? collect()
            : DB::table('event_court_assignments')->whereIn('event_court_id', $courtIds)->get();

        $refereeAttendances = DB::table('referee_attendances')->where('event_id', $eventId)->get();
        $refereeCourtAttendances = DB::table('referee_court_attendances')->where('event_id', $eventId)->get();
        $assignmentHistories = DB::table('referee_court_assignment_histories')->where('event_id', $eventId)->get();
        $refereeCheckInCodes = DB::table('referee_check_in_codes')->where('event_id', $eventId)->get();

        // Pivot tables & referenced staff records
        $eventRefereePivots = DB::table('event_referee')->where('event_id', $eventId)->get();
        $courtRefereeIds = $courtAssignments->where('staff_type', 'referee')->pluck('staff_id')->all();

        $refereeIds = array_values(array_filter(array_unique(array_merge(
            $eventRefereePivots->pluck('referee_id')->all(),
            $refereeAttendances->pluck('referee_id')->filter()->all(),
            $refereeCourtAttendances->pluck('referee_id')->filter()->all(),
            $assignmentHistories->pluck('referee_id')->filter()->all(),
            $embuJudgeScores->pluck('referee_id')->filter()->all(),
            $courtRefereeIds
        ))));

        $referees = empty($refereeIds)
            ? collect()
            : DB::table('referees')->whereIn('id', $refereeIds)->get();

        // If any referee is in histories/attendances but deleted from referees table, synthesize placeholder
        $foundRefIds = $referees->pluck('id')->all();
        $missingRefIds = array_diff($refereeIds, $foundRefIds);
        foreach ($missingRefIds as $missingRefId) {
            $referees->push((object) [
                'id' => $missingRefId,
                'name' => 'Wasit/Juri #'.substr($missingRefId, 0, 8),
                'gender' => 'male',
                'is_active' => true,
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ]);
        }

        $clerkPivots = DB::table('clerk_event')->where('event_id', $eventId)->get();
        $courtClerkIds = $courtAssignments->where('staff_type', 'clerk')->pluck('staff_id')->all();
        $clerkIds = array_values(array_filter(array_unique(array_merge(
            $clerkPivots->pluck('clerk_id')->all(),
            $courtClerkIds
        ))));
        $clerks = empty($clerkIds)
            ? collect()
            : DB::table('clerks')->whereIn('id', $clerkIds)->get();

        $coordPivots = DB::table('event_field_coordinator')->where('event_id', $eventId)->get();
        $courtCoordIds = $courtAssignments->where('staff_type', 'field_coordinator')->pluck('staff_id')->all();
        $coordIds = array_values(array_filter(array_unique(array_merge(
            $coordPivots->pluck('field_coordinator_id')->all(),
            $courtCoordIds
        ))));
        $coordinators = empty($coordIds)
            ? collect()
            : DB::table('field_coordinators')->whereIn('id', $coordIds)->get();

        $arbitratorPivots = DB::table('event_arbitrator')->where('event_id', $eventId)->get();
        $arbitratorIds = $arbitratorPivots->pluck('arbitrator_id')->all();
        $arbitrators = empty($arbitratorIds)
            ? collect()
            : DB::table('arbitrators')->whereIn('id', $arbitratorIds)->get();

        $paymentPivots = DB::table('event_payment_method')->where('event_id', $eventId)->get();
        $paymentMethodIds = array_values(array_unique(array_filter(array_merge(
            $paymentPivots->pluck('payment_method_id')->all(),
            $registrations->pluck('payment_method_id')->filter()->all()
        ))));
        $paymentMethods = empty($paymentMethodIds)
            ? collect()
            : DB::table('payment_methods')->whereIn('id', $paymentMethodIds)->get();

        $eventUsers = DB::table('event_user')->where('event_id', $eventId)->get();

        // 6. Gather all associated users (Staff, Referees, Contingents, Scoring signers)
        $eventUserIds = $eventUsers->pluck('user_id')->all();
        $contingentUserIds = $contingents->pluck('user_id')->filter()->all();
        $refereeUserIds = $referees->pluck('user_id')->filter()->all();

        $allUserIds = array_values(array_filter(array_unique(array_merge(
            $eventUserIds,
            $contingentUserIds,
            $refereeUserIds,
            $matchCategories->pluck('scoring_locked_by')->filter()->all(),
            $matchCategories->pluck('weigh_in_locked_by')->filter()->all(),
            $categoryEntries->pluck('weigh_in_by')->filter()->all(),
            $categoryEntries->pluck('weigh_in_locked_by')->filter()->all(),
            $embuScores->pluck('submitted_by')->filter()->all(),
            $embuScores->pluck('verified_by')->filter()->all(),
            $embuJudgeScores->pluck('user_id')->filter()->all(),
            $randoriScores->pluck('submitted_by')->filter()->all(),
            $randoriScores->pluck('verified_by')->filter()->all(),
            $randoriScores->pluck('locked_by')->filter()->all(),
            $refereeAttendances->pluck('checked_in_by_user_id')->filter()->all(),
            $refereeCourtAttendances->pluck('checked_in_by_user_id')->filter()->all(),
            $assignmentHistories->pluck('changed_by_user_id')->filter()->all(),
            $registrations->pluck('payment_verified_by')->filter()->all(),
            $athletes->pluck('school_verified_by')->filter()->all(),
            $rankHistories->pluck('changed_by')->filter()->all(),
        ))));

        $users = empty($allUserIds)
            ? collect()
            : User::query()->whereIn('id', $allUserIds)->with('roles')->get();

        $exportedUsers = $users->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'nik_perkemi' => $u->nik_perkemi,
            'password' => $u->password,
            'roles' => $u->roles->pluck('name')->all(),
        ])->all();

        $exportData = [
            'event' => $eventData ? (array) $eventData : [],
            'event_age_categories' => $ageCategories->map(fn ($r) => (array) $r)->all(),
            'event_courts' => $courts->map(fn ($r) => (array) $r)->all(),
            'event_match_categories' => $matchCategories->map(fn ($r) => (array) $r)->all(),
            'rundowns' => $rundowns->map(fn ($r) => (array) $r)->all(),
            'contingents' => $contingents->map(fn ($r) => (array) $r)->all(),
            'officials' => $officials->map(fn ($r) => (array) $r)->all(),
            'athletes' => $athletes->map(fn ($r) => (array) $r)->all(),
            'athlete_rank_histories' => $rankHistories->map(fn ($r) => (array) $r)->all(),
            'registrations' => $registrations->map(fn ($r) => (array) $r)->all(),
            'athlete_match_category_entries' => $categoryEntries->map(fn ($r) => (array) $r)->all(),
            'embu_team_techniques' => $embuTechniques->map(fn ($r) => (array) $r)->all(),
            'techniques' => $techniques->map(fn ($r) => (array) $r)->all(),
            'weight_classes' => $weightClasses->map(fn ($r) => (array) $r)->all(),
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
            'referee_check_in_codes' => $refereeCheckInCodes->map(fn ($r) => (array) $r)->all(),
            'referees' => $referees->map(fn ($r) => (array) $r)->all(),
            'event_referee' => $eventRefereePivots->map(fn ($r) => (array) $r)->all(),
            'clerks' => $clerks->map(fn ($r) => (array) $r)->all(),
            'clerk_event' => $clerkPivots->map(fn ($r) => (array) $r)->all(),
            'field_coordinators' => $coordinators->map(fn ($r) => (array) $r)->all(),
            'event_field_coordinator' => $coordPivots->map(fn ($r) => (array) $r)->all(),
            'arbitrators' => $arbitrators->map(fn ($r) => (array) $r)->all(),
            'event_arbitrator' => $arbitratorPivots->map(fn ($r) => (array) $r)->all(),
            'payment_methods' => $paymentMethods->map(fn ($r) => (array) $r)->all(),
            'event_payment_method' => $paymentPivots->map(fn ($r) => (array) $r)->all(),
            'users' => $exportedUsers,
            'event_user' => $eventUsers->map(fn ($r) => (array) $r)->all(),
        ];

        $counts = [
            'courts' => count($exportData['event_courts']),
            'match_categories' => count($exportData['event_match_categories']),
            'age_categories' => count($exportData['event_age_categories']),
            'contingents' => count($exportData['contingents']),
            'officials' => count($exportData['officials']),
            'athletes' => count($exportData['athletes']),
            'rank_histories' => count($exportData['athlete_rank_histories']),
            'registrations' => count($exportData['registrations']),
            'category_entries' => count($exportData['athlete_match_category_entries']),
            'techniques' => count($exportData['techniques']),
            'matches' => count($exportData['tournament_matches']),
            'embu_scores' => count($exportData['embu_scores']),
            'embu_judge_scores' => count($exportData['embu_judge_scores']),
            'randori_scores' => count($exportData['randori_scores']),
            'var_reviews' => count($exportData['tournament_match_var_reviews']),
            'tournament_results' => count($exportData['tournament_results']),
            'referees' => count($exportData['referees']),
            'clerks' => count($exportData['clerks']),
            'field_coordinators' => count($exportData['field_coordinators']),
            'referee_check_in_codes' => count($exportData['referee_check_in_codes']),
            'payment_methods' => count($exportData['payment_methods']),
            'users' => count($exportData['users']),
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

            // 0. Upsert Associated Users and Build ID Map
            $userIdMap = [];
            if (! empty($data['users'])) {
                $userColumns = Schema::getColumnListing('users');
                foreach ($data['users'] as $u) {
                    $exportedId = $u['id'];
                    $email = ! empty($u['email']) ? strtolower(trim((string) $u['email'])) : null;

                    $existing = DB::table('users')
                        ->where('id', $exportedId)
                        ->when($email, fn ($q) => $q->orWhereRaw('LOWER(email) = ?', [$email]))
                        ->first();

                    if ($existing) {
                        $userIdMap[$exportedId] = $existing->id;
                        $userCache[$existing->id] = true;
                        $userCache[$exportedId] = true;

                        $updates = collect($u)
                            ->only(['phone', 'nik_perkemi'])
                            ->filter()
                            ->reject(fn ($val, $key) => ! empty($existing->{$key}))
                            ->all();

                        if (! empty($updates)) {
                            DB::table('users')->where('id', $existing->id)->update($updates);
                        }
                    } else {
                        $userData = collect($u)
                            ->only($userColumns)
                            ->put('id', $exportedId)
                            ->put('email', $email)
                            ->put('created_at', now())
                            ->put('updated_at', now())
                            ->all();

                        DB::table('users')->insert($userData);
                        $userIdMap[$exportedId] = $exportedId;
                        $userCache[$exportedId] = true;

                        if (! empty($u['roles'])) {
                            $userModel = User::query()->find($exportedId);
                            if ($userModel) {
                                foreach ($u['roles'] as $roleName) {
                                    $role = Role::findOrCreate($roleName, 'web');
                                    $userModel->assignRole($role);
                                }
                            }
                        }
                    }
                }
            }

            $remapUserId = function (?string $uid) use ($userIdMap, $isUserValid): ?string {
                if (empty($uid)) {
                    return null;
                }
                $targetUid = $userIdMap[$uid] ?? $uid;

                return $isUserValid($targetUid) ? $targetUid : null;
            };

            // 1. Resolve target event in destination database (by ID or unique slug)
            $existingEvent = DB::table('events')
                ->where('id', $exportedEventId)
                ->when(! empty($eventRow['slug']), fn ($q) => $q->orWhere('slug', $eventRow['slug']))
                ->first();

            $targetEventId = $existingEvent ? $existingEvent->id : $exportedEventId;

            // 2. Upsert Referenced Master Staff & Resources with smart matching and ID mapping
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
                    $validUserId = $remapUserId($referee['user_id'] ?? null);
                    if (! $validUserId && $existing) {
                        $validUserId = $remapUserId($existing->user_id);
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

            // Ensure every referee ID referenced across child tables exists in destination referees table
            $referencedRefereeIds = collect([
                collect($data['event_referee'] ?? [])->pluck('referee_id'),
                collect($data['referee_attendances'] ?? [])->pluck('referee_id'),
                collect($data['referee_court_attendances'] ?? [])->pluck('referee_id'),
                collect($data['referee_court_assignment_histories'] ?? [])->pluck('referee_id'),
                collect($data['embu_judge_scores'] ?? [])->pluck('referee_id'),
                collect($data['event_court_assignments'] ?? [])->where('staff_type', 'referee')->pluck('staff_id'),
            ])->flatten()->filter()->unique()->all();

            foreach ($referencedRefereeIds as $rId) {
                $targetRefereeId = $refereeIdMap[$rId] ?? $rId;
                if (! DB::table('referees')->where('id', $targetRefereeId)->exists()) {
                    DB::table('referees')->insert([
                        'id' => $targetRefereeId,
                        'name' => 'Wasit/Juri #'.substr($targetRefereeId, 0, 8),
                        'gender' => 'male',
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $refereeIdMap[$rId] = $targetRefereeId;
                }
            }

            // Ensure every clerk ID referenced across child tables exists
            $referencedClerkIds = collect([
                collect($data['clerk_event'] ?? [])->pluck('clerk_id'),
                collect($data['event_court_assignments'] ?? [])->where('staff_type', 'clerk')->pluck('staff_id'),
            ])->flatten()->filter()->unique()->all();

            foreach ($referencedClerkIds as $cId) {
                $targetClerkId = $clerkIdMap[$cId] ?? $cId;
                if (! DB::table('clerks')->where('id', $targetClerkId)->exists()) {
                    DB::table('clerks')->insert([
                        'id' => $targetClerkId,
                        'name' => 'Panitera #'.substr($targetClerkId, 0, 8),
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $clerkIdMap[$cId] = $targetClerkId;
                }
            }

            // Ensure every field coordinator ID referenced across child tables exists
            $referencedCoordIds = collect([
                collect($data['event_field_coordinator'] ?? [])->pluck('field_coordinator_id'),
                collect($data['event_court_assignments'] ?? [])->where('staff_type', 'field_coordinator')->pluck('staff_id'),
            ])->flatten()->filter()->unique()->all();

            foreach ($referencedCoordIds as $coordId) {
                $targetCoordId = $coordIdMap[$coordId] ?? $coordId;
                if (! DB::table('field_coordinators')->where('id', $targetCoordId)->exists()) {
                    DB::table('field_coordinators')->insert([
                        'id' => $targetCoordId,
                        'name' => 'Koordinator #'.substr($targetCoordId, 0, 8),
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $coordIdMap[$coordId] = $targetCoordId;
                }
            }

            // Sync arbitrators
            $arbitratorIdMap = [];
            if (! empty($data['arbitrators'])) {
                $arbColumns = Schema::getColumnListing('arbitrators');
                foreach ($data['arbitrators'] as $arb) {
                    $arbData = collect($arb)->only($arbColumns)->all();
                    $existing = null;
                    if (! empty($arb['license_number'])) {
                        $existing = DB::table('arbitrators')->where('license_number', $arb['license_number'])->first();
                    }
                    if (! $existing && ! empty($arb['email'])) {
                        $existing = DB::table('arbitrators')->whereRaw('LOWER(email) = ?', [mb_strtolower($arb['email'])])->first();
                    }
                    if (! $existing) {
                        $existing = DB::table('arbitrators')->where('id', $arb['id'])->first();
                    }

                    if ($existing) {
                        DB::table('arbitrators')->where('id', $existing->id)->update(collect($arbData)->except(['id'])->all());
                        $arbitratorIdMap[$arb['id']] = $existing->id;
                    } else {
                        DB::table('arbitrators')->insert($arbData);
                        $arbitratorIdMap[$arb['id']] = $arb['id'];
                    }
                }
            }

            // Ensure referenced arbitrators exist
            $referencedArbitratorIds = collect($data['event_arbitrator'] ?? [])->pluck('arbitrator_id')->filter()->unique()->all();
            foreach ($referencedArbitratorIds as $arbId) {
                $targetArbId = $arbitratorIdMap[$arbId] ?? $arbId;
                if (! DB::table('arbitrators')->where('id', $targetArbId)->exists()) {
                    DB::table('arbitrators')->insert([
                        'id' => $targetArbId,
                        'name' => 'Arbitrase #'.substr($targetArbId, 0, 8),
                        'gender' => 'male',
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $arbitratorIdMap[$arbId] = $targetArbId;
                }
            }

            // Sync payment methods
            if (! empty($data['payment_methods'])) {
                $pmColumns = Schema::getColumnListing('payment_methods');
                foreach ($data['payment_methods'] as $pm) {
                    $pmData = collect($pm)->only($pmColumns)->all();
                    $existing = DB::table('payment_methods')->where('id', $pm['id'])->first();
                    if ($existing) {
                        DB::table('payment_methods')->where('id', $existing->id)->update(collect($pmData)->except(['id'])->all());
                    } else {
                        DB::table('payment_methods')->insert($pmData);
                    }
                }
            }

            // Sync weight classes
            if (! empty($data['weight_classes'])) {
                $wcColumns = Schema::getColumnListing('weight_classes');
                foreach ($data['weight_classes'] as $wc) {
                    $wcData = collect($wc)->only($wcColumns)->all();
                    $existing = DB::table('weight_classes')->where('id', $wc['id'])->first();
                    if ($existing) {
                        DB::table('weight_classes')->where('id', $existing->id)->update(collect($wcData)->except(['id'])->all());
                    } else {
                        DB::table('weight_classes')->insert($wcData);
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

            // 3. Clean old child data for both target and exported event IDs
            $cleanupEventIds = array_values(array_unique([$targetEventId, $exportedEventId]));
            $oldMatches = DB::table('tournament_matches')->whereIn('event_id', $cleanupEventIds)->pluck('id')->all();
            $oldCourts = DB::table('event_courts')->whereIn('event_id', $cleanupEventIds)->pluck('id')->all();
            $oldContingents = DB::table('contingents')->whereIn('event_id', $cleanupEventIds)->pluck('id')->all();

            DB::table('tournament_results')->whereIn('event_id', $cleanupEventIds)->delete();

            if (! empty($oldMatches)) {
                DB::table('tournament_match_var_reviews')
                    ->whereIn('event_id', $cleanupEventIds)
                    ->orWhereIn('tournament_match_id', $oldMatches)
                    ->delete();
                DB::table('embu_scores')
                    ->whereIn('event_id', $cleanupEventIds)
                    ->orWhereIn('tournament_match_id', $oldMatches)
                    ->delete();
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

            DB::table('referee_check_in_codes')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('referee_court_assignment_histories')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('referee_court_attendances')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('referee_attendances')->whereIn('event_id', $cleanupEventIds)->delete();

            if (! empty($oldCourts)) {
                DB::table('event_court_assignments')->whereIn('event_court_id', $oldCourts)->delete();
            }

            if (! empty($oldContingents)) {
                $oldAthletes = DB::table('athletes')->whereIn('contingent_id', $oldContingents)->pluck('id')->all();
                if (! empty($oldAthletes)) {
                    DB::table('athlete_rank_histories')->whereIn('athlete_id', $oldAthletes)->delete();
                }
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
            DB::table('event_arbitrator')->whereIn('event_id', $cleanupEventIds)->delete();
            DB::table('event_payment_method')->whereIn('event_id', $cleanupEventIds)->delete();

            // 4. Upsert Event Core
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

            // 5. Insert Child Tables in Dependency Order
            $this->bulkInsert('event_age_categories', $fixEventId($data['event_age_categories'] ?? []));
            $this->bulkInsert('event_courts', $fixEventId($data['event_courts'] ?? []));

            // Categories: sanitize lock users and handle self-referencing merged_into_id in two passes
            $categoriesWithMerged = [];
            $matchCategories = collect($fixEventId($data['event_match_categories'] ?? []))->map(function ($mc) use ($remapUserId, &$categoriesWithMerged) {
                $mc['scoring_locked_by'] = $remapUserId($mc['scoring_locked_by'] ?? null);
                $mc['weigh_in_locked_by'] = $remapUserId($mc['weigh_in_locked_by'] ?? null);

                if (! empty($mc['merged_into_id'])) {
                    $categoriesWithMerged[$mc['id']] = $mc['merged_into_id'];
                    $mc['merged_into_id'] = null; // insert null first
                }

                return $mc;
            })->all();
            $this->bulkInsert('event_match_categories', $matchCategories);

            // Second pass for merged_into_id
            foreach ($categoriesWithMerged as $catId => $mergedIntoId) {
                if (DB::table('event_match_categories')->where('id', $mergedIntoId)->exists()) {
                    DB::table('event_match_categories')->where('id', $catId)->update(['merged_into_id' => $mergedIntoId]);
                }
            }

            $this->bulkInsert('rundowns', $fixEventId($data['rundowns'] ?? []));

            // Contingents: ensure valid user_id and handle self-referencing source_contingent_id
            $fallbackUserId = auth()->id() ?? DB::table('users')->value('id');
            $contingentsWithSource = [];
            $contingents = collect($fixEventId($data['contingents'] ?? []))->map(function ($c) use ($fallbackUserId, $remapUserId, &$contingentsWithSource) {
                $c['user_id'] = $remapUserId($c['user_id'] ?? null) ?? $fallbackUserId;

                if (! empty($c['source_contingent_id'])) {
                    $contingentsWithSource[$c['id']] = $c['source_contingent_id'];
                    $c['source_contingent_id'] = null; // insert null first
                }

                return $c;
            })->all();
            $this->bulkInsert('contingents', $contingents);

            // Second pass for source_contingent_id
            foreach ($contingentsWithSource as $contingentId => $sourceId) {
                if (DB::table('contingents')->where('id', $sourceId)->exists()) {
                    DB::table('contingents')->where('id', $contingentId)->update(['source_contingent_id' => $sourceId]);
                }
            }

            $this->bulkInsert('officials', $data['officials'] ?? []);

            // Athletes: sanitize school_verified_by
            $athletes = collect($data['athletes'] ?? [])->map(function ($a) use ($remapUserId) {
                $a['school_verified_by'] = $remapUserId($a['school_verified_by'] ?? null);

                return $a;
            })->all();
            $this->bulkInsert('athletes', $athletes);

            // Athlete rank histories: sanitize changed_by
            if (! empty($data['athlete_rank_histories'])) {
                $rankHistories = collect($data['athlete_rank_histories'])->map(function ($rh) use ($remapUserId) {
                    $rh['changed_by'] = $remapUserId($rh['changed_by'] ?? null);

                    return $rh;
                })->all();
                $this->bulkInsert('athlete_rank_histories', $rankHistories);
            }

            // Registrations: sanitize payment foreign keys and verification user
            $registrations = collect($fixEventId($data['registrations'] ?? []))->map(function ($r) use ($remapUserId) {
                if (! empty($r['payment_method_id']) && ! DB::table('payment_methods')->where('id', $r['payment_method_id'])->exists()) {
                    $r['payment_method_id'] = null;
                }
                $r['payment_verified_by'] = $remapUserId($r['payment_verified_by'] ?? null);

                return $r;
            })->all();
            $this->bulkInsert('registrations', $registrations);

            // Category entries: sanitize weigh_in users
            $categoryEntries = collect($fixEventId($data['athlete_match_category_entries'] ?? []))->map(function ($ce) use ($remapUserId) {
                $ce['weigh_in_by'] = $remapUserId($ce['weigh_in_by'] ?? null);
                $ce['weigh_in_locked_by'] = $remapUserId($ce['weigh_in_locked_by'] ?? null);

                return $ce;
            })->all();
            $this->bulkInsert('athlete_match_category_entries', $categoryEntries);

            $this->bulkInsert('embu_team_techniques', $fixEventId($data['embu_team_techniques'] ?? []));
            $this->bulkInsert('tournament_drawings', $fixEventId($data['tournament_drawings'] ?? []));

            // Tournament matches: two-pass for self-referencing next_match_id
            $matchesWithNext = [];
            $matches = collect($fixEventId($data['tournament_matches'] ?? []))->map(function ($m) use (&$matchesWithNext) {
                if (! empty($m['next_match_id'])) {
                    $matchesWithNext[$m['id']] = $m['next_match_id'];
                    $m['next_match_id'] = null; // insert null first
                }

                return $m;
            })->all();
            $this->bulkInsert('tournament_matches', $matches);

            // Second pass for next_match_id
            foreach ($matchesWithNext as $matchId => $nextMatchId) {
                if (DB::table('tournament_matches')->where('id', $nextMatchId)->exists()) {
                    DB::table('tournament_matches')->where('id', $matchId)->update(['next_match_id' => $nextMatchId]);
                }
            }

            // Embu scores: sanitize submitted_by / verified_by and ensure correct event_id
            $embuScores = collect($fixEventId($data['embu_scores'] ?? []))->map(function ($es) use ($remapUserId) {
                $es['submitted_by'] = $remapUserId($es['submitted_by'] ?? null);
                $es['verified_by'] = $remapUserId($es['verified_by'] ?? null);

                return $es;
            })->all();
            $this->bulkInsert('embu_scores', $embuScores);

            // Embu judge scores: remap referee_id and sanitize user_id
            $embuJudgeScores = collect($fixEventId($data['embu_judge_scores'] ?? []))->map(function ($row) use ($refereeIdMap, $remapUserId) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                $row['user_id'] = $remapUserId($row['user_id'] ?? null);

                return $row;
            })
                ->filter(fn ($row) => ! empty($row['referee_id']) && DB::table('referees')->where('id', $row['referee_id'])->exists())
                ->all();
            $this->bulkInsert('embu_judge_scores', $embuJudgeScores);

            // Randori scores: sanitize users
            $randoriScores = collect($fixEventId($data['randori_scores'] ?? []))->map(function ($rs) use ($remapUserId) {
                $rs['submitted_by'] = $remapUserId($rs['submitted_by'] ?? null);
                $rs['verified_by'] = $remapUserId($rs['verified_by'] ?? null);
                $rs['locked_by'] = $remapUserId($rs['locked_by'] ?? null);

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
            })
                ->filter(fn ($r) => ! empty($r['event_court_id']) && DB::table('event_courts')->where('id', $r['event_court_id'])->exists())
                ->unique(fn ($r) => ($r['event_court_id'] ?? '').'-'.($r['staff_type'] ?? '').'-'.$r['staff_id'])->values()->all();
            $this->bulkInsert('event_court_assignments', $courtAssignments);

            // Referee attendances: remap referee_id and sanitize checked_in_by_user_id
            $refereeAttendances = collect($fixEventId($data['referee_attendances'] ?? []))->map(function ($row) use ($refereeIdMap, $remapUserId) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                $row['checked_in_by_user_id'] = $remapUserId($row['checked_in_by_user_id'] ?? null);

                return $row;
            })
                ->filter(fn ($row) => ! empty($row['referee_id']) && DB::table('referees')->where('id', $row['referee_id'])->exists())
                ->unique(fn ($r) => $r['event_id'].'-'.$r['referee_id'].'-'.($r['attendance_date'] ?? ''))->values()->all();
            $this->bulkInsert('referee_attendances', $refereeAttendances);

            // Referee court attendances
            $refereeCourtAttendances = collect($fixEventId($data['referee_court_attendances'] ?? []))->map(function ($row) use ($refereeIdMap, $remapUserId) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                $row['checked_in_by_user_id'] = $remapUserId($row['checked_in_by_user_id'] ?? null);

                return $row;
            })
                ->filter(fn ($row) => ! empty($row['referee_id']) && DB::table('referees')->where('id', $row['referee_id'])->exists() && (empty($row['event_court_id']) || DB::table('event_courts')->where('id', $row['event_court_id'])->exists()))
                ->unique(fn ($r) => ($r['event_court_id'] ?? '').'-'.$r['referee_id'].'-'.($r['attendance_date'] ?? ''))->values()->all();
            $this->bulkInsert('referee_court_attendances', $refereeCourtAttendances);

            // Referee assignment histories
            $assignmentHistories = collect($fixEventId($data['referee_court_assignment_histories'] ?? []))->map(function ($row) use ($refereeIdMap, $remapUserId) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];
                $row['changed_by_user_id'] = $remapUserId($row['changed_by_user_id'] ?? null);

                return $row;
            })
                ->filter(fn ($row) => ! empty($row['referee_id']) && DB::table('referees')->where('id', $row['referee_id'])->exists() && (empty($row['event_court_id']) || DB::table('event_courts')->where('id', $row['event_court_id'])->exists()))
                ->all();
            $this->bulkInsert('referee_court_assignment_histories', $assignmentHistories);

            // Referee check-in codes
            if (! empty($data['referee_check_in_codes'])) {
                $checkInCodes = collect($fixEventId($data['referee_check_in_codes']))->map(function ($code) use ($targetEventId, $exportedEventId) {
                    if ($targetEventId !== $exportedEventId && ! empty($code['target_url'])) {
                        $code['target_url'] = str_replace($exportedEventId, $targetEventId, (string) $code['target_url']);
                    }

                    return $code;
                })
                    ->filter(fn ($c) => empty($c['event_court_id']) || DB::table('event_courts')->where('id', $c['event_court_id'])->exists())
                    ->all();
                $this->bulkInsert('referee_check_in_codes', $checkInCodes);
            }

            // Event referees
            $eventReferees = collect($fixEventId($data['event_referee'] ?? []))->map(function ($row) use ($refereeIdMap) {
                $row['referee_id'] = $refereeIdMap[$row['referee_id']] ?? $row['referee_id'];

                return $row;
            })
                ->filter(fn ($row) => ! empty($row['referee_id']) && DB::table('referees')->where('id', $row['referee_id'])->exists())
                ->unique(fn ($r) => $r['event_id'].'-'.$r['referee_id'])->values()->all();
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

            // Event arbitrators
            $eventArbitrators = collect($fixEventId($data['event_arbitrator'] ?? []))->map(function ($row) use ($arbitratorIdMap) {
                $row['arbitrator_id'] = $arbitratorIdMap[$row['arbitrator_id']] ?? $row['arbitrator_id'];

                return $row;
            })
                ->filter(fn ($row) => ! empty($row['arbitrator_id']) && DB::table('arbitrators')->where('id', $row['arbitrator_id'])->exists())
                ->unique(fn ($r) => $r['event_id'].'-'.$r['arbitrator_id'])->values()->all();
            $this->bulkInsert('event_arbitrator', $eventArbitrators);

            $this->bulkInsert('event_payment_method', $fixEventId($data['event_payment_method'] ?? []));

            if (! empty($data['event_user'])) {
                $euCols = Schema::getColumnListing('event_user');
                foreach ($data['event_user'] as $eu) {
                    $targetUid = $remapUserId($eu['user_id'] ?? null);
                    if ($targetUid) {
                        $euRow = collect($eu)
                            ->only($euCols)
                            ->put('event_id', $targetEventId)
                            ->put('user_id', $targetUid)
                            ->all();

                        DB::table('event_user')->updateOrInsert(
                            ['event_id' => $targetEventId, 'user_id' => $targetUid],
                            $euRow
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
                    'users' => count($data['users'] ?? []),
                    'referee_check_in_codes' => count($data['referee_check_in_codes'] ?? []),
                ],
            ];
        });
    }

    /**
     * Safely bulk insert rows into a table, automatically filtering only existing columns and encoding arrays as JSON.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function bulkInsert(string $table, array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        $columns = Schema::getColumnListing($table);
        $filtered = array_map(function ($r) use ($columns) {
            $row = collect($r)->only($columns)->all();
            foreach ($row as $col => $val) {
                if (is_array($val)) {
                    $row[$col] = json_encode($val, JSON_UNESCAPED_UNICODE);
                }
            }

            return $row;
        }, $rows);

        foreach (array_chunk($filtered, 100) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }
}
