# Security notes: what is enforced, and the gaps we know about

Since the move to the Laravel API (apps/api), every write goes through the API: no public
credential reaches the database or the file storage. This file says what the API enforces,
where it is proved, and what is still open.

## What the API enforces

- **Posting needs an account whose email is verified.** Unverified accounts post into no
  queue and are deleted after 7 days. (`tests/Feature/AccountsTest.php`, `PublishTest.php`)
- **Line B moderation.** A listing reaches the board only after a moderator approves it,
  unless the account is trusted (a moderator approved one of its listings and removed none
  since), the launch phase is off, and the filter raised no signal. Moderators approve, reject
  and remove; they cannot edit. Every decision is in the audit log.
  (`ModerationTest.php`, `AdminPanelTest.php`)
- **Validation.** The same 70 cases pass in the PHP and TypeScript validators
  (`packages/shared/cases/listing-validation.json`).
- **Photos.** Decoded and re-encoded by GD on the server: no EXIF, GPS, XMP or IPTC survives
  (`PhotoPrivacyTest.php`, the gate). Type is decided by decoding, not by the client's
  Content-Type; a size cap (5 MB) and a pixel cap (4096 × 4096, checked from the header before
  decoding) stop memory exhaustion. A photo is public exactly while its listing is published;
  otherwise only a signed, expiring address reaches it.
- **Rate limits**, by the visitor's address (the real one behind the host's proxy once
  `CLIENT_IP_HEADER` is set): sign-ups, sign-in attempts, password emails, verification emails,
  photo uploads, reports; and 5 listings per account per 24 hours.
- **Bans** on an account, a number (WhatsApp or phone) or an Instagram handle. A banned account
  cannot post; a banned number or handle sends any listing carrying it to a moderator. Bans
  outlive the account.
- **Admin access**: moderators only (a separate table), password plus a required authenticator
  app.

## Known gaps

- **Orphan uploads.** `POST /photos` needs no account (she signs up at the end of the form),
  so a script can upload photos without posting. Limited per address per hour, deleted after
  24 hours if no listing claims them (`princess:prune-photos`).
- **Shared addresses.** Mobile carriers put many people behind one address; the per-address
  limits can catch several real people at once. The numbers are in `config/princess.php`.
- **Reports can be abused.** Auto-hide after reports is off by default for that reason
  (`MODERATION_AUTO_HIDE_REPORTS`).
- **A victim's number.** Someone can post another woman's number. The `contact_elsewhere`
  signal shows the moderator a number on more than one account; banning such a number bans
  the victim's too. Nothing verifies that a number belongs to the poster.
- **The live site until cutover** still runs on Supabase (`supabase/`), with that design's
  gaps: instant publishing and anonymous writes with the public key.
