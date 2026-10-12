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
        Schema::create('embu_judge_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('tournament_match_id')->constrained('tournament_matches')->cascadeOnDelete();
            $table->foreignUuid('event_court_id')->constrained('event_courts')->cascadeOnDelete();
            $table->foreignUuid('referee_id')->constrained('referees')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('tiebreak_round')->default(0);
            $table->unsignedTinyInteger('judge_number');
            $table->string('role', 40);
            $table->json('aspect_scores');
            $table->unsignedTinyInteger('completed_items')->default(0);
            $table->decimal('technique_subtotal', 8, 2)->default(0);
            $table->decimal('expression_subtotal', 8, 2)->default(0);
            $table->decimal('total_score', 8, 2)->default(0);
            $table->string('status', 30)->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['tournament_match_id', 'tiebreak_round', 'judge_number'], 'embu_judge_match_round_number_unique');
            $table->index(['event_id', 'event_court_id', 'status'], 'embu_judge_event_court_status_index');
            $table->index(['referee_id', 'updated_at'], 'embu_judge_referee_updated_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('embu_judge_scores');
    }
};
