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
        Schema::create('event_court_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_court_id')->constrained('event_courts')->cascadeOnDelete();
            $table->string('staff_type', 30);
            $table->uuid('staff_id');
            $table->string('role', 50);
            $table->timestamps();

            $table->unique(['event_court_id', 'staff_type', 'staff_id']);
            $table->index(['event_court_id', 'role']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_court_assignments');
    }
};
