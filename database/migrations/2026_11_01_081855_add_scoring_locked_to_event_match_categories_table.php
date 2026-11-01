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
        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->timestamp('scoring_locked_at')->nullable()->after('weigh_in_locked_by');
            $table->foreignUuid('scoring_locked_by')->nullable()->after('scoring_locked_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->dropForeign(['scoring_locked_by']);
            $table->dropColumn(['scoring_locked_at', 'scoring_locked_by']);
        });
    }
};
