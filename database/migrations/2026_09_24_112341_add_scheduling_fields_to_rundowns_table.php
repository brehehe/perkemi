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
        Schema::table('rundowns', function (Blueprint $table) {
            $table->dateTime('end_time')->nullable()->after('date');
            $table->boolean('is_match_session')->default(false)->after('type')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rundowns', function (Blueprint $table) {
            $table->dropIndex(['is_match_session']);
            $table->dropColumn(['end_time', 'is_match_session']);
        });
    }
};
