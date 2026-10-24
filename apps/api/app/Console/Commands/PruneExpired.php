<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * What has expired, actually deleted. Scheduled every ten minutes. Laravel only removes an expired
 * cache entry when it is read again, and an expired session by lottery, so without this the
 * privacy page's "deleted after" would not hold.
 *   - cache entries past their expiry, among them every rate-limit key (keyed hashes of an address;
 *     the limiter always uses the database store, see config/cache.php);
 *   - sessions idle for longer than session.lifetime (only signed-in people have one).
 */
class PruneExpired extends Command
{
    protected $signature = 'princess:prune-expired';

    protected $description = 'Delete expired cache entries (rate limits among them) and expired sessions';

    public function handle(): int
    {
        $now = Carbon::now()->getTimestamp(); // the clock the cache and the limiter use
        $store = config('cache.stores.database');
        $cache = DB::connection($store['connection'] ?? null);
        $entries = $cache->table($store['table'])->where('expiration', '<=', $now)->delete();
        $locks = $cache->table($store['lock_table'] ?? $store['table'].'_locks')->where('expiration', '<=', $now)->delete();

        $sessions = DB::connection(config('session.connection'))->table(config('session.table'))
            ->where('last_activity', '<=', $now - config('session.lifetime') * 60)->delete();

        $this->info("Deleted {$entries} cache entr(ies), {$locks} lock(s), {$sessions} session(s).");

        return self::SUCCESS;
    }
}
