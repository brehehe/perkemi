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
        Schema::create('tournament_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('contingent_id')->nullable()->constrained('contingents')->nullOnDelete();
            $table->foreignUuid('athlete_id')->nullable()->constrained('athletes')->nullOnDelete();
            $table->string('contingent_name');
            $table->unsignedSmallInteger('rank'); // 1 = Emas, 2 = Perak, 3 = Perunggu, 4 = Harapan
            $table->string('match_category')->nullable(); // Randori / Embu
            $table->timestamps();
            $table->softDeletes();

            $table->index(['contingent_id', 'rank']);
            $table->index(['rank', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tournament_results');
    }
};
