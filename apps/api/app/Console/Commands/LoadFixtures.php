<?php

namespace App\Console\Commands;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * For the web app's page tests only: creates the published listings a test asserts on, from a
 * JSON file, and prints their ids. Refuses outside the local and testing environments, so it can
 * never write to a live database.
 *
 * The file: {"listings": [{"key": "withAll", "name": "...", "title": "...", ...}, ...]}. Each
 * listing gets its own verified account; "minutes_ago" sets its publication time.
 */
class LoadFixtures extends Command
{
    protected $signature = 'princess:fixtures {file : A JSON file of listings}';

    protected $description = 'Create listings for the web app\'s page tests (local and testing only)';

    public function handle(): int
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->error('Fixtures are for local and testing environments only.');

            return self::FAILURE;
        }
        $data = json_decode((string) file_get_contents((string) $this->argument('file')), true, flags: JSON_THROW_ON_ERROR);

        $ids = [];
        foreach ($data['listings'] as $row) {
            $key = $row['key'];
            $minutesAgo = (int) ($row['minutes_ago'] ?? 0);
            unset($row['key'], $row['minutes_ago']);
            $user = User::create(['email' => 'fixture-'.Str::lower(Str::random(12)).'@example.test', 'password' => Str::random(32)]);
            $user->forceFill(['email_verified_at' => Carbon::now()])->save();
            $listing = new Listing;
            $listing->forceFill([
                'user_id' => $user->id,
                'status' => ListingStatus::Published,
                'published_at' => Carbon::now()->subMinutes($minutesAgo),
                'district' => null, 'price' => null, 'whatsapp' => null, 'phone' => null, 'social' => null,
                ...$row,
            ])->save();
            $ids[$key] = $listing->id;
        }
        $this->line(json_encode($ids));

        return self::SUCCESS;
    }
}
