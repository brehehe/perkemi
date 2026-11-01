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
        $tables = [
            'tournament_drawings',
            'tournament_matches',
            'embu_scores',
            'embu_judge_scores',
            'randori_scores',
            'referee_court_assignment_histories',
            'tournament_match_var_reviews',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, 'deleted_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->softDeletes();
                });
            }
        }

        // Drop strict unique constraint on tournament_drawings and replace with partial unique index where deleted_at IS NULL
        if (Schema::hasTable('tournament_drawings')) {
            try {
                Schema::table('tournament_drawings', function (Blueprint $t) {
                    $t->dropUnique(['event_id', 'event_match_category_id']);
                });
            } catch (Throwable $e) {
                // If named differently or already dropped
            }

            try {
                DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS tournament_drawings_event_category_active_unique ON tournament_drawings (event_id, event_match_category_id) WHERE deleted_at IS NULL');
            } catch (Throwable $e) {
                // Ignore if not supported or already exists
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('tournament_drawings')) {
            try {
                DB::statement('DROP INDEX IF EXISTS tournament_drawings_event_category_active_unique');
            } catch (Throwable $e) {
                // Ignore
            }

            try {
                Schema::table('tournament_drawings', function (Blueprint $t) {
                    $t->unique(['event_id', 'event_match_category_id']);
                });
            } catch (Throwable $e) {
                // Ignore
            }
        }

        $tables = [
            'tournament_drawings',
            'tournament_matches',
            'embu_scores',
            'embu_judge_scores',
            'randori_scores',
            'referee_court_assignment_histories',
            'tournament_match_var_reviews',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'deleted_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropSoftDeletes();
                });
            }
        }
    }
};
