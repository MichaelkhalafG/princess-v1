// Test environment, read from .env.test.local (node --env-file). Never prints a value.
//
// Same variable names as the app: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// (a publishable sb_publishable_… key or a legacy anon key — both map to the anon role).
// SUPABASE_SECRET_KEY (sb_secret_…, maps to service_role) is needed only to verify end
// states the public cannot see and to delete what the tests created.

import { existsSync, readFileSync } from 'node:fs';

export type TestEnv = { url: string; publishableKey: string; secretKey: string };

export function testEnv(): TestEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const missing = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !publishableKey && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    !secretKey && 'SUPABASE_SECRET_KEY',
  ].filter(Boolean);
  if (missing.length) throw new Error(`missing in .env.test.local: ${missing.join(', ')}`);

  // Test data never touches real data: refuse the project the app itself is configured for.
  if (existsSync('.env.local')) {
    const app = readFileSync('.env.local', 'utf8').match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim();
    if (app && app === url) throw new Error('refusing: the test project is the same as the app project in .env.local');
  }
  return { url: url!, publishableKey: publishableKey!, secretKey: secretKey! };
}
