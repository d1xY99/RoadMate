-- migrate:up

-- Expose public.profiles to the Data API / backend roles. Supabase stopped
-- auto-granting privileges on new public tables (auto_expose_new_tables default
-- flipped to false on 2026-05-30), so neither the `authenticated` role (web app,
-- direct PostgREST access) nor the `service_role` (Elysia backend, /users/me)
-- had table privileges — requests failed with 403 / "permission denied".
--
-- Row access for `authenticated` stays constrained by the existing RLS policies
-- (select: any authenticated; insert/update: only id = auth.uid()). `service_role`
-- bypasses RLS by design and is backend-only (never exposed to the browser).
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.profiles to service_role;

-- migrate:down

revoke select, insert, update on public.profiles from authenticated;
revoke select, insert, update on public.profiles from service_role;
