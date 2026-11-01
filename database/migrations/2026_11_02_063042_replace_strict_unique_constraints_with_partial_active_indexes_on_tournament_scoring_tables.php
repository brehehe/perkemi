<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        // 1. tournament_matches: replace strict unique (tournament_drawing_id, match_sequence)
        if (Schema::hasTable('tournament_matches')) {
            if ($driver === 'pgsql') {
                DB::statement('ALTER TABLE tournament_matches DROP CONSTRAINT IF EXISTS tournament_matches_tournament_drawing_id_match_sequence_unique');
                DB::statement('DROP INDEX IF EXISTS tournament_matches_tournament_drawing_id_match_sequence_unique');
            } else {
                try {
                    Schema::table('tournament_matches', function (Blueprint $t) {
                        $t->dropUnique(['tournament_drawing_id', 'match_sequence']);
                    });
                } catch (Throwable $e) {
                    // Ignore
                }
            }

            try {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS tournament_matches_drawing_sequence_active_unique ON tournament_matches (tournament_drawing_id, match_sequence) WHERE deleted_at IS NULL');
            } catch (Throwable $e) {
                // Ignore
            }
        }

        // 2. randori_scores: replace strict unique (tournament_match_id)
        if (Schema::hasTable('randori_scores')) {
            if ($driver === 'pgsql') {
                DB::statement('ALTER TABLE randori_scores DROP CONSTRAINT IF EXISTS randori_scores_tournament_match_id_unique');
                DB::statement('DROP INDEX IF EXISTS randori_scores_tournament_match_id_unique');
            } else {
                try {
                    Schema::table('randori_scores', function (Blueprint $t) {
                        $t->dropUnique(['tournament_match_id']);
                    });
                } catch (Throwable $e) {
                    // Ignore
                }
            }

            try {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS randori_scores_match_active_unique ON randori_scores (tournament_match_id) WHERE deleted_at IS NULL');
            } catch (Throwable $e) {
                // Ignore
            }
        }

        // 3. embu_scores: replace strict unique (tournament_match_id, tiebreak_round)
        if (Schema::hasTable('embu_scores')) {
            if ($driver === 'pgsql') {
                DB::statement('ALTER TABLE embu_scores DROP CONSTRAINT IF EXISTS embu_scores_tournament_match_id_tiebreak_round_unique');
                DB::statement('DROP INDEX IF EXISTS embu_scores_tournament_match_id_tiebreak_round_unique');
            } else {
                try {
                    Schema::table('embu_scores', function (Blueprint $t) {
                        $t->dropUnique(['tournament_match_id', 'tiebreak_round']);
                    });
                } catch (Throwable $e) {
                    // Ignore
                }
            }

            try {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS embu_scores_match_round_active_unique ON embu_scores (tournament_match_id, tiebreak_round) WHERE deleted_at IS NULL');
            } catch (Throwable $e) {
                // Ignore
            }
        }

        // 4. embu_judge_scores: replace strict unique (tournament_match_id, tiebreak_round, judge_number)
        if (Schema::hasTable('embu_judge_scores')) {
            if ($driver === 'pgsql') {
                DB::statement('ALTER TABLE embu_judge_scores DROP CONSTRAINT IF EXISTS embu_judge_match_round_number_unique');
                DB::statement('DROP INDEX IF EXISTS embu_judge_match_round_number_unique');
            } else {
                try {
                    Schema::table('embu_judge_scores', function (Blueprint $t) {
                        $t->dropUnique('embu_judge_match_round_number_unique');
                    });
                } catch (Throwable $e) {
                    // Ignore
                }
            }

            try {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS embu_judge_scores_match_round_number_active_unique ON embu_judge_scores (tournament_match_id, tiebreak_round, judge_number) WHERE deleted_at IS NULL');
            } catch (Throwable $e) {
                // Ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('DROP INDEX IF EXISTS tournament_matches_drawing_sequence_active_unique');
            DB::statement('DROP INDEX IF EXISTS randori_scores_match_active_unique');
            DB::statement('DROP INDEX IF EXISTS embu_scores_match_round_active_unique');
            DB::statement('DROP INDEX IF EXISTS embu_judge_scores_match_round_number_active_unique');
        } catch (Throwable $e) {
            // Ignore
        }
    }
};
