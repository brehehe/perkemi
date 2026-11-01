<?php

namespace App\Services\Admin\Event;

use App\Models\Event;
use Illuminate\Support\Facades\DB;
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
        $eventId = $eventRow['id'];

        return DB::transaction(function () use ($data, $eventRow, $eventId): array {
            // 1. Upsert Referenced Master Staff (Referees, Clerks, Coordinators)
            if (! empty($data['referees'])) {
                foreach ($data['referees'] as $referee) {
                    DB::table('referees')->updateOrInsert(['id' => $referee['id']], $referee);
                }
            }

            if (! empty($data['clerks'])) {
                foreach ($data['clerks'] as $clerk) {
                    DB::table('clerks')->updateOrInsert(['id' => $clerk['id']], $clerk);
                }
            }

            if (! empty($data['field_coordinators'])) {
                foreach ($data['field_coordinators'] as $coord) {
                    DB::table('field_coordinators')->updateOrInsert(['id' => $coord['id']], $coord);
                }
            }

            // 2. Clean old child data for this event in reverse dependency order
            $oldMatches = DB::table('tournament_matches')->where('event_id', $eventId)->pluck('id')->all();
            $oldCourts = DB::table('event_courts')->where('event_id', $eventId)->pluck('id')->all();
            $oldContingents = DB::table('contingents')->where('event_id', $eventId)->pluck('id')->all();

            DB::table('tournament_results')->where('event_id', $eventId)->delete();

            if (! empty($oldMatches)) {
                DB::table('tournament_match_var_reviews')
                    ->where('event_id', $eventId)
                    ->orWhereIn('tournament_match_id', $oldMatches)
                    ->delete();
                DB::table('embu_scores')->whereIn('tournament_match_id', $oldMatches)->delete();
                DB::table('randori_scores')
                    ->where('event_id', $eventId)
                    ->orWhereIn('tournament_match_id', $oldMatches)
                    ->delete();
            }

            DB::table('embu_judge_scores')->where('event_id', $eventId)->delete();
            DB::table('tournament_matches')->where('event_id', $eventId)->delete();
            DB::table('tournament_drawings')->where('event_id', $eventId)->delete();
            DB::table('embu_team_techniques')->where('event_id', $eventId)->delete();
            DB::table('athlete_match_category_entries')->where('event_id', $eventId)->delete();
            DB::table('registrations')->where('event_id', $eventId)->delete();

            DB::table('referee_court_assignment_histories')->where('event_id', $eventId)->delete();
            DB::table('referee_court_attendances')->where('event_id', $eventId)->delete();
            DB::table('referee_attendances')->where('event_id', $eventId)->delete();

            if (! empty($oldCourts)) {
                DB::table('event_court_assignments')->whereIn('event_court_id', $oldCourts)->delete();
            }

            if (! empty($oldContingents)) {
                DB::table('officials')->whereIn('contingent_id', $oldContingents)->delete();
                DB::table('athletes')->whereIn('contingent_id', $oldContingents)->delete();
            }

            DB::table('contingents')->where('event_id', $eventId)->delete();
            DB::table('rundowns')->where('event_id', $eventId)->delete();
            DB::table('event_match_categories')->where('event_id', $eventId)->delete();
            DB::table('event_courts')->where('event_id', $eventId)->delete();
            DB::table('event_age_categories')->where('event_id', $eventId)->delete();

            // Clean old pivots
            DB::table('event_referee')->where('event_id', $eventId)->delete();
            DB::table('clerk_event')->where('event_id', $eventId)->delete();
            DB::table('event_field_coordinator')->where('event_id', $eventId)->delete();
            DB::table('event_payment_method')->where('event_id', $eventId)->delete();

            // 3. Upsert Event Core
            DB::table('events')->updateOrInsert(['id' => $eventId], $eventRow);

            // 4. Insert Child Tables in Dependency Order
            $this->bulkInsert('event_age_categories', $data['event_age_categories'] ?? []);
            $this->bulkInsert('event_courts', $data['event_courts'] ?? []);
            $this->bulkInsert('event_match_categories', $data['event_match_categories'] ?? []);
            $this->bulkInsert('rundowns', $data['rundowns'] ?? []);

            $this->bulkInsert('contingents', $data['contingents'] ?? []);
            $this->bulkInsert('officials', $data['officials'] ?? []);
            $this->bulkInsert('athletes', $data['athletes'] ?? []);

            $this->bulkInsert('registrations', $data['registrations'] ?? []);
            $this->bulkInsert('athlete_match_category_entries', $data['athlete_match_category_entries'] ?? []);
            $this->bulkInsert('embu_team_techniques', $data['embu_team_techniques'] ?? []);
            $this->bulkInsert('tournament_drawings', $data['tournament_drawings'] ?? []);

            $this->bulkInsert('tournament_matches', $data['tournament_matches'] ?? []);
            $this->bulkInsert('embu_scores', $data['embu_scores'] ?? []);
            $this->bulkInsert('embu_judge_scores', $data['embu_judge_scores'] ?? []);
            $this->bulkInsert('randori_scores', $data['randori_scores'] ?? []);
            $this->bulkInsert('tournament_match_var_reviews', $data['tournament_match_var_reviews'] ?? []);
            $this->bulkInsert('tournament_results', $data['tournament_results'] ?? []);

            $this->bulkInsert('event_court_assignments', $data['event_court_assignments'] ?? []);
            $this->bulkInsert('referee_attendances', $data['referee_attendances'] ?? []);
            $this->bulkInsert('referee_court_attendances', $data['referee_court_attendances'] ?? []);
            $this->bulkInsert('referee_court_assignment_histories', $data['referee_court_assignment_histories'] ?? []);

            $this->bulkInsert('event_referee', $data['event_referee'] ?? []);
            $this->bulkInsert('clerk_event', $data['clerk_event'] ?? []);
            $this->bulkInsert('event_field_coordinator', $data['event_field_coordinator'] ?? []);
            $this->bulkInsert('event_payment_method', $data['event_payment_method'] ?? []);

            if (! empty($data['event_user'])) {
                foreach ($data['event_user'] as $eu) {
                    if (DB::table('users')->where('id', $eu['user_id'])->exists()) {
                        DB::table('event_user')->updateOrInsert(
                            ['event_id' => $eu['event_id'], 'user_id' => $eu['user_id']],
                            $eu
                        );
                    }
                }
            }

            return [
                'event_id' => $eventId,
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
     * Safely bulk insert rows into a table.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function bulkInsert(string $table, array $rows): void
    {
        if (empty($rows)) {
            return;
        }

        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }
}
