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
        Schema::table('athletes', function (Blueprint $table) {
            $table->string('nik', 16)->nullable()->index();
            $table->string('kenshi_number', 50)->nullable()->index();
            $table->string('birth_place')->nullable();
            $table->string('blood_type', 2)->nullable();
            $table->text('home_address')->nullable();
            $table->string('dojo_name')->nullable();
            $table->string('profile_photo_path')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('athletes', function (Blueprint $table) {
            $table->dropColumn([
                'nik', 'kenshi_number', 'birth_place', 'blood_type',
                'home_address', 'dojo_name', 'profile_photo_path',
            ]);
        });
    }
};
