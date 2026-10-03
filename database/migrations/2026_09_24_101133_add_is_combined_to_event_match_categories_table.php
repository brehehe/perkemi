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
        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->boolean('is_combined')->default(false)->after('merged_into_id')->index();
        });

        $existingCombinedIds = DB::table('event_match_categories')
            ->whereNotNull('merged_into_id')
            ->groupBy('merged_into_id')
            ->havingRaw('COUNT(*) >= 2')
            ->pluck('merged_into_id');

        DB::table('event_match_categories')
            ->whereIn('id', $existingCombinedIds)
            ->update(['is_combined' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_match_categories', function (Blueprint $table) {
            $table->dropIndex(['is_combined']);
            $table->dropColumn('is_combined');
        });
    }
};
