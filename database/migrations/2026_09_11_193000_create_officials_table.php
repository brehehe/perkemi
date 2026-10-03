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
        Schema::create('officials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('contingent_id')->constrained('contingents')->cascadeOnDelete();
            $table->string('name');
            $table->string('role', 100);
            $table->string('gender', 10)->default('L');
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->string('id_card_number', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['contingent_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('officials');
    }
};
