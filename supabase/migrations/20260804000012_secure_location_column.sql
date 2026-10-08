-- Privacy hardening: exact coordinates (`profiles.location`) may only be
-- written through the security-definer RPC `update_my_location`, never
-- directly through the client API.
--
-- `profiles_update_own` / `profiles_insert_own` still let a user edit their
-- own row, but this revoke removes the column-level privilege, so the
-- PostgREST client cannot read or write `location` directly. The
-- security-definer function (table owner privileges) is unaffected.

revoke update (location) on public.profiles from anon, authenticated;
revoke insert (location) on public.profiles from anon, authenticated;
