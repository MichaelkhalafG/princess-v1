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
        // A visitor's report on a published listing. Anonymous: no account, no address, no device is
        // stored (the address only feeds a rate limit, in the cache). Goes with the listing.
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('listing_id')->constrained()->cascadeOnDelete();
            $table->string('reason', 32);
            $table->string('note', 500)->nullable();
            // open until a moderator dismisses it or acts on the listing
            $table->string('status', 16)->default('open');
            $table->foreignId('handled_by')->nullable()->constrained('moderators')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['status', 'listing_id']);
            $table->index('created_at');
        });

        Schema::table('moderation_events', function (Blueprint $table) {
            $table->unsignedInteger('reports')->nullable()->after('ban_id'); // how many reports a decision closed
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('moderation_events', fn (Blueprint $table) => $table->dropColumn('reports'));
        Schema::dropIfExists('reports');
    }
};
