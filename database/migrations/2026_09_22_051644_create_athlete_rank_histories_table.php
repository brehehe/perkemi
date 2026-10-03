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
        Schema::create('athlete_rank_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('athlete_id')->constrained('athletes')->cascadeOnDelete();
            $table->foreignUuid('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('previous_rank')->nullable();
            $table->string('new_rank');
            $table->timestamps();
            $table->index(['athlete_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('athlete_rank_histories');
    }
};
