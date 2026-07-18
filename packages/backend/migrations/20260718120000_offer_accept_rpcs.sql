-- migrate:up

-- The matching handshake (#24 follow-up). Until now a helper could be *found*
-- (find_nearby_helpers) but had no way to claim a request, and a requester had
-- no way to accept an offer — so a request could never leave 'open'. These RPCs
-- close that loop:
--   helper:    find_nearby_requests -> offer_help
--   requester: list_request_offers  -> accept_offer  (open -> accepted)
-- Claiming sets help_requests.helper_id, which RLS deliberately forbids via the
-- table policy (a stranger isn't yet the helper), so it must run SECURITY DEFINER.

-- find_nearby_requests: open requests within `radius_m` of a point, nearest
-- first. Excludes the caller's own requests. Coordinates are rounded to ~100 m
-- (privacy: approximate location shared before a match, exact only after).
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

-- offer_help: the caller offers to take an open request. Idempotent — a repeat
-- (e.g. after withdrawing) re-arms the existing offer rather than erroring.
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

-- list_request_offers: offers on a request, for the request's owner only, with
-- the helper's public profile projection + distance to the request.
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

-- accept_offer: the requester accepts one offer. Atomically claims the request
-- (open -> accepted, stamps helper_id) and marks the winning offer 'accepted',
-- the rest 'declined'. Guards against a request that was cancelled or already
-- accepted in a race.
create or replace function public.accept_offer(p_offer_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  ofr public.help_offers;
  claimed uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into ofr from public.help_offers where id = p_offer_id;
  if not found then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  update public.help_requests
  set helper_id = ofr.helper_id,
      status = 'accepted',
      accepted_at = now()
  where id = ofr.request_id
    and requester_id = auth.uid()
    and status = 'open'
  returning id into claimed;

  if claimed is null then
    raise exception 'Request is not open or not yours' using errcode = '22023';
  end if;

  update public.help_offers
  set status = case when id = p_offer_id then 'accepted' else 'declined' end
  where request_id = ofr.request_id;

  return ofr.request_id;
end;
$$;

grant execute on function public.find_nearby_requests(
  double precision, double precision, double precision
) to authenticated;
grant execute on function public.offer_help(uuid, integer) to authenticated;
grant execute on function public.list_request_offers(uuid) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;

-- migrate:down

drop function if exists public.accept_offer(uuid);
drop function if exists public.list_request_offers(uuid);
drop function if exists public.offer_help(uuid, integer);
drop function if exists public.find_nearby_requests(
  double precision, double precision, double precision
);
