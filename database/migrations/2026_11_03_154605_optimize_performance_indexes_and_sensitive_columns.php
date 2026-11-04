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
        // 1. Optimize tournament_matches live query and status filtering
        if (Schema::hasTable('tournament_matches')) {
            Schema::table('tournament_matches', function (Blueprint $table) {
                $table->index(['event_court_id', 'status', 'is_bye'], 'tm_court_status_bye_idx');
                $table->index(['event_id', 'status'], 'tm_event_status_idx');
            });
        }

        // 2. Optimize athlete_match_category_entries weigh-in query
        if (Schema::hasTable('athlete_match_category_entries')) {
            Schema::table('athlete_match_category_entries', function (Blueprint $table) {
                $table->index(['event_id', 'weigh_in_status'], 'entries_event_weigh_in_status_idx');
            });
        }

        // 3. Enlarge bpjs_number in athletes to TEXT to safely accommodate encrypted payloads
        if (Schema::hasTable('athletes') && Schema::hasColumn('athletes', 'bpjs_number')) {
            Schema::table('athletes', function (Blueprint $table) {
                $table->text('bpjs_number')->nullable()->change();
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
                $table->dropIndex('tm_court_status_bye_idx');
                $table->dropIndex('tm_event_status_idx');
            });
        }

        if (Schema::hasTable('athlete_match_category_entries')) {
            Schema::table('athlete_match_category_entries', function (Blueprint $table) {
                $table->dropIndex('entries_event_weigh_in_status_idx');
            });
        }

        if (Schema::hasTable('athletes') && Schema::hasColumn('athletes', 'bpjs_number')) {
            Schema::table('athletes', function (Blueprint $table) {
                $table->string('bpjs_number', 40)->nullable()->change();
            });
        }
    }
};
