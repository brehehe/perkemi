<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('randori_scores', function (Blueprint $table): void {
            $table->json('signature_names')->nullable()->after('signatures');
        });
    }

    public function down(): void
    {
        Schema::table('randori_scores', function (Blueprint $table): void {
            $table->dropColumn('signature_names');
        });
    }
};
