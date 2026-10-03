# Security notes — known, accepted gaps

The board has no accounts, so anyone can post and anyone can upload. These are the
consequences we know about and have chosen not to solve yet.

## Photos (bucket `listing-photos`)

- **Orphan photos.** A photo is uploaded before the listing is submitted. If she abandons
  the form, or the listing insert fails, the photo stays in the bucket with nothing
  pointing at it. Nothing deletes it.
- **Anonymous upload means anyone can fill the bucket without ever visiting the site.**
  The anon key is public by design (it ships to every browser). With it, a script can
  upload up to 5 MB per request directly to Storage, as many times as it likes, without
  loading a page or submitting a listing.
- **The type check trusts the client.** The bucket's allowed MIME types are checked
  against the `Content-Type` the uploader declares, not the file's bytes.

What *is* enforced (proved in `tests/db/listings.test.ts`): uploads only, 5 MB maximum,
JPEG/PNG/WebP declared types only, object names must be `<uuid>.<jpg|png|webp>`, and the
public cannot list, overwrite or delete objects.

## Listings

- **Instant publish, no moderation.** Anything that passes the CHECK constraints is live
  immediately. Removal is by the developer, with the service role, from the dashboard.
- **No rate limiting.** The same anon key can insert rows directly through the Supabase
  API without the site's form; the database constraints are the only gate.
