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
        Schema::table('users', function (Blueprint $table) {
            $table->string('nik_perkemi', 30)->nullable()->unique()->after('phone');
        });

        Schema::table('event_courts', function (Blueprint $table) {
            $table->string('access_code', 6)->nullable()->index()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['nik_perkemi']);
            $table->dropColumn('nik_perkemi');
        });

        Schema::table('event_courts', function (Blueprint $table) {
            $table->dropIndex(['access_code']);
            $table->dropColumn('access_code');
        });
    }
};
