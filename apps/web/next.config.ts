import { realpathSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import type { NextConfig } from 'next';

// @princess/shared is linked from packages/shared, outside this folder in the repository
// (a deploy build copies it inside). Turbopack resolves nothing above its root, so the root
// is the nearest folder holding both this app and wherever the package really is.
const app = import.meta.dirname;
const shared = realpathSync(join(app, 'node_modules/@princess/shared'));
let root = app;
while (!shared.startsWith(root + sep)) root = dirname(root);

const nextConfig: NextConfig = {
  turbopack: { root },
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
