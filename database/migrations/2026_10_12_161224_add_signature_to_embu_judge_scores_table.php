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
        Schema::table('embu_judge_scores', function (Blueprint $table) {
            $table->longText('signature')->nullable()->after('status');
            $table->text('notes')->nullable()->after('signature');
            $table->timestamp('signed_at')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('embu_judge_scores', function (Blueprint $table) {
            $table->dropColumn(['signature', 'notes', 'signed_at']);
        });
    }
};
