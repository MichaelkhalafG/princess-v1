<?php

namespace App\Support;

/**
 * A rate-limit key made from a visitor's address (and whatever else names the attempt: an email,
 * a listing), as a hash keyed with the app key. The cache never holds an address or an email,
 * and without the app key the hash cannot be traced back to one.
 */
final class ClientKey
{
    public static function of(string ...$parts): string
    {
        return hash_hmac('sha256', implode("\0", $parts), (string) config('app.key'));
    }
}
