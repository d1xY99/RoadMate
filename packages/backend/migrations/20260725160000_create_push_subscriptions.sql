-- migrate:up

-- Web Push pretplate: jedan red po browseru/uređaju. Slanje radi isključivo
-- edge funkcija `push` (service role); klijent samo upravlja svojim redovima.
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions
  to authenticated;
grant select, insert, update, delete on public.push_subscriptions
  to service_role;

-- Primaoci push-a za novi zahtjev: dostupni pomagači u radijusu, bez
-- tražitelja i blokiranih parova. Samo za edge funkciju (service role).
create or replace function public.helpers_near_request(
  p_request_id uuid,
  radius_m double precision default 15000
)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id as user_id
  from public.help_requests hr
  join public.profiles p
    on p.is_available
   and p.current_location is not null
   and p.id <> hr.requester_id
   and ST_DWithin(p.current_location, hr.location, radius_m)
  where hr.id = p_request_id
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = p.id and b.blocked_id = hr.requester_id)
         or (b.blocker_id = hr.requester_id and b.blocked_id = p.id)
    );
$$;

revoke execute on function public.helpers_near_request(uuid, double precision)
  from public, anon, authenticated;
grant execute on function public.helpers_near_request(uuid, double precision)
  to service_role;

-- migrate:down

drop function if exists public.helpers_near_request(uuid, double precision);
drop table if exists public.push_subscriptions cascade;
