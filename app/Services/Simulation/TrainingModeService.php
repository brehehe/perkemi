<?php

namespace App\Services\Simulation;

use App\Enums\ContingentStatus;
use App\Models\Athlete;
use App\Models\AthleteMatchCategoryEntry;
use App\Models\Contingent;
use App\Models\EmbuJudgeScore;
use App\Models\EmbuScore;
use App\Models\Event;
use App\Models\EventCourt;
use App\Models\EventMatchCategory;
use App\Models\RandoriScore;
use App\Models\TournamentDrawing;
use App\Models\TournamentMatch;
use App\Models\TournamentMatchVarReview;
use App\Models\TournamentResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TrainingModeService
{
    /**
     * Toggle the training / sandbox mode for the given event.
     */
    public function toggleTrainingMode(Event $event, ?bool $enabled = null): bool
    {
        $newState = $enabled ?? ! $event->is_training_mode;
        $event->update(['is_training_mode' => $newState]);

        return $newState;
    }

    /**
     * Purge and reset all simulation matches and scores without affecting official master data.
     *
     * @return array{
     *     matches_deleted: int,
     *     drawings_deleted: int,
     *     scores_deleted: int,
     *     var_reviews_deleted: int,
     *     results_deleted: int
     * }
     */
    public function resetSimulationData(Event $event): array
    {
        return DB::transaction(function () use ($event) {
            $matchIds = TournamentMatch::query()->whereBelongsTo($event)->pluck('id');

            $varReviewsCount = TournamentMatchVarReview::query()->whereBelongsTo($event)->delete();
            $embuJudgeCount = EmbuJudgeScore::query()->whereBelongsTo($event)->delete();
            $embuScoresCount = EmbuScore::query()->whereIn('tournament_match_id', $matchIds)->delete();
            $randoriScoresCount = RandoriScore::query()->whereIn('tournament_match_id', $matchIds)->delete();
            $resultsCount = TournamentResult::query()->whereBelongsTo($event)->delete();
            $matchesCount = TournamentMatch::query()->whereBelongsTo($event)->delete();
            $drawingsCount = TournamentDrawing::query()->whereBelongsTo($event)->delete();

            // Reset weigh-in test flags on entries if in training mode
            AthleteMatchCategoryEntry::query()
                ->whereBelongsTo($event)
                ->update([
                    'actual_weight' => null,
                    'weigh_in_status' => 'pending',
                    'weigh_in_notes' => null,
                    'weigh_in_at' => null,
                    'weigh_in_locked_at' => null,
                    'weigh_in_by' => null,
                    'competition_status' => 'active',
                    'status_notes' => null,
                ]);

            return [
                'matches_deleted' => $matchesCount,
                'drawings_deleted' => $drawingsCount,
                'scores_deleted' => $embuScoresCount + $randoriScoresCount + $embuJudgeCount,
                'var_reviews_deleted' => $varReviewsCount,
                'results_deleted' => $resultsCount,
            ];
        });
    }

    /**
     * Seed a realistic mock match dataset for training and rehearsal.
     *
     * @return array{message: string, matches_created: int}
     */
    public function seedSimulationMatches(Event $event): array
    {
        return DB::transaction(function () use ($event) {
            // Ensure training mode is enabled
            if (! $event->is_training_mode) {
                $event->update(['is_training_mode' => true]);
            }

            // Ensure at least one court exists
            $court = EventCourt::query()->whereBelongsTo($event)->first()
                ?? EventCourt::query()->create([
                    'event_id' => $event->id,
                    'name' => 'Tatami 1 (Gladi Bersih)',
                    'is_active' => true,
                ]);

            // Ensure at least two contingents exist
            $user = $event->users()->first() ?? User::first();
            $contingentA = Contingent::query()->whereBelongsTo($event)->first()
                ?? Contingent::query()->create([
                    'event_id' => $event->id,
                    'user_id' => $user?->id ?? (string) Str::uuid(),
                    'name' => 'Kontingen Simulasi Merah (Surabaya)',
                    'city' => 'Surabaya',
                    'manager_name' => 'Manajer Gladi A',
                    'phone' => '081234567890',
                    'status' => ContingentStatus::Verified,
                ]);

            $contingentB = Contingent::query()->whereBelongsTo($event)->where('id', '!=', $contingentA->id)->first()
                ?? Contingent::query()->create([
                    'event_id' => $event->id,
                    'user_id' => $user?->id ?? (string) Str::uuid(),
                    'name' => 'Kontingen Simulasi Putih (Malang)',
                    'city' => 'Malang',
                    'manager_name' => 'Manajer Gladi B',
                    'phone' => '081234567891',
                    'status' => ContingentStatus::Verified,
                ]);

            // Ensure categories exist
            $randoriCat = EventMatchCategory::query()->whereBelongsTo($event)->where('type', 'randori')->first()
                ?? EventMatchCategory::query()->create([
                    'event_id' => $event->id,
                    'name' => 'Randori Putra Dewasa - Simulasi',
                    'type' => 'randori',
                    'gender' => 'male',
                    'order' => 99,
                    'is_active' => true,
                ]);

            $embuCat = EventMatchCategory::query()->whereBelongsTo($event)->where('type', 'embu')->first()
                ?? EventMatchCategory::query()->create([
                    'event_id' => $event->id,
                    'name' => 'Embu Berpasangan Yudansha - Simulasi',
                    'type' => 'embu',
                    'gender' => 'mixed',
                    'order' => 100,
                    'is_active' => true,
                ]);

            // Create athletes & entries if needed
            $athleteA = Athlete::query()->create([
                'contingent_id' => $contingentA->id,
                'name' => 'Kenshi Simulasi AKA',
                'gender' => 'male',
                'birth_date' => '2000-01-01',
            ]);
            $athleteB = Athlete::query()->create([
                'contingent_id' => $contingentB->id,
                'name' => 'Kenshi Simulasi SHIRO',
                'gender' => 'male',
                'birth_date' => '2001-01-01',
            ]);

            $entryA = AthleteMatchCategoryEntry::query()->create([
                'event_id' => $event->id,
                'athlete_id' => $athleteA->id,
                'event_match_category_id' => $randoriCat->id,
            ]);
            $entryB = AthleteMatchCategoryEntry::query()->create([
                'event_id' => $event->id,
                'athlete_id' => $athleteB->id,
                'event_match_category_id' => $randoriCat->id,
            ]);

            // Create Drawing
            $drawing = TournamentDrawing::query()->create([
                'event_id' => $event->id,
                'event_match_category_id' => $randoriCat->id,
                'status' => 'in_progress',
                'bracket_type' => 'single_elimination',
                'participant_count' => 2,
                'contingent_count' => 2,
                'generated_at' => now(),
            ]);

            // Create 1 active Randori match ready for rehearsals
            $matchRandori = TournamentMatch::query()->create([
                'event_id' => $event->id,
                'event_court_id' => $court->id,
                'event_match_category_id' => $randoriCat->id,
                'tournament_drawing_id' => $drawing->id,
                'phase' => 'final',
                'round_label' => 'Final Simulasi',
                'match_sequence' => 1,
                'pool' => 'A',
                'status' => 'in_progress',
                'call_status' => 'ready',
                'red_entry_id' => $entryA->id,
                'blue_entry_id' => $entryB->id,
                'red_label' => 'AKA: '.$contingentA->name,
                'blue_label' => 'SHIRO: '.$contingentB->name,
                'metadata' => ['is_simulated' => true],
            ]);

            // Create Initial Randori Score draft
            RandoriScore::query()->create([
                'event_id' => $event->id,
                'tournament_match_id' => $matchRandori->id,
                'aka_total' => 1,
                'shiro_total' => 0,
                'winner_corner' => 'aka',
                'aka_breakdown' => ['waza_ari' => 1, 'ippon' => 0],
                'shiro_breakdown' => ['waza_ari' => 0, 'ippon' => 0],
                'status' => 'draft',
            ]);

            return [
                'message' => 'Data partai gladi bersih berhasil digenerate.',
                'matches_created' => 1,
            ];
        });
    }

    /**
     * Get summary status of the training mode for UI display.
     *
     * @return array<string, mixed>
     */
    public function status(Event $event): array
    {
        $matchCount = TournamentMatch::query()->whereBelongsTo($event)->count();
        $varReviewCount = TournamentMatchVarReview::query()->whereBelongsTo($event)->count();

        return [
            'is_training_mode' => (bool) $event->is_training_mode,
            'matches_count' => $matchCount,
            'var_reviews_count' => $varReviewCount,
            'badge_label' => $event->is_training_mode ? 'Mode Simulasi / Gladi Bersih' : 'Mode Turnamen Resmi',
            'tone' => $event->is_training_mode ? 'amber' : 'emerald',
        ];
    }
}
