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
        Schema::table('events', function (Blueprint $table) {
            $table->boolean('is_training_mode')->default(false)->after('is_active');
        });

        Schema::create('tournament_match_var_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tournament_match_id')->constrained('tournament_matches')->cascadeOnDelete();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('corner')->default('neutral'); // aka, shiro, neutral
            $table->string('requested_by')->default('referee'); // aka_coach, shiro_coach, referee, chief_judge
            $table->string('reason'); // e.g. Validitas Poin Waza-ari, Pelanggaran Hansoku/Chui, Keluar Garis Jogai, Waktu Serangan/Habis
            $table->unsignedInteger('match_second')->default(0);
            $table->string('status')->default('reviewing'); // reviewing, overturned, upheld, inconclusive
            $table->string('camera_angle')->default('cam_table'); // cam_table, cam_corner_aka, cam_corner_shiro, cam_overhead
            $table->string('video_url')->nullable();
            $table->text('verdict_notes')->nullable();
            $table->string('reviewed_by')->nullable();
            $table->boolean('challenge_card_retained')->default(false);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index(['tournament_match_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tournament_match_var_reviews');

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('is_training_mode');
        });
    }
};
