-- Princess — listings board.
--
-- The anon key lets anyone talk to this table directly, without the site's form, so
-- every rule lives here as well as in lib/listing.ts:
--   * CHECK constraints refuse any shape that means nothing;
--   * column-level grants decide which columns the public may write at all;
--   * row-level security allows public read and public insert, and nothing else.
--
-- Lists below (category slugs, country codes, text limits) mirror lib/constants.ts.
-- tests/unit/schema-sync.test.ts fails if the two drift apart.

create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  title       text not null,
  category    text not null,
  country     text not null,
  city        text not null,
  district    text,
  description text not null,
  price       text,            -- free text exactly as typed; never a number, never sorted
  photo       text,            -- object path inside the listing-photos bucket, not a URL
  whatsapp    text,            -- E.164
  phone       text,            -- E.164
  social      text,            -- Instagram handle, without "@"
  created_at  timestamptz not null default now(),

  -- what the free-text search matches: name, title, description, city, district
  search_text text generated always as (
    name || ' ' || title || ' ' || description || ' ' || city || ' ' || coalesce(district, '')
  ) stored,

  constraint listings_name_check        check (btrim(name) <> '' and char_length(name) <= 60),
  constraint listings_title_check       check (btrim(title) <> '' and char_length(title) <= 80),
  constraint listings_description_check check (btrim(description) <> '' and char_length(description) <= 600),
  constraint listings_city_check        check (btrim(city) <> ''),
  constraint listings_district_check    check (district is null or btrim(district) <> ''),
  constraint listings_price_check       check (price is null or (btrim(price) <> '' and char_length(price) <= 40)),

  constraint listings_category_check check (category in (
    'hairdressing',
    'makeup',
    'nails',
    'henna',
    'tailoring',
    'clothes-for-sale',
    'cooking-and-desserts',
    'private-tutoring',
    'cleaning',
    'childcare',
    'elderly-care'
  )),

  constraint listings_country_check check (country in ('EG', 'SA', 'AE')),

  constraint listings_photo_check    check (photo is null or photo ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'),
  constraint listings_whatsapp_check check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  constraint listings_phone_check    check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  constraint listings_social_check   check (social is null or social ~ '^[A-Za-z0-9._]{1,30}$'),

  -- a number belongs to the listing's country: dialling code, length and first digit
  constraint listings_phone_country_check check (
       (country = 'EG' and (whatsapp is null or whatsapp ~ '^\+201[0-9]{9}$') and (phone is null or phone ~ '^\+201[0-9]{9}$'))
    or (country = 'SA' and (whatsapp is null or whatsapp ~ '^\+9665[0-9]{8}$') and (phone is null or phone ~ '^\+9665[0-9]{8}$'))
    or (country = 'AE' and (whatsapp is null or whatsapp ~ '^\+9715[0-9]{8}$') and (phone is null or phone ~ '^\+9715[0-9]{8}$'))
  ),

  -- at least one way to reach her (the patterns above already refuse empty strings)
  constraint listings_contact_check check (num_nonnulls(whatsapp, phone, social) >= 1)
);

create index listings_country_created_idx on public.listings (country, created_at desc);
create index listings_country_category_created_idx on public.listings (country, category, created_at desc);

-- Privileges. Older projects grant everything on new public tables to anon/authenticated
-- by default; projects created after 2026-04-28 grant nothing, not even to service_role.
-- Either way: take it all back, then give exactly what each role needs.
revoke all on table public.listings from public, anon, authenticated, service_role;
-- service_role (the secret key, server-side only): maintenance — removal, cleanup.
grant select, insert, update, delete on table public.listings to service_role;
grant select on table public.listings to anon, authenticated;
grant insert (name, title, category, country, city, district, description,
              price, photo, whatsapp, phone, social)
  on table public.listings to anon, authenticated;
-- id and created_at are never writable by the public; there is no UPDATE or DELETE grant.

alter table public.listings enable row level security;

create policy listings_public_read on public.listings
  for select to anon, authenticated using (true);

create policy listings_public_insert on public.listings
  for insert to anon, authenticated with check (true);

-- No update or delete policy: with RLS on, those are refused for everyone but the owner
-- and service_role (the developer, from the dashboard).

-- Per-category counts for the category bar. Runs with the caller's rights, so RLS applies.
create function public.listing_category_counts(p_country text)
returns table (category text, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.category, count(*)::bigint
  from public.listings l
  where l.country = p_country
  group by l.category
$$;

revoke execute on function public.listing_category_counts(text) from public;
grant execute on function public.listing_category_counts(text) to anon, authenticated, service_role;

-- Photos ------------------------------------------------------------------------------
-- Public bucket: anyone can read a photo by its URL. 5 MB limit, JPEG/PNG/WebP only.
-- KNOWN GAPS (accepted for now, see docs/SECURITY-NOTES.md):
--   * orphan photos: an upload whose listing is never submitted stays in the bucket;
--   * anonymous upload means anyone holding the anon key can fill the bucket without
--     ever visiting the site;
--   * the MIME check trusts the Content-Type the client sends.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Upload only: new objects with a "<uuid>.<ext>" name. No select/update/delete policy,
-- so the public cannot list, overwrite or remove objects through the API.
create policy listing_photos_public_upload on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'listing-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
