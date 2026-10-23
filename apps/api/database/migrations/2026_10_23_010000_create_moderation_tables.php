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
        // The people who review listings, signing in to the admin (Filament) with a password and an
        // authenticator app. A separate table from users: posters and moderators never mix.
        Schema::create('moderators', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->text('app_authentication_secret')->nullable();
            $table->text('app_authentication_recovery_codes')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::table('listings', function (Blueprint $table) {
            // who decided (approve, reject, remove); the time is reviewed_at, the reason reject_reason
            $table->foreignId('reviewed_by')->nullable()->after('reviewed_at')->constrained('moderators')->nullOnDelete();
            // the filter's signals when it was submitted (App\Moderation\Signals), a JSON list of codes
            $table->text('signals')->nullable()->after('held_for');
        });

        // What may not post: an account, a phone or WhatsApp number (E.164), an Instagram handle (lower
        // case). A ban outlives the account it came from, or deleting the account would undo it.
        Schema::create('bans', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 16); // account, number, instagram
            $table->string('value', 64);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason', 32);
            $table->foreignId('created_by')->nullable()->constrained('moderators')->nullOnDelete();
            $table->timestamp('lifted_at')->nullable();
            $table->foreignId('lifted_by')->nullable()->constrained('moderators')->nullOnDelete();
            $table->timestamps();

            $table->index(['kind', 'value', 'lifted_at']);
        });

        // Every moderation decision: who, what, when, why. Links to a listing or an account are
        // cleared when they are deleted; the decision itself stays.
        Schema::create('moderation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('moderator_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 32);
            $table->foreignUuid('listing_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ban_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason', 32)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moderation_events');
        Schema::dropIfExists('bans');
        Schema::table('listings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn('signals');
        });
        Schema::dropIfExists('moderators');
    }
};
