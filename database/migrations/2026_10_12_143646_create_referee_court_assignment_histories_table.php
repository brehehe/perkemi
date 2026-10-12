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
        Schema::create('referee_court_assignment_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('event_court_id')->constrained('event_courts')->cascadeOnDelete();
            $table->foreignUuid('referee_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('batch_id');
            $table->string('action', 20);
            $table->string('role', 50);
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['event_id', 'event_court_id', 'occurred_at'], 'referee_court_history_event_court_at_index');
            $table->index(['batch_id', 'action']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referee_court_assignment_histories');
    }
};
