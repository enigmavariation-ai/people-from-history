-- Self-service account deletion. Authenticated users call
-- public.delete_my_account() from the client; the function deletes
-- their row from auth.users, and the ON DELETE CASCADE foreign keys
-- on public.daily_plays / practice_state / runs / profiles remove
-- the rest of their data automatically.
--
-- Runs as SECURITY DEFINER so the caller doesn't need write access
-- to the auth schema. Safety relies on reading `auth.uid()` inside
-- the function — only that one row is ever deleted, never an
-- arbitrary user_id supplied by the caller.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Cascades clean up:
  --   public.daily_plays   (FK ON DELETE CASCADE)
  --   public.practice_state (FK ON DELETE CASCADE)
  --   public.runs          (FK ON DELETE CASCADE)
  --   public.profiles      (FK ON DELETE CASCADE)
  --   auth.identities      (Supabase default cascade)
  --   auth.sessions        (Supabase default cascade)
  --   auth.refresh_tokens  (Supabase default cascade)
  delete from auth.users where id = uid;
end;
$$;

-- Lock down access: anonymous callers should not be able to invoke
-- this. (auth.uid() would be null and the function would raise, but
-- belt-and-braces.)
revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
