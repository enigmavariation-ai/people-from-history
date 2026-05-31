-- Add the summary + Wikipedia link columns used by the in-game
-- "about this figure" reveal panel. Filled by
-- scripts/backfillSummaries.mjs from each figure's Wikipedia summary
-- endpoint.
--
-- `summary` is text-not-null so the client can render without
-- conditional logic. Empty string means "no summary yet".
-- `wikipedia_url` may be null if Wikipedia returned no canonical URL
-- (very rare).

alter table public.figures
  add column if not exists summary text not null default '',
  add column if not exists wikipedia_url text;
