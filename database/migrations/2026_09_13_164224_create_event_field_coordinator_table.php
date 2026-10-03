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
        Schema::create('event_field_coordinator', function (Blueprint $table) {
            $table->uuid('event_id');
            $table->uuid('field_coordinator_id');
            $table->string('assignment_area', 30)->default('court');
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('field_coordinator_id')->references('id')->on('field_coordinators')->cascadeOnDelete();
            $table->unique(['event_id', 'field_coordinator_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_field_coordinator');
    }
};
