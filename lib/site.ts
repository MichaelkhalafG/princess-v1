/**
 * The site's public address, used to make shared-link metadata absolute (the Open Graph
 * and Twitter image URLs). Set SITE_URL once at deploy time, e.g. https://example.com.
 *
 * In development it defaults to the local dev server. A production build without it
 * stops, as does an invalid value: a forgotten SITE_URL would otherwise publish
 * http://localhost:3000 as every share-preview image, and the build would not say so.
 */
function siteUrl(): URL {
  const value = process.env.SITE_URL;
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SITE_URL is not set: shared links need the public address, e.g. SITE_URL=https://example.com');
    }
    return new URL('http://localhost:3000');
  }
  return new URL(value);
}

export const SITE_URL = siteUrl();

/** Where she writes to us, and where removal requests go (handled by hand). */
export const CONTACT_EMAIL = 'info@mdneg.com';
