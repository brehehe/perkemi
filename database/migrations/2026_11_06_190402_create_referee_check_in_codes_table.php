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
        Schema::create('referee_check_in_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 6)->unique();
            $table->string('type', 20); // 'event', 'court'
            $table->foreignUuid('event_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('event_court_id')->nullable()->constrained('event_courts')->cascadeOnDelete();
            $table->string('role', 50)->nullable();
            $table->text('target_url');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'type', 'event_court_id', 'role'], 'referee_check_in_codes_lookup_idx');
            $table->index(['code', 'expires_at'], 'referee_check_in_codes_code_expires_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referee_check_in_codes');
    }
};
