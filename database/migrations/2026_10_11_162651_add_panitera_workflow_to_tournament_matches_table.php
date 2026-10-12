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
            $table->string('call_status', 30)->default('waiting')->after('status');
            $table->timestamp('called_at')->nullable()->after('call_status');
            $table->string('timer_status', 20)->default('stopped')->after('called_at');
            $table->timestamp('timer_started_at')->nullable()->after('timer_status');
            $table->unsignedInteger('timer_elapsed_seconds')->default(0)->after('timer_started_at');

            $table->index(
                ['event_id', 'event_court_id', 'call_status'],
                'tournament_matches_panitera_workflow_index',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournament_matches', function (Blueprint $table) {
            $table->dropIndex('tournament_matches_panitera_workflow_index');
            $table->dropColumn([
                'call_status',
                'called_at',
                'timer_status',
                'timer_started_at',
                'timer_elapsed_seconds',
            ]);
        });
    }
};
