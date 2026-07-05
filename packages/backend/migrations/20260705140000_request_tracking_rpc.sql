-- migrate:up

-- #28: live tracking after a match. Returns decoded coordinates for both sides
-- of a request (no WKB parsing in the browser) + distance/ETA input. Exact
-- coordinates are OK here — this only returns to the request's requester or
-- helper, and only "after a match" (privacy principle).
create or replace function public.get_request_tracking(p_request_id uuid)
returns table (
  status text,
  requester_lat double precision,
  requester_lng double precision,
  helper_lat double precision,
  helper_lng double precision,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    hr.status,
    ST_Y(hr.location::geometry) as requester_lat,
    ST_X(hr.location::geometry) as requester_lng,
    ST_Y(hp.current_location::geometry) as helper_lat,
    ST_X(hp.current_location::geometry) as helper_lng,
    case
      when hp.current_location is not null
      then ST_Distance(hr.location, hp.current_location)
    end as distance_m
  from public.help_requests hr
  left join public.profiles hp on hp.id = hr.helper_id
  where hr.id = p_request_id
    and (hr.requester_id = auth.uid() or hr.helper_id = auth.uid());
$$;

grant execute on function public.get_request_tracking(uuid) to authenticated;

-- migrate:down

drop function if exists public.get_request_tracking(uuid);
