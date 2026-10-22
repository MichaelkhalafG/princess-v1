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
        // The API is the only writer, so the rules live in its validation (config/princess.php);
        // the columns hold types, lengths and NOT NULL. Lengths are characters, as the form
        // counts them.
        Schema::create('listings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // her account; deleting it deletes her listings
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // App\Enums\ListingStatus, and App\Enums\HeldFor while it waits for a moderator
            $table->string('status', 16);
            $table->string('held_for', 16)->nullable();

            $table->string('name', 40);
            $table->string('title', 80);
            $table->string('category', 32);
            $table->char('country', 2);
            $table->text('city');
            $table->text('district')->nullable();
            $table->string('description', 600);
            $table->string('price', 40)->nullable(); // free text exactly as typed; never a number
            $table->string('whatsapp', 16)->nullable(); // E.164
            $table->string('phone', 16)->nullable(); // E.164
            $table->string('social', 30)->nullable(); // Instagram handle, without "@"

            // name, title, description, city and district, folded (App\Support\ArabicFold) on
            // every save. Binary collation: the fold has already done the comparing, so search
            // behaves the same whatever the server's collation tables.
            $table->text('search_text')->collation('utf8mb4_bin');

            $table->timestamps();
            // when it reached the board; the board's order, and what "قبل ساعة" counts from
            $table->timestamp('published_at')->nullable();
            // the moderator's decision (who decided arrives with the moderators table)
            $table->timestamp('reviewed_at')->nullable();
            $table->string('reject_reason', 32)->nullable();

            $table->index(['status', 'country', 'published_at']);
            $table->index(['status', 'country', 'category', 'published_at']);
            $table->index(['status', 'created_at']); // the moderators' queue, oldest first
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
