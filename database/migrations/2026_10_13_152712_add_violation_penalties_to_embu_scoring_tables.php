<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('embu_judge_scores', function (Blueprint $table) {
            $table->json('violation_penalties')->nullable();
            $table->decimal('violation_penalty', 8, 2)->default(0);
        });

        Schema::table('embu_scores', function (Blueprint $table) {
            $table->json('violation_penalties')->nullable();
            $table->decimal('violation_penalty', 8, 2)->default(0);
            $table->decimal('total_penalty', 8, 2)->default(0);
            $table->boolean('is_disqualified')->default(false);
            $table->string('disqualification_reason')->nullable();
        });

        DB::table('embu_scores')->update([
            'total_penalty' => DB::raw('time_penalty'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('embu_scores', function (Blueprint $table) {
            $table->dropColumn([
                'violation_penalties',
                'violation_penalty',
                'total_penalty',
                'is_disqualified',
                'disqualification_reason',
            ]);
        });

        Schema::table('embu_judge_scores', function (Blueprint $table) {
            $table->dropColumn(['violation_penalties', 'violation_penalty']);
        });
    }
};
