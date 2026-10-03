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
        // 1. contingents
        Schema::table('contingents', function (Blueprint $table) {
            $table->foreignUuid('event_id')->nullable()->after('user_id')->constrained('events')->nullOnDelete();
            $table->index(['event_id', 'status']);
        });

        // 2. registrations
        Schema::table('registrations', function (Blueprint $table) {
            $table->foreignUuid('event_id')->nullable()->after('contingent_id')->constrained('events')->nullOnDelete();
            $table->index(['event_id', 'status']);
        });

        // 3. tournament_results
        Schema::table('tournament_results', function (Blueprint $table) {
            $table->foreignUuid('event_id')->nullable()->after('id')->constrained('events')->nullOnDelete();
            $table->index(['event_id', 'rank']);
        });

        // 4. rundowns
        Schema::table('rundowns', function (Blueprint $table) {
            $table->foreignUuid('event_id')->nullable()->after('id')->constrained('events')->nullOnDelete();
            $table->index(['event_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rundowns', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropIndex(['event_id', 'date']);
            $table->dropColumn('event_id');
        });

        Schema::table('tournament_results', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropIndex(['event_id', 'rank']);
            $table->dropColumn('event_id');
        });

        Schema::table('registrations', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropIndex(['event_id', 'status']);
            $table->dropColumn('event_id');
        });

        Schema::table('contingents', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropIndex(['event_id', 'status']);
            $table->dropColumn('event_id');
        });
    }
};
