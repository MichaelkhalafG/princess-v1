// Where the app finds the API and the website. Set per environment, never in code:
//   local development — .env.development (the Android emulator's 10.0.2.2 alias for this computer);
//   builds — eas.json, per build profile.
// Expo inlines EXPO_PUBLIC_* variables at bundle time; a build without them fails loudly here
// rather than talking to the wrong server.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set (apps/mobile/.env.development for local work, eas.json for builds)`);
  // eas.json ships with placeholder addresses for the preview and production profiles
  if (value.includes('REPLACE-WITH')) throw new Error(`${name} is still the placeholder in eas.json: set the real address first`);
  return value.replace(/\/+$/, '');
}

export const API_URL = required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL);
export const WEB_URL = required('EXPO_PUBLIC_WEB_URL', process.env.EXPO_PUBLIC_WEB_URL);

/**
 * A photo address from the API, reachable from here. The API writes absolute addresses from its
 * own APP_URL; in local development that is http://localhost:8000, which inside the emulator is
 * the emulator itself — so a localhost origin is swapped for API_URL's. In production APP_URL is
 * the public host and nothing changes.
 */
export function assetUrl(url: string): string {
  const m = url.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)$/);
  return m ? `${API_URL}${m[3]}` : url;
}
