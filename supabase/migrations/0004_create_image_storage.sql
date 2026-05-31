-- Public storage bucket for portrait images. Mirrors Wikimedia content
-- so we can serve from our own infrastructure (Wikimedia's TOS prohibits
-- production hotlinking; their thumbnails also rate-limit at scale).
--
-- The bucket is `figures`. Files are named `{figure_id}.jpg` (or .png).
-- The bucket is marked public so files are reachable via the standard
-- public URL (no signed URLs required for read access). RLS policies on
-- `storage.objects` enforce: anyone can read, only the service role can
-- write/update/delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'figures',
  'figures',
  true,
  5242880, -- 5 MB per image, plenty for portraits at sensible resolution
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access to the figures bucket.
drop policy if exists "Anyone can read figure images" on storage.objects;
create policy "Anyone can read figure images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'figures');

-- Writes are intentionally service-role only. We do NOT create policies
-- for insert/update/delete; the service role bypasses RLS, and the anon
-- key has no path to mutate the bucket.
