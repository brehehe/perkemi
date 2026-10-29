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
        Schema::table('events', function (Blueprint $table) {
            $table->string('champion_ranking_system', 20)->default('medals')->after('tts_announcer_enabled');
            $table->unsignedSmallInteger('champion_gold_points')->default(5)->after('champion_ranking_system');
            $table->unsignedSmallInteger('champion_silver_points')->default(3)->after('champion_gold_points');
            $table->unsignedSmallInteger('champion_bronze_points')->default(1)->after('champion_silver_points');
        });

        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->string('preferred_bracket_type', 50)->nullable()->after('is_combined');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->dropColumn('preferred_bracket_type');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'champion_ranking_system',
                'champion_gold_points',
                'champion_silver_points',
                'champion_bronze_points',
            ]);
        });
    }
};
