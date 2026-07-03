-- migrate:up

-- Expose public.profiles to the Data API roles. Supabase stopped auto-granting
-- privileges on new public tables (auto_expose_new_tables default flipped to
-- false on 2026-05-30), so the RLS policies added in the profiles migration had
-- no effect over PostgREST — every request returned 403. Row access stays
-- constrained by the existing RLS policies (select: any authenticated;
-- insert/update: only id = auth.uid()).
grant select, insert, update on public.profiles to authenticated;

-- migrate:down

revoke select, insert, update on public.profiles from authenticated;
