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
        Schema::create('tournament_matches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tournament_drawing_id')->constrained('tournament_drawings')->cascadeOnDelete();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('event_match_category_id')->constrained('event_match_categories')->cascadeOnDelete();
            $table->foreignUuid('event_court_id')->nullable()->constrained('event_courts')->nullOnDelete();
            $table->foreignUuid('rundown_id')->nullable()->constrained('rundowns')->nullOnDelete();
            $table->uuid('next_match_id')->nullable();
            $table->foreignUuid('red_entry_id')->nullable()->constrained('athlete_match_category_entries')->nullOnDelete();
            $table->foreignUuid('blue_entry_id')->nullable()->constrained('athlete_match_category_entries')->nullOnDelete();
            $table->foreignUuid('participant_entry_id')->nullable()->constrained('athlete_match_category_entries')->nullOnDelete();
            $table->string('phase', 30);
            $table->string('round_label', 80);
            $table->string('pool', 10)->nullable();
            $table->unsignedInteger('match_sequence');
            $table->unsignedSmallInteger('bracket_position')->default(0);
            $table->string('red_label')->nullable();
            $table->string('blue_label')->nullable();
            $table->string('participant_label')->nullable();
            $table->dateTime('scheduled_start_at')->nullable();
            $table->dateTime('scheduled_end_at')->nullable();
            $table->string('status', 30)->default('pending');
            $table->boolean('is_bye')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['tournament_drawing_id', 'match_sequence']);
            $table->index(['event_id', 'phase', 'scheduled_start_at']);
            $table->index(['event_court_id', 'scheduled_start_at']);
        });

        Schema::table('tournament_matches', function (Blueprint $table) {
            $table->foreign('next_match_id')->references('id')->on('tournament_matches')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tournament_matches');
    }
};
