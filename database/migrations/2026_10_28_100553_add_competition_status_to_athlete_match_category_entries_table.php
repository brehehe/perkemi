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
            $table->string('competition_status', 30)->default('active')->after('weigh_in_by');
            $table->string('status_notes', 255)->nullable()->after('competition_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('athlete_match_category_entries', function (Blueprint $table) {
            $table->dropColumn(['competition_status', 'status_notes']);
        });
    }
};
