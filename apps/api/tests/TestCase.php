<?php

namespace Tests;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Carbon;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /** Run artisan for real (RefreshDatabase's migrate:fresh) instead of through Mockery. */
    public $mockConsoleOutput = false;

    private static int $serial = 0;

    /**
     * Tests empty and rebuild the database they run on. Refuse anything but a local database
     * whose name ends in _test, so test data can never reach real data. (Checked here, before
     * any test runs: RefreshDatabase's own hooks would replace a hook defined in this class.)
     */
    public function createApplication()
    {
        $app = parent::createApplication();
        $db = $app['config']->get('database.connections.'.$app['config']->get('database.default'));
        $local = in_array($db['host'] ?? '', ['127.0.0.1', 'localhost', '::1'], true);
        if (! $local || ! str_ends_with((string) ($db['database'] ?? ''), '_test')) {
            throw new RuntimeException('Tests run only against a local database whose name ends in _test.');
        }

        return $app;
    }

    /** An account with the password "test-password", verified unless a test says otherwise. */
    protected function makeUser(bool $verified = true): User
    {
        $n = ++self::$serial;
        $user = User::create(['email' => "poster{$n}@example.test", 'password' => 'test-password']);
        if ($verified) {
            $user->forceFill(['email_verified_at' => Carbon::now()])->save();
        }

        return $user;
    }

    /**
     * Signs the next requests in as $user with a real API token, the way the app does, and
     * forgets whoever earlier requests were signed in as.
     */
    protected function signIn(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('test')->plainTextToken);
    }

    /**
     * A published listing with every field set explicitly; $over replaces any of them. Its
     * contact is a valid WhatsApp number for its country, built from config/princess.php.
     *
     * @param  array<string, mixed>  $over
     */
    protected function makeListing(array $over = []): Listing
    {
        $country = $over['country'] ?? array_key_first(config('princess.countries'));
        $rule = config("princess.countries.$country");
        $listing = new Listing;
        $listing->forceFill([
            'user_id' => $over['user_id'] ?? $this->makeUser()->id,
            'status' => ListingStatus::Published,
            'name' => 'اسم',
            'title' => 'عنوان',
            'category' => array_key_first(config('princess.categories')),
            'country' => $country,
            'city' => 'مدينة',
            'district' => null,
            'description' => 'وصف',
            'price' => null,
            'whatsapp' => $rule['dial'].$rule['lead'].str_repeat('0', $rule['length'] - 1),
            'phone' => null,
            'social' => null,
            'published_at' => Carbon::now(),
            ...$over,
        ])->save();

        return $listing->refresh();
    }
}
