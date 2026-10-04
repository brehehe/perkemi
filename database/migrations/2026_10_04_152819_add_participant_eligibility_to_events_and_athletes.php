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
        Schema::table('events', function (Blueprint $table): void {
            $table->json('participant_rules')->nullable();
        });
        Schema::table('athletes', function (Blueprint $table): void {
            $table->string('school_name')->nullable();
            $table->string('school_level', 10)->nullable();
            $table->unsignedSmallInteger('school_entry_year')->nullable();
            $table->unsignedTinyInteger('school_grade')->nullable();
            $table->string('school_document_path')->nullable();
            $table->timestamp('school_verified_at')->nullable();
            $table->foreignUuid('school_verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('school_verification_hash', 64)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('athletes', function (Blueprint $table): void {
            $table->dropForeign(['school_verified_by']);
            $table->dropColumn(['school_name', 'school_level', 'school_entry_year', 'school_grade', 'school_document_path', 'school_verified_at', 'school_verified_by', 'school_verification_hash']);
        });
        Schema::table('events', function (Blueprint $table): void {
            $table->dropColumn('participant_rules');
        });
    }
};
