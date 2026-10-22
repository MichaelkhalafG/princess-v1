<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

// The visitor's address is read from a header only when configured, and only from the
// configured proxies; anything else is the address the request came from.
class ClientIpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Route::get('api/v1/_test/ip', fn (Request $request) => response()->json(['ip' => $request->ip()]));
    }

    /** @param array<string, string> $headers */
    private function ipSeen(string $from, array $headers = []): string
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $from])->withHeaders($headers)->getJson('/api/v1/_test/ip')->assertOk()->json('ip');
    }

    private function configure(?string $header, ?string $proxies): void
    {
        config(['princess.client_ip.header' => $header, 'princess.client_ip.trusted_proxies' => $proxies]);
    }

    public function test_unconfigured_no_header_is_believed(): void
    {
        $this->configure(null, null);
        $this->assertSame('10.0.0.1', $this->ipSeen('10.0.0.1', ['X-Forwarded-For' => '203.0.113.5', 'X-Real-IP' => '203.0.113.6']));

        $this->configure('X-Real-IP', null);
        $this->assertSame('10.0.0.1', $this->ipSeen('10.0.0.1', ['X-Real-IP' => '203.0.113.6']), 'a header but no proxies');
    }

    public function test_the_header_is_believed_only_from_a_configured_proxy(): void
    {
        $this->configure('X-Real-IP', '10.0.0.0/8');
        $this->assertSame('203.0.113.6', $this->ipSeen('10.1.2.3', ['X-Real-IP' => '203.0.113.6']));
        $this->assertSame('198.51.100.20', $this->ipSeen('198.51.100.20', ['X-Real-IP' => '203.0.113.6']), 'sent straight to us, the header could say anything');
    }

    public function test_a_chain_is_read_from_the_right_past_our_proxies(): void
    {
        $this->configure('X-Forwarded-For', '10.0.0.0/8, 192.0.2.1');
        // whatever she put at the left is not believed; the first address our proxies did not add is
        $this->assertSame('203.0.113.5', $this->ipSeen('10.0.0.1', ['X-Forwarded-For' => '198.51.100.7, 203.0.113.5']));
        $this->assertSame('203.0.113.5', $this->ipSeen('10.0.0.1', ['X-Forwarded-For' => '203.0.113.5, 192.0.2.1, 10.0.0.2']));
        $this->assertSame('2001:db8::7', $this->ipSeen('192.0.2.1', ['X-Forwarded-For' => '2001:db8::7']));
    }

    public function test_a_header_that_is_not_an_address_changes_nothing(): void
    {
        $this->configure('X-Forwarded-For', '10.0.0.0/8');
        $this->assertSame('10.0.0.1', $this->ipSeen('10.0.0.1', ['X-Forwarded-For' => 'unknown, 203.0.113.5:443']));
        $this->assertSame('10.0.0.1', $this->ipSeen('10.0.0.1'), 'no header at all');
    }

    public function test_rate_limits_count_the_visitor_not_the_proxy(): void
    {
        $this->configure('X-Real-IP', '10.0.0.0/8');
        config(['princess.rate_limits.password_emails_per_ip_per_hour' => 1]);
        $ask = fn (string $visitor) => $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])->withHeaders(['X-Real-IP' => $visitor])
            ->postJson('/api/v1/password/forgot', ['email' => 'nobody@example.test'])->status();

        $this->assertSame(202, $ask('203.0.113.1'));
        $this->assertSame(429, $ask('203.0.113.1'));
        $this->assertSame(202, $ask('203.0.113.2'), 'another visitor behind the same proxy');
    }
}
