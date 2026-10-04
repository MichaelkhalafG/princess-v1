# Security notes — known, accepted gaps

The board has no accounts, so anyone can post and anyone can upload. These are the
consequences we know about and have chosen not to solve yet.

## Photos (bucket `listing-photos`)

- **Orphan photos — now rare.** The form uploads her photo only when she publishes, after
  every field has passed its checks (choosing, changing or removing a photo uploads
  nothing). One case still leaves a file behind: the photo uploads and then saving the
  listing fails (the connection drops). Retrying reuses the uploaded file, so an orphan
  remains only if she gives up after that. Files uploaded by a script straight to the
  bucket (next point) are orphans too.

  **Finding them** — read-only; run in the SQL editor of the project:

  ```sql
  -- Photos in listing-photos that no listing uses, oldest first. The one-day margin
  -- leaves alone a photo that is being published right now.
  select o.name, o.created_at, (o.metadata->>'size')::int / 1024 as kb
  from storage.objects o
  where o.bucket_id = 'listing-photos'
    and not exists (select 1 from public.listings l where l.photo = o.name)
    and o.created_at < now() - interval '1 day'
  order by o.created_at;
  ```

  **Removing them:** in the dashboard (Storage → listing-photos), by name. Not with
  `delete from storage.objects` — that removes the row and leaves the file itself in
  storage.
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
