<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        DB::table('events')
            ->whereNotNull('responsible_user_id')
            ->orderBy('id')
            ->get(['id', 'responsible_user_id'])
            ->each(function (object $event) use ($now): void {
                DB::table('event_user')->updateOrInsert(
                    [
                        'event_id' => $event->id,
                        'user_id' => $event->responsible_user_id,
                    ],
                    [
                        'access_role' => 'responsible',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            });

        Schema::table('events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('responsible_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignUuid('responsible_user_id')->nullable()->constrained('users')->nullOnDelete();
        });

        DB::table('event_user')
            ->where('access_role', 'responsible')
            ->orderBy('created_at')
            ->get(['event_id', 'user_id'])
            ->groupBy('event_id')
            ->each(function ($eventUsers, string $eventId): void {
                DB::table('events')
                    ->where('id', $eventId)
                    ->update(['responsible_user_id' => $eventUsers->first()->user_id]);
            });
    }
};
