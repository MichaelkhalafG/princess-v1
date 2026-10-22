<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;
use Symfony\Component\HttpFoundation\Response;

/**
 * Puts the visitor's real address where $request->ip() reads it, from the header configured in
 * princess.client_ip, and only when the request arrives from one of the configured proxies:
 * from anywhere else the header could be written by anyone, so it is ignored.
 *
 * The header may hold a chain ("client, proxy1, proxy2"). It is read from the right, skipping
 * the configured proxies; the first address that is not one of them is the visitor. A value
 * that is not an address leaves the request as it came.
 */
class ResolveClientIp
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = config('princess.client_ip.header');
        $proxies = array_values(array_filter(array_map('trim', explode(',', (string) config('princess.client_ip.trusted_proxies')))));
        $remote = $request->server->get('REMOTE_ADDR');

        if ($header && $proxies !== [] && is_string($remote) && IpUtils::checkIp($remote, $proxies)) {
            $client = $this->visitor((string) $request->headers->get($header), $proxies);
            if ($client !== null) {
                $request->server->set('REMOTE_ADDR', $client);
            }
        }

        return $next($request);
    }

    /** @param list<string> $proxies */
    private function visitor(string $value, array $proxies): ?string
    {
        foreach (array_reverse(array_map('trim', explode(',', $value))) as $address) {
            if (filter_var($address, FILTER_VALIDATE_IP) === false) {
                return null;
            }
            if (! IpUtils::checkIp($address, $proxies)) {
                return $address;
            }
        }

        return null;
    }
}
