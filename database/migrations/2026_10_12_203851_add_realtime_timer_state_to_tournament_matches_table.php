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
        Schema::table('tournament_matches', function (Blueprint $table) {
            $table->unsignedBigInteger('timer_started_at_ms')->nullable()->after('timer_started_at');
            $table->unsignedBigInteger('timer_elapsed_ms')->default(0)->after('timer_elapsed_seconds');
            $table->unsignedBigInteger('timer_version')->default(0)->after('timer_elapsed_ms');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournament_matches', function (Blueprint $table) {
            $table->dropColumn([
                'timer_started_at_ms',
                'timer_elapsed_ms',
                'timer_version',
            ]);
        });
    }
};
