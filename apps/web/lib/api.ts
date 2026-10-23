/**
 * Where the API is (apps/api, under /api/v1).
 *
 * The web server reads through API_URL: the API's address as this server reaches it (it may be
 * an internal one). The browser posts through NEXT_PUBLIC_API_URL, its public address, so the
 * API sees her own address for its limits. Unset in development, both are the local API,
 * http://localhost:8000 (php artisan serve). A production server without them fails at its
 * first request, saying which is missing, rather than calling the wrong place.
 */
const LOCAL_API = 'http://localhost:8000';

function base(name: 'API_URL' | 'NEXT_PUBLIC_API_URL', value: string | undefined): string {
  if (value) return value.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} is not set: the site cannot reach the API`);
  return LOCAL_API;
}

/** An API address, for the web server: apiUrl('/listings?country=EG'). */
export function apiUrl(path: string): string {
  return `${base('API_URL', process.env.API_URL)}/api/v1${path}`;
}

/** The same, as the browser calls it (the form, her account pages). */
export function publicApiUrl(path: string): string {
  return `${base('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL)}/api/v1${path}`;
}

/** The API's own address for the browser, without /api/v1 (Sanctum's CSRF cookie lives there). */
export function publicApiOrigin(): string {
  return base('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL);
}
