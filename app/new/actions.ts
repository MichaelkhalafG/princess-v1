'use server';

import { redirect } from 'next/navigation';
import { SERVER_MESSAGES, validateListing } from '@/lib/listing.ts';
import { insertListing } from '@/lib/listings.ts';
import { PUBLISH_FAILED_MESSAGE, type FormErrors } from '@/lib/listing-form.ts';
import { getSupabase } from '@/lib/supabase.ts';

export type CreateListingResult = { errors: FormErrors; message: string | null };

/**
 * Publishes a listing. The form's checks are presentation; this is the first
 * enforcement (lib/listing.ts) and the database is the second (CHECKs + grants).
 * On success it redirects to the listing's own page with the "posted" confirmation.
 */
export async function createListing(input: unknown): Promise<CreateListingResult> {
  const v = validateListing(input);
  if (!v.ok) {
    const errors: FormErrors = {};
    for (const [key, code] of Object.entries(v.errors) as [keyof typeof SERVER_MESSAGES, keyof (typeof SERVER_MESSAGES)['name']][]) {
      const message = SERVER_MESSAGES[key][code];
      if (key === 'contact') errors.contacts = message;
      else if (key !== 'photo') errors[key] = message;
    }
    return { errors, message: v.errors.photo ? SERVER_MESSAGES.photo[v.errors.photo] : null };
  }

  const result = await insertListing(getSupabase(), v.value);
  if (!result.ok) {
    // Never echo database internals to the page.
    console.error('createListing: insert refused', 'dbError' in result ? result.dbError : result.errors);
    return { errors: {}, message: PUBLISH_FAILED_MESSAGE };
  }
  redirect(`/listing/${result.listing.id}?posted=1`);
}
