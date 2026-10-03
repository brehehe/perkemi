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
        Schema::create('tournament_drawings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('event_match_category_id')->constrained('event_match_categories')->cascadeOnDelete();
            $table->string('status', 30)->default('draft');
            $table->string('bracket_type', 50)->nullable();
            $table->unsignedSmallInteger('participant_count')->default(0);
            $table->unsignedSmallInteger('contingent_count')->default(0);
            $table->text('skip_reason')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'event_match_category_id']);
            $table->index(['event_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tournament_drawings');
    }
};
