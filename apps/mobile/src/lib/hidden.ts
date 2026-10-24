// Hiding a poster, on this phone only (the store requirement to block another user's content).
//
// The API shows no poster account on a listing — two listings by the same woman are linked only
// by what she wrote on them. So "this poster" is her listing plus every number and handle on it:
// any listing that carries one of them is hidden too, now and in future. Nothing is sent to the
// server; it is a file in the app's own storage (left out of Android backups: app.json allowBackup),
// and undoing it clears the whole list. iOS: the Documents folder goes into iCloud backups, which
// the privacy page's «على هاتفك وحده» does not allow: a release blocker in RELEASE-CHECKLIST.md.

import { useEffect, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import type { Listing } from '@princess/shared/listing.ts';

type Hidden = { listings: string[]; contacts: string[] };
const EMPTY: Hidden = { listings: [], contacts: [] };
const file = () => new File(Paths.document, 'hidden-posters.json');

let state: Hidden | null = null;
const listeners = new Set<(h: Hidden) => void>();

async function load(): Promise<Hidden> {
  if (state) return state;
  try {
    const f = file();
    state = f.exists ? { ...EMPTY, ...(JSON.parse(await f.text()) as Hidden) } : EMPTY;
  } catch {
    state = EMPTY;
  }
  return state;
}

async function save(next: Hidden): Promise<void> {
  state = next;
  file().write(JSON.stringify(next));
  listeners.forEach((l) => l(next));
}

/** Her numbers and handle, normalised so a listing that writes them differently still matches. */
function contactsOf(l: Pick<Listing, 'whatsapp' | 'phone' | 'social'>): string[] {
  return [l.whatsapp, l.phone, l.social ? `@${l.social.toLowerCase()}` : null].filter((x): x is string => !!x);
}

export async function hidePoster(l: Listing): Promise<void> {
  const h = await load();
  await save({
    listings: [...new Set([...h.listings, l.id])],
    contacts: [...new Set([...h.contacts, ...contactsOf(l)])],
  });
}

export async function unhideAll(): Promise<void> {
  await save(EMPTY);
}

export function isHidden(h: Hidden, l: Listing): boolean {
  return h.listings.includes(l.id) || contactsOf(l).some((c) => h.contacts.includes(c));
}

/** The hidden list, kept current; null until it is read. */
export function useHidden(): Hidden | null {
  const [h, setH] = useState<Hidden | null>(state);
  useEffect(() => {
    let live = true;
    load().then((v) => live && setH(v));
    listeners.add(setH);
    return () => {
      live = false;
      listeners.delete(setH);
    };
  }, []);
  return h;
}
