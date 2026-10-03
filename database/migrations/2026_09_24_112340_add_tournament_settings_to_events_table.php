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
            $table->unsignedSmallInteger('match_duration_minutes')->default(10);
            $table->unsignedSmallInteger('minimum_rest_minutes')->default(15);
            $table->unsignedSmallInteger('minimum_entries_per_category')->default(3);
            $table->unsignedSmallInteger('minimum_contingents_per_category')->default(3);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'match_duration_minutes',
                'minimum_rest_minutes',
                'minimum_entries_per_category',
                'minimum_contingents_per_category',
            ]);
        });
    }
};
