<?php

use App\Models\EventCourt;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $courts = EventCourt::query()
            ->whereNull('access_code')
            ->orWhere('access_code', '')
            ->get();

        foreach ($courts as $court) {
            $court->access_code = EventCourt::generateUniqueAccessCode();
            $court->saveQuietly();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
