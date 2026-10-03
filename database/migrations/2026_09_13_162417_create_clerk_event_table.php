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
        Schema::create('clerk_event', function (Blueprint $table) {
            $table->uuid('clerk_id');
            $table->uuid('event_id');
            $table->string('role', 30)->default('operator');
            $table->timestamps();

            $table->foreign('clerk_id')->references('id')->on('clerks')->cascadeOnDelete();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->unique(['clerk_id', 'event_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clerk_event');
    }
};
