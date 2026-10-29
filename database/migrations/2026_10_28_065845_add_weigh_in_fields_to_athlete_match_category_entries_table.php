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
        Schema::table('athlete_match_category_entries', function (Blueprint $table) {
            $table->decimal('actual_weight', 5, 2)->nullable();
            $table->string('weigh_in_status', 30)->default('pending');
            $table->text('weigh_in_notes')->nullable();
            $table->timestamp('weigh_in_at')->nullable();
            $table->timestamp('weigh_in_locked_at')->nullable();
            $table->foreignUuid('weigh_in_by')->nullable()->constrained('users')->nullOnDelete();

            $table->index(['event_id', 'weigh_in_status']);
        });

        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->timestamp('weigh_in_locked_at')->nullable();
            $table->foreignUuid('weigh_in_locked_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->dropForeign(['weigh_in_locked_by']);
            $table->dropColumn(['weigh_in_locked_at', 'weigh_in_locked_by']);
        });

        Schema::table('athlete_match_category_entries', function (Blueprint $table) {
            $table->dropForeign(['weigh_in_by']);
            $table->dropIndex(['event_id', 'weigh_in_status']);
            $table->dropColumn([
                'actual_weight',
                'weigh_in_status',
                'weigh_in_notes',
                'weigh_in_at',
                'weigh_in_locked_at',
                'weigh_in_by',
            ]);
        });
    }
};
