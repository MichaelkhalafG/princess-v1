-- Fixes 20261005000000_fold_search_text.sql. Its white-space pattern reached the database
-- as E'\s+': inside E'…' a backslash before "s" is no escape, so Postgres read the
-- pattern as "s+" and every Latin "s" in the stored search text became a space
-- ("dist" → "di t"). Here the pattern is the POSIX class [[:space:]]+, which needs no
-- escape at all; the only backslashes left are the \uXXXX letters, which E'…' reads as
-- intended (tests/unit/schema-sync.test.ts now checks exactly that). Nothing else changes.
--
-- Same shape as before: drop and add in one transaction. The stored text of every row is
-- recomputed, so the damaged rows are repaired by this alone.

begin;

alter table public.listings drop column search_text;

alter table public.listings add column search_text text generated always as (
  lower(
    regexp_replace(
      regexp_replace(
        translate(
          name || ' ' || title || ' ' || description || ' ' || city || ' ' || coalesce(district, ''),
          E'\u0622\u0623\u0625\u0671\u0649\u0629',
          E'\u0627\u0627\u0627\u0627\u064A\u0647'
        ),
        E'[\u064B-\u065F\u0670\u0640]', '', 'g'
      ),
      '[[:space:]]+', ' ', 'g'
    )
  )
) stored;

commit;
