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
        // 1. Kelompok Umur & Tarif per Kelompok Umur
        Schema::create('event_age_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('min_age')->nullable();
            $table->unsignedSmallInteger('max_age')->nullable();
            $table->decimal('fee', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['event_id', 'order']);
            $table->index(['event_id', 'is_active']);
        });

        // 2. Lapangan Pertandingan (Court / Tatami)
        Schema::create('event_courts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name');
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['event_id', 'order']);
            $table->index(['event_id', 'is_active']);
        });

        // 3. Nomer Pertandingan (Kategori Tanding Embu / Randori)
        Schema::create('event_match_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('age_category_id')->nullable()->constrained('event_age_categories')->nullOnDelete();
            $table->string('name');
            $table->string('type', 20)->default('embu'); // embu, randori
            $table->string('gender', 20)->default('mixed'); // male, female, mixed
            $table->unsignedSmallInteger('capacity')->default(16); // kuota peserta/tim
            $table->decimal('min_weight', 6, 2)->nullable();
            $table->decimal('max_weight', 6, 2)->nullable();
            $table->string('min_kyu', 50)->nullable();
            $table->string('max_kyu', 50)->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['event_id', 'type']);
            $table->index(['event_id', 'gender']);
            $table->index(['event_id', 'age_category_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_match_categories');
        Schema::dropIfExists('event_courts');
        Schema::dropIfExists('event_age_categories');
    }
};
