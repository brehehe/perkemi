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
        Schema::create('athlete_match_category_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('athlete_id')->constrained('athletes')->cascadeOnDelete();
            $table->foreignUuid('event_match_category_id')->constrained('event_match_categories')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['athlete_id', 'event_match_category_id']);
            $table->index(['event_id', 'athlete_id']);
            $table->index(['event_match_category_id', 'athlete_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('athlete_match_category_entries');
    }
};
