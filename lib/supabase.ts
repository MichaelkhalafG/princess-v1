// The one place a Supabase client is created for the app. There is no authentication,
// so the client never persists or refreshes a session.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(url: string | undefined, publishableKey: string | undefined): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).');
  }
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  client ??= createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return client;
}
