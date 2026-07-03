-- migrate:up

create extension if not exists postgis;

create table public.help_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  helper_id    uuid references auth.users (id) on delete set null,
  type         text not null check (type in
                 ('flat_tire', 'dead_battery', 'out_of_fuel',
                  'stuck', 'mechanical', 'other')),
  description  text,
  location     geography(point, 4326) not null,
  status       text not null default 'open' check (status in
                 ('open', 'accepted', 'resolved', 'cancelled')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  resolved_at  timestamptz,
  cancelled_at timestamptz
);

-- Geo lookup for "open requests near me" (matching, #24).
create index help_requests_location_idx
  on public.help_requests using gist (location);
-- Discovery of open requests; partial keeps it small and hot.
create index help_requests_open_idx
  on public.help_requests (status) where status = 'open';
-- Per-user lookups ("my requests", "requests I'm helping with").
create index help_requests_requester_idx
  on public.help_requests (requester_id);
create index help_requests_helper_idx
  on public.help_requests (helper_id);

alter table public.help_requests enable row level security;

-- Read: the requester, the assigned helper, or anyone (authenticated) while the
-- request is still open so nearby helpers can discover it.
create policy help_requests_select on public.help_requests
  for select to authenticated
  using (
    requester_id = auth.uid()
    or helper_id = auth.uid()
    or status = 'open'
  );

-- Create: only for yourself.
create policy help_requests_insert on public.help_requests
  for insert to authenticated
  with check (requester_id = auth.uid());

-- Update: the requester (cancel/resolve) or the assigned helper (resolve).
-- Claiming an open request (setting helper_id) goes through a security-definer
-- RPC in #24, not this policy.
create policy help_requests_update on public.help_requests
  for update to authenticated
  using (requester_id = auth.uid() or helper_id = auth.uid())
  with check (requester_id = auth.uid() or helper_id = auth.uid());

-- Data API / backend grants. Supabase no longer auto-grants privileges on new
-- public tables (auto_expose_new_tables default off since 2026-05-30), so RLS
-- policies alone would 403 over PostgREST. Row access stays constrained by the
-- policies above; service_role is backend-only and bypasses RLS by design.
grant select, insert, update on public.help_requests to authenticated;
grant select, insert, update, delete on public.help_requests to service_role;

-- migrate:down

drop table if exists public.help_requests cascade;
