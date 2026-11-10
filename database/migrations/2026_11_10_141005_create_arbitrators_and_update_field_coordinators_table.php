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
        // 1. Update field_coordinators table to have parity with referees and arbitrators
        Schema::table('field_coordinators', function (Blueprint $table) {
            $table->uuid('user_id')->nullable()->after('id');
            $table->string('gender', 10)->default('male')->after('name');
            $table->string('dan_grade', 50)->nullable()->after('gender');
            $table->string('certification_level', 100)->nullable()->after('dan_grade');

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        // 2. Create master arbitrators table
        Schema::create('arbitrators', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->string('name', 150);
            $table->string('gender', 10)->default('male');
            $table->string('dan_grade', 50)->nullable();
            $table->string('license_number', 100)->nullable()->unique();
            $table->string('certification_level', 100)->nullable();
            $table->string('region', 100)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['is_active', 'region']);
        });

        // 3. Create event_arbitrator pivot table
        Schema::create('event_arbitrator', function (Blueprint $table) {
            $table->uuid('event_id');
            $table->uuid('arbitrator_id');
            $table->string('role', 100)->default('Arbitrase Pertandingan');
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreign('arbitrator_id')->references('id')->on('arbitrators')->cascadeOnDelete();
            $table->unique(['event_id', 'arbitrator_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_arbitrator');
        Schema::dropIfExists('arbitrators');

        Schema::table('field_coordinators', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'gender', 'dan_grade', 'certification_level']);
        });
    }
};
