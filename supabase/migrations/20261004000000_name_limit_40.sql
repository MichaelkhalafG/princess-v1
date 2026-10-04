-- Names are capped at 40 characters (was 60). The card shows the name on one line; a
-- full four-part Arabic name rarely passes 35, and 60 only bought a cut-off name and a
-- squeezed area line. lib/constants.ts LIMITS.name says the same (tests/unit/schema-sync).
--
-- One statement, so the drop and the add happen together or not at all. Adding the
-- constraint checks every existing row: shorten any name over 40 first or it fails
-- and changes nothing.

alter table public.listings
  drop constraint listings_name_check,
  add constraint listings_name_check check (btrim(name) <> '' and char_length(name) <= 40);
