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
        Schema::table('contingents', function (Blueprint $table) {
            $table->string('email')->nullable();
        });
        Schema::table('athletes', function (Blueprint $table) {
            $table->string('bpjs_number', 40)->nullable();
            $table->string('bpjs_status', 30)->nullable();
        });
        Schema::table('registrations', function (Blueprint $table) {
            $table->unsignedSmallInteger('verification_code')->nullable();
        });
        Schema::table('athlete_match_category_entries', function (Blueprint $table) {
            $table->boolean('age_group_promotion')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('athlete_match_category_entries', function (Blueprint $table) {
            $table->dropColumn('age_group_promotion');
        });
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropColumn('verification_code');
        });
        Schema::table('athletes', function (Blueprint $table) {
            $table->dropColumn(['bpjs_number', 'bpjs_status']);
        });
        Schema::table('contingents', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
