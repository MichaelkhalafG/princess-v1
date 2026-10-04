-- Search matches spelling, not just letters: the stored search text is folded the way
-- lib/search.ts foldArabic folds what she types — every alef form (آ أ إ ٱ) as ا, ى as ي,
-- ة as ه, no tashkeel, superscript alef or tatweel, runs of white space as one space,
-- Latin in lower case. So "مدينه نصر" finds "مدينة نصر" and "القاهره" finds "القاهرة".
-- tests/unit/schema-sync.test.ts checks these characters against lib/search.ts.
--
-- A generated column's expression cannot be altered in place before Postgres 17, so the
-- column is dropped and added again, in one transaction: there is never a moment without
-- it. Adding a stored generated column rewrites the table under an exclusive lock — at
-- this table's size, milliseconds. Nothing else depends on the column (no index, view or
-- function).
--
-- E'…' so that \u064B etc. are read as the characters themselves.

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
      E'\s+', ' ', 'g'
    )
  )
) stored;

commit;
