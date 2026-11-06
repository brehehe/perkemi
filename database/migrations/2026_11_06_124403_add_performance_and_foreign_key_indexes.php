<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. tournament_matches high-frequency FK & composite indexes
        if (Schema::hasTable('tournament_matches')) {
            Schema::table('tournament_matches', function (Blueprint $table) {
                $table->index('event_match_category_id', 'tm_category_id_idx');
                $table->index('rundown_id', 'tm_rundown_id_idx');
                $table->index('next_match_id', 'tm_next_match_id_idx');
                $table->index('red_entry_id', 'tm_red_entry_id_idx');
                $table->index('blue_entry_id', 'tm_blue_entry_id_idx');
                $table->index('participant_entry_id', 'tm_participant_entry_id_idx');
            });
        }

        // 2. contingents user link
        if (Schema::hasTable('contingents') && Schema::hasColumn('contingents', 'user_id')) {
            Schema::table('contingents', function (Blueprint $table) {
                $table->index('user_id', 'contingents_user_id_idx');
            });
        }

        // 3. athletes age category
        if (Schema::hasTable('athletes') && Schema::hasColumn('athletes', 'event_age_category_id')) {
            Schema::table('athletes', function (Blueprint $table) {
                $table->index('event_age_category_id', 'athletes_age_category_idx');
            });
        }

        // 4. embu_team_techniques event
        if (Schema::hasTable('embu_team_techniques') && Schema::hasColumn('embu_team_techniques', 'event_id')) {
            Schema::table('embu_team_techniques', function (Blueprint $table) {
                $table->index('event_id', 'ett_event_id_idx');
            });
        }

        // 5. registrations payment method
        if (Schema::hasTable('registrations') && Schema::hasColumn('registrations', 'payment_method_id')) {
            Schema::table('registrations', function (Blueprint $table) {
                $table->index('payment_method_id', 'registrations_payment_method_idx');
            });
        }

        // 6. tournament_results athlete
        if (Schema::hasTable('tournament_results') && Schema::hasColumn('tournament_results', 'athlete_id')) {
            Schema::table('tournament_results', function (Blueprint $table) {
                $table->index('athlete_id', 'tr_athlete_id_idx');
            });
        }

        // 7. event_match_categories weight class & merged category
        if (Schema::hasTable('event_match_categories')) {
            Schema::table('event_match_categories', function (Blueprint $table) {
                if (Schema::hasColumn('event_match_categories', 'weight_class_id')) {
                    $table->index('weight_class_id', 'emc_weight_class_id_idx');
                }
                if (Schema::hasColumn('event_match_categories', 'merged_into_id')) {
                    $table->index('merged_into_id', 'emc_merged_into_id_idx');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('tournament_matches')) {
            Schema::table('tournament_matches', function (Blueprint $table) {
                $table->dropIndex('tm_category_id_idx');
                $table->dropIndex('tm_rundown_id_idx');
                $table->dropIndex('tm_next_match_id_idx');
                $table->dropIndex('tm_red_entry_id_idx');
                $table->dropIndex('tm_blue_entry_id_idx');
                $table->dropIndex('tm_participant_entry_id_idx');
            });
        }

        if (Schema::hasTable('contingents')) {
            Schema::table('contingents', function (Blueprint $table) {
                $table->dropIndex('contingents_user_id_idx');
            });
        }

        if (Schema::hasTable('athletes')) {
            Schema::table('athletes', function (Blueprint $table) {
                $table->dropIndex('athletes_age_category_idx');
            });
        }

        if (Schema::hasTable('embu_team_techniques')) {
            Schema::table('embu_team_techniques', function (Blueprint $table) {
                $table->dropIndex('ett_event_id_idx');
            });
        }

        if (Schema::hasTable('registrations')) {
            Schema::table('registrations', function (Blueprint $table) {
                $table->dropIndex('registrations_payment_method_idx');
            });
        }

        if (Schema::hasTable('tournament_results')) {
            Schema::table('tournament_results', function (Blueprint $table) {
                $table->dropIndex('tr_athlete_id_idx');
            });
        }

        if (Schema::hasTable('event_match_categories')) {
            Schema::table('event_match_categories', function (Blueprint $table) {
                if (Schema::hasColumn('event_match_categories', 'weight_class_id')) {
                    $table->dropIndex('emc_weight_class_id_idx');
                }
                if (Schema::hasColumn('event_match_categories', 'merged_into_id')) {
                    $table->dropIndex('emc_merged_into_id_idx');
                }
            });
        }
    }
};
