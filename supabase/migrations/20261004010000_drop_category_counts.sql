-- The category chips no longer show counts (the total stays in the results heading), so
-- nothing calls listing_category_counts any more. Dropping it also removes the execute
-- grants made in 20261003000000_listings.sql.
--
-- Plain drop, no "if exists": run against a database that never had it, this should fail
-- loudly rather than pass in silence.

drop function public.listing_category_counts(text);
