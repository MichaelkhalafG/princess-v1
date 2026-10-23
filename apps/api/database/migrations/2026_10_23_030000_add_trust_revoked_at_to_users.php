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
        // When a moderator last removed one of her listings. Kept on the account because she may
        // delete the removed listing herself; her trust must still reset (User::isTrusted).
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('trust_revoked_at')->nullable()->after('email_verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('trust_revoked_at'));
    }
};
