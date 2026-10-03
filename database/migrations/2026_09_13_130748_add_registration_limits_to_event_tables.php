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
            $table->unsignedTinyInteger('max_match_categories_per_athlete')
                ->default(1)
                ->after('fee_per_contingent');
        });

        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_athletes_per_team')
                ->default(1)
                ->after('capacity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->dropColumn('max_athletes_per_team');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('max_match_categories_per_athlete');
        });
    }
};
