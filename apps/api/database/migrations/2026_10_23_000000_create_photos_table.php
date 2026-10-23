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
        // A photo as stored: always a JPEG the server wrote itself (App\Photos\PhotoProcessor),
        // named "<id>.jpg" on the photos_private or photos_public disk.
        Schema::create('photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // who uploaded it, when she was signed in; deleting the account deletes the row
            // (App\Accounts\AccountDeletion deletes the file)
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            // the listing that claimed it; one photo per listing
            $table->foreignUuid('listing_id')->nullable()->unique()->constrained()->nullOnDelete();
            // "private" or "public": public exactly while its listing is published
            $table->string('visibility', 8);
            $table->unsignedSmallInteger('width');
            $table->unsignedSmallInteger('height');
            $table->unsignedInteger('bytes');
            $table->timestamps();

            $table->index(['listing_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('photos');
    }
};
