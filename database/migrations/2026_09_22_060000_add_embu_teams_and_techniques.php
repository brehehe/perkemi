<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('athlete_match_category_entries', function (Blueprint $table) {
            $table->unsignedTinyInteger('team_number')->default(1)->after('event_match_category_id');
            $table->index(['event_match_category_id', 'team_number']);
        });

        Schema::create('embu_team_techniques', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('contingent_id')->constrained('contingents')->cascadeOnDelete();
            $table->foreignUuid('event_match_category_id')->constrained('event_match_categories')->cascadeOnDelete();
            $table->unsignedTinyInteger('team_number');
            $table->foreignUuid('technique_id')->constrained('techniques')->cascadeOnDelete();
            $table->unsignedSmallInteger('order');
            $table->timestamps();

            $table->unique(['contingent_id', 'event_match_category_id', 'team_number', 'technique_id'], 'embu_team_techniques_unique');
            $table->index(['contingent_id', 'event_match_category_id', 'team_number', 'order'], 'embu_team_techniques_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('embu_team_techniques');
        Schema::table('athlete_match_category_entries', function (Blueprint $table) {
            $table->dropIndex(['event_match_category_id', 'team_number']);
            $table->dropColumn('team_number');
        });
    }
};
