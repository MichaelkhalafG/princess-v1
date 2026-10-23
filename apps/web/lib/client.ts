// The browser's calls to the API: the form, her account, reports. They go straight from her
// browser, so the API sees her own address for its limits.
//
// Signing in is Sanctum's way for a website: a session cookie on the API's domain, sent with
// every call (credentials: 'include'), and a CSRF token the API sets in the XSRF-TOKEN cookie and
// expects back in the X-XSRF-TOKEN header on anything that changes something.

import { publicApiOrigin, publicApiUrl } from './api.ts';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; errors: Record<string, string>; error: string | null; retryAfter: number | null };

let csrf: Promise<void> | null = null;

/** Sanctum's CSRF cookie, fetched once per page load (again after a failure). */
export function ensureCsrf(): Promise<void> {
  csrf ??= fetch(`${publicApiOrigin()}/sanctum/csrf-cookie`, { credentials: 'include' }).then(
    (res) => {
      if (!res.ok) throw new Error(`csrf ${res.status}`);
    },
    (err) => {
      csrf = null;
      throw err;
    },
  );
  return csrf;
}

/** The token from the XSRF-TOKEN cookie, for the X-XSRF-TOKEN header. */
export function xsrfToken(): string {
  const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** One call to the API. A failure never throws: it comes back as { ok: false } with the API's codes. */
export async function api<T = unknown>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    if (method !== 'GET') await ensureCsrf();
    const res = await fetch(publicApiUrl(path), {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-XSRF-TOKEN': xsrfToken() } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, data: json as T };
    return {
      ok: false,
      status: res.status,
      errors: (json?.errors as Record<string, string>) ?? {},
      error: (json?.error as string) ?? null,
      retryAfter: typeof json?.retry_after === 'number' ? json.retry_after : null,
    };
  } catch {
    return { ok: false, status: 0, errors: {}, error: 'network', retryAfter: null };
  }
}

export type Me = { email: string; verified: boolean };

/** Who is signed in here, or null. */
export async function getMe(): Promise<Me | null> {
  const res = await api<Me>('GET', '/me');
  return res.ok ? res.data : null;
}
