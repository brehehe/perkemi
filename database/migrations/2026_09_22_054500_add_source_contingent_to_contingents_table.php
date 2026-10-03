<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contingents', function (Blueprint $table) {
            $table->foreignUuid('source_contingent_id')->nullable()->after('event_id')
                ->constrained('contingents')->nullOnDelete();
            $table->unique(['event_id', 'source_contingent_id']);
        });
    }

    public function down(): void
    {
        Schema::table('contingents', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'source_contingent_id']);
            $table->dropConstrainedForeignId('source_contingent_id');
        });
    }
};
