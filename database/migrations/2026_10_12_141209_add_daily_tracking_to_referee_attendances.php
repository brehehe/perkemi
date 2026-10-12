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
        Schema::table('referee_attendances', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'referee_id']);
            $table->date('attendance_date')->nullable()->after('referee_id');
            $table->boolean('is_present')->default(true)->after('attendance_date');
            $table->text('notes')->nullable()->after('method');
            $table->timestamp('checked_in_at')->nullable()->change();
        });

        Schema::table('referee_court_attendances', function (Blueprint $table) {
            $table->dropUnique(['event_court_id', 'referee_id']);
            $table->date('attendance_date')->nullable()->after('referee_id');
        });

        DB::table('referee_attendances')->update([
            'attendance_date' => DB::raw('DATE(checked_in_at)'),
        ]);
        DB::table('referee_court_attendances')->update([
            'attendance_date' => DB::raw('DATE(checked_in_at)'),
        ]);

        Schema::table('referee_attendances', function (Blueprint $table) {
            $table->date('attendance_date')->nullable(false)->change();
            $table->unique(
                ['event_id', 'referee_id', 'attendance_date'],
                'referee_attendances_event_referee_date_unique',
            );
            $table->index(
                ['event_id', 'attendance_date', 'is_present'],
                'referee_attendances_event_date_present_index',
            );
        });

        Schema::table('referee_court_attendances', function (Blueprint $table) {
            $table->date('attendance_date')->nullable(false)->change();
            $table->unique(
                ['event_court_id', 'referee_id', 'attendance_date'],
                'referee_court_attendances_court_referee_date_unique',
            );
            $table->index(
                ['event_id', 'attendance_date'],
                'referee_court_attendances_event_date_index',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('referee_attendances', function (Blueprint $table) {
            $table->dropUnique('referee_attendances_event_referee_date_unique');
            $table->dropIndex('referee_attendances_event_date_present_index');
        });
        Schema::table('referee_court_attendances', function (Blueprint $table) {
            $table->dropUnique('referee_court_attendances_court_referee_date_unique');
            $table->dropIndex('referee_court_attendances_event_date_index');
        });

        $this->removeDailyDuplicates('referee_attendances', ['event_id', 'referee_id']);
        $this->removeDailyDuplicates('referee_court_attendances', ['event_court_id', 'referee_id']);

        DB::table('referee_attendances')
            ->whereNull('checked_in_at')
            ->update(['checked_in_at' => DB::raw('updated_at')]);

        Schema::table('referee_attendances', function (Blueprint $table) {
            $table->timestamp('checked_in_at')->nullable(false)->change();
            $table->dropColumn(['attendance_date', 'is_present', 'notes']);
            $table->unique(['event_id', 'referee_id']);
        });
        Schema::table('referee_court_attendances', function (Blueprint $table) {
            $table->dropColumn('attendance_date');
            $table->unique(['event_court_id', 'referee_id']);
        });
    }

    /** @param list<string> $groupColumns */
    private function removeDailyDuplicates(string $table, array $groupColumns): void
    {
        $seen = [];
        $duplicateIds = [];

        DB::table($table)
            ->orderByDesc('attendance_date')
            ->orderByDesc('updated_at')
            ->get(['id', ...$groupColumns])
            ->each(function (object $row) use (&$duplicateIds, &$seen, $groupColumns): void {
                $key = collect($groupColumns)
                    ->map(fn (string $column): string => (string) $row->{$column})
                    ->implode('|');

                if (isset($seen[$key])) {
                    $duplicateIds[] = $row->id;

                    return;
                }

                $seen[$key] = true;
            });

        collect($duplicateIds)
            ->chunk(500)
            ->each(fn ($ids) => DB::table($table)->whereIn('id', $ids)->delete());
    }
};
