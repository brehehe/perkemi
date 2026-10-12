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
        Schema::create('referee_court_attendances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('event_court_id')->constrained('event_courts')->cascadeOnDelete();
            $table->foreignUuid('referee_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('checked_in_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('checked_in_at');
            $table->string('method', 20)->default('qr');
            $table->timestamps();

            $table->unique(['event_court_id', 'referee_id']);
            $table->index(['event_id', 'checked_in_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referee_court_attendances');
    }
};
