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
        Schema::create('embu_scores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('tournament_match_id')->constrained('tournament_matches')->cascadeOnDelete();
            $table->unsignedSmallInteger('tiebreak_round')->default(0);
            $table->json('judge_scores');
            $table->unsignedSmallInteger('duration_seconds')->nullable();
            $table->decimal('time_penalty', 8, 2)->default(0);
            $table->decimal('middle_score', 8, 2);
            $table->decimal('final_score', 8, 2);
            $table->string('status', 30)->default('verified');
            $table->foreignUuid('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['tournament_match_id', 'tiebreak_round']);
            $table->index(['event_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('embu_scores');
    }
};
