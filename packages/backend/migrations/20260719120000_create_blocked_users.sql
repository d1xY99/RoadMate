-- migrate:up

create table public.blocked_users (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

create index blocked_users_blocker_idx on public.blocked_users (blocker_id);
create index blocked_users_blocked_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

create policy blocked_users_select on public.blocked_users
  for select to authenticated
  using (blocker_id = auth.uid());

create policy blocked_users_insert on public.blocked_users
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy blocked_users_delete on public.blocked_users
  for delete to authenticated
  using (blocker_id = auth.uid());

grant select, insert, delete on public.blocked_users to authenticated;
grant select, insert, update, delete on public.blocked_users to service_role;

drop function if exists public.find_nearby_helpers(
  double precision, double precision, double precision
);
drop function if exists public.find_nearby_requests(
  double precision, double precision, double precision
);
drop function if exists public.offer_help(uuid, integer);
drop function if exists public.list_request_offers(uuid);

-- Hide helpers a user has blocked, and hide the current user from helpers who
-- blocked them. This keeps "available helpers" discovery aligned with block.
create or replace function public.find_nearby_helpers(
  lat double precision,
  lng double precision,
  radius_m double precision default 15000
)
returns table (
  id uuid,
  full_name text,
  vehicle_type text,
  thumbs_up integer,
  thumbs_down integer,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id,
    p.full_name,
    p.vehicle_type,
    p.thumbs_up,
    p.thumbs_down,
    ST_Distance(
      p.current_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m
  from public.profiles p
  where p.is_available
    and p.current_location is not null
    and p.id is distinct from auth.uid()
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
    and ST_DWithin(
      p.current_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
  order by distance_m;
$$;

-- Hide open requests where either side has blocked the other.
create or replace function public.find_nearby_requests(
  lat double precision,
  lng double precision,
  radius_m double precision default 15000
)
returns table (
  id uuid,
  type text,
  description text,
  distance_m double precision,
  approx_lat double precision,
  approx_lng double precision,
  created_at timestamptz,
  already_offered boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    hr.id,
    hr.type,
    hr.description,
    ST_Distance(
      hr.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m,
    round(ST_Y(hr.location::geometry)::numeric, 3)::double precision as approx_lat,
    round(ST_X(hr.location::geometry)::numeric, 3)::double precision as approx_lng,
    hr.created_at,
    exists (
      select 1 from public.help_offers o
      where o.request_id = hr.id
        and o.helper_id = auth.uid()
        and o.status in ('offered', 'accepted')
    ) as already_offered
  from public.help_requests hr
  where hr.status = 'open'
    and hr.requester_id is distinct from auth.uid()
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = auth.uid() and b.blocked_id = hr.requester_id)
         or (b.blocker_id = hr.requester_id and b.blocked_id = auth.uid())
    )
    and ST_DWithin(
      hr.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
  order by distance_m;
$$;

-- Prevent offers if a block exists between requester and helper.
create or replace function public.offer_help(
  p_request_id uuid,
  p_eta_minutes integer default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  req public.help_requests;
  offer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into req from public.help_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if req.requester_id = auth.uid() then
    raise exception 'Cannot offer help on your own request' using errcode = '22023';
  end if;
  if req.status <> 'open' then
    raise exception 'Request is no longer open' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = auth.uid() and b.blocked_id = req.requester_id)
       or (b.blocker_id = req.requester_id and b.blocked_id = auth.uid())
  ) then
    raise exception 'Cannot offer help because a block exists' using errcode = '42501';
  end if;

  insert into public.help_offers (request_id, helper_id, eta_minutes)
  values (p_request_id, auth.uid(), p_eta_minutes)
  on conflict (request_id, helper_id)
    do update set status = 'offered', eta_minutes = excluded.eta_minutes
  returning id into offer_id;

  return offer_id;
end;
$$;

-- Hide offers from blocked helpers, and offers to requesters who blocked them.
create or replace function public.list_request_offers(p_request_id uuid)
returns table (
  offer_id uuid,
  helper_id uuid,
  full_name text,
  vehicle_type text,
  thumbs_up integer,
  thumbs_down integer,
  eta_minutes integer,
  distance_m double precision,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    o.id as offer_id,
    o.helper_id,
    p.full_name,
    p.vehicle_type,
    p.thumbs_up,
    p.thumbs_down,
    o.eta_minutes,
    case
      when p.current_location is not null
      then ST_Distance(hr.location, p.current_location)
    end as distance_m,
    o.created_at
  from public.help_offers o
  join public.help_requests hr on hr.id = o.request_id
  left join public.profiles p on p.id = o.helper_id
  where o.request_id = p_request_id
    and o.status = 'offered'
    and hr.requester_id = auth.uid()
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = auth.uid() and b.blocked_id = o.helper_id)
         or (b.blocker_id = o.helper_id and b.blocked_id = auth.uid())
    )
  order by o.created_at;
$$;

grant execute on function public.find_nearby_helpers(
  double precision, double precision, double precision
) to authenticated, anon;
grant execute on function public.find_nearby_requests(
  double precision, double precision, double precision
) to authenticated;
grant execute on function public.offer_help(uuid, integer) to authenticated;
grant execute on function public.list_request_offers(uuid) to authenticated;

-- migrate:down

drop function if exists public.find_nearby_helpers(
  double precision, double precision, double precision
);
drop function if exists public.find_nearby_requests(
  double precision, double precision, double precision
);
drop function if exists public.offer_help(uuid, integer);
drop function if exists public.list_request_offers(uuid);

create or replace function public.find_nearby_helpers(
  lat double precision,
  lng double precision,
  radius_m double precision default 15000
)
returns table (
  id uuid,
  full_name text,
  vehicle_type text,
  thumbs_up integer,
  thumbs_down integer,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id,
    p.full_name,
    p.vehicle_type,
    p.thumbs_up,
    p.thumbs_down,
    ST_Distance(
      p.current_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m
  from public.profiles p
  where p.is_available
    and p.current_location is not null
    and p.id is distinct from auth.uid()
    and ST_DWithin(
      p.current_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
  order by distance_m;
$$;

create or replace function public.find_nearby_requests(
  lat double precision,
  lng double precision,
  radius_m double precision default 15000
)
returns table (
  id uuid,
  type text,
  description text,
  distance_m double precision,
  approx_lat double precision,
  approx_lng double precision,
  created_at timestamptz,
  already_offered boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    hr.id,
    hr.type,
    hr.description,
    ST_Distance(
      hr.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m,
    round(ST_Y(hr.location::geometry)::numeric, 3)::double precision as approx_lat,
    round(ST_X(hr.location::geometry)::numeric, 3)::double precision as approx_lng,
    hr.created_at,
    exists (
      select 1 from public.help_offers o
      where o.request_id = hr.id
        and o.helper_id = auth.uid()
        and o.status in ('offered', 'accepted')
    ) as already_offered
  from public.help_requests hr
  where hr.status = 'open'
    and hr.requester_id is distinct from auth.uid()
    and ST_DWithin(
      hr.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
  order by distance_m;
$$;

create or replace function public.offer_help(
  p_request_id uuid,
  p_eta_minutes integer default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  req public.help_requests;
  offer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into req from public.help_requests where id = p_request_id;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if req.requester_id = auth.uid() then
    raise exception 'Cannot offer help on your own request' using errcode = '22023';
  end if;
  if req.status <> 'open' then
    raise exception 'Request is no longer open' using errcode = '22023';
  end if;

  insert into public.help_offers (request_id, helper_id, eta_minutes)
  values (p_request_id, auth.uid(), p_eta_minutes)
  on conflict (request_id, helper_id)
    do update set status = 'offered', eta_minutes = excluded.eta_minutes
  returning id into offer_id;

  return offer_id;
end;
$$;

create or replace function public.list_request_offers(p_request_id uuid)
returns table (
  offer_id uuid,
  helper_id uuid,
  full_name text,
  vehicle_type text,
  thumbs_up integer,
  thumbs_down integer,
  eta_minutes integer,
  distance_m double precision,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    o.id as offer_id,
    o.helper_id,
    p.full_name,
    p.vehicle_type,
    p.thumbs_up,
    p.thumbs_down,
    o.eta_minutes,
    case
      when p.current_location is not null
      then ST_Distance(hr.location, p.current_location)
    end as distance_m,
    o.created_at
  from public.help_offers o
  join public.help_requests hr on hr.id = o.request_id
  left join public.profiles p on p.id = o.helper_id
  where o.request_id = p_request_id
    and o.status = 'offered'
    and hr.requester_id = auth.uid()
  order by o.created_at;
$$;

grant execute on function public.find_nearby_helpers(
  double precision, double precision, double precision
) to authenticated, anon;
grant execute on function public.find_nearby_requests(
  double precision, double precision, double precision
) to authenticated;
grant execute on function public.offer_help(uuid, integer) to authenticated;
grant execute on function public.list_request_offers(uuid) to authenticated;

drop table if exists public.blocked_users cascade;
