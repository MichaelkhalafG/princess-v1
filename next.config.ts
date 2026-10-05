import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Publishing a listing is a Server Action, and Next rejects one whose Origin differs
  // from the host it sees (x-forwarded-host, else host). Behind Hostinger's proxy that
  // host may be internal; the public one is allowed here. Harmless when the proxy
  // forwards it already.
  experimental: {
    serverActions: {
      allowedOrigins: ['princess.mdneg.com'],
    },
  },
};

export default nextConfig;
