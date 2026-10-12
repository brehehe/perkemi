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
        Schema::table('tournament_results', function (Blueprint $table) {
            $table->foreignUuid('event_match_category_id')
                ->nullable()
                ->after('event_id')
                ->constrained('event_match_categories')
                ->nullOnDelete();
            $table->string('participant_key')->nullable()->after('event_match_category_id');
            $table->boolean('is_exhibition')->default(false)->after('match_category');
            $table->index(
                ['event_id', 'event_match_category_id', 'rank'],
                'tournament_results_event_category_rank_index',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournament_results', function (Blueprint $table) {
            $table->dropIndex('tournament_results_event_category_rank_index');
            $table->dropConstrainedForeignId('event_match_category_id');
            $table->dropColumn('participant_key');
            $table->dropColumn('is_exhibition');
        });
    }
};
