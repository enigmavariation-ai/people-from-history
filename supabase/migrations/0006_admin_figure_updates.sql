-- Allow the curation admin to update existing figure rows from the
-- browser. Scoped to a whitelist of email addresses by reading
-- `auth.jwt() ->> 'email'` from the request's bearer JWT.
--
-- Inserts and deletes remain service-role-only — those run from the
-- seed/mirror scripts. This policy is just for editing focal_x,
-- focal_y, start_size, and similar curation fields in the live app.
--
-- To add or remove admins later, edit the email list and re-run this
-- migration with a `create or replace` (or write a follow-up
-- migration that drops and re-creates the policy).

drop policy if exists "Admins can update figures" on public.figures;

create policy "Admins can update figures"
  on public.figures
  for update
  to authenticated
  using (
    coalesce(auth.jwt() ->> 'email', '') in (
      'niklas.fip@gmail.com'
    )
  )
  with check (
    coalesce(auth.jwt() ->> 'email', '') in (
      'niklas.fip@gmail.com'
    )
  );
