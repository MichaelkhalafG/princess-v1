// The app's calls to the API (the same /api/v1 the website uses). Signed in, each call carries
// her token ("Authorization: Bearer …"); the API answers a token client without cookies or CSRF.
// A failure never throws: it comes back as { ok: false } with the API's codes, which
// @princess/shared/messages.ts turns into the site's own words.

import type { CategorySlug, CountryCode } from '@princess/shared/constants.ts';
import type { Listing } from '@princess/shared/listing.ts';
import type { ListingStatus } from '@princess/shared/moderation.ts';
import { API_URL } from './config';
import { getToken, setToken } from './session';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; errors: Record<string, string>; error: string | null; retryAfter: number | null };

export type ApiFailure = Extract<ApiResult<unknown>, { ok: false }>;

export async function api<T = unknown>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    // a token the API no longer knows (signed out elsewhere, account deleted): forget it
    if (res.status === 401 && token) await setToken(null);
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

// ── The board and a listing ───────────────────────────────────────────────────────────

export type BoardFilters = { country: CountryCode; category?: CategorySlug | null; q?: string | null; limit?: number };

export function fetchBoard(f: BoardFilters) {
  const p = new URLSearchParams({ country: f.country });
  if (f.category) p.set('category', f.category);
  if (f.q?.trim()) p.set('q', f.q.trim());
  if (f.limit) p.set('limit', String(f.limit));
  return api<{ items: Listing[]; total: number }>('GET', `/listings?${p.toString()}`);
}

export const fetchListing = (id: string) => api<Listing>('GET', `/listings/${id}`);
export const fetchOthers = (id: string) => api<{ items: Listing[] }>('GET', `/listings/${id}/others`);

// ── Her account ───────────────────────────────────────────────────────────────────────

export type Me = { email: string; verified: boolean };
/** A listing of hers: any status; the photo comes back with a signed private address while off the board. */
export type Mine = Omit<Listing, 'published_at'> & {
  published_at: string | null;
  created_at: string;
  status: ListingStatus;
  reject_reason: string | null;
};

/** Her account, or null when signed out (or her token is no longer valid). */
export async function getMe(): Promise<Me | null> {
  if (!(await getToken())) return null;
  const res = await api<Me>('GET', '/me');
  return res.ok ? res.data : null;
}

/** The name the API gives her token: which phone signed in, so she can tell them apart later. */
export const DEVICE_NAME = 'Princess app';
