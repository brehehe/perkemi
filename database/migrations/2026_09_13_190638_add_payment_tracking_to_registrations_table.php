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
        Schema::table('registrations', function (Blueprint $table) {
            $table->foreignUuid('payment_method_id')->nullable()->after('event_id')->constrained('payment_methods')->nullOnDelete();
            $table->string('payment_status', 30)->default('pending')->after('status');
            $table->decimal('payment_amount', 15, 2)->default(0)->after('final_amount');
            $table->string('payment_reference', 100)->nullable()->after('payment_amount');
            $table->string('payment_proof_path')->nullable()->after('payment_reference');
            $table->timestamp('payment_submitted_at')->nullable()->after('payment_proof_path');
            $table->timestamp('payment_verified_at')->nullable()->after('payment_submitted_at');
            $table->foreignUuid('payment_verified_by')->nullable()->after('payment_verified_at')->constrained('users')->nullOnDelete();
            $table->text('payment_note')->nullable()->after('payment_verified_by');
            $table->index(['event_id', 'payment_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropForeign(['payment_method_id']);
            $table->dropForeign(['payment_verified_by']);
            $table->dropIndex(['event_id', 'payment_status']);
            $table->dropColumn([
                'payment_method_id',
                'payment_status',
                'payment_amount',
                'payment_reference',
                'payment_proof_path',
                'payment_submitted_at',
                'payment_verified_at',
                'payment_verified_by',
                'payment_note',
            ]);
        });
    }
};
