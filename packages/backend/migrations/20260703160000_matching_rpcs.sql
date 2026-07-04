-- migrate:up

-- RPCs the web app calls directly over PostgREST (#24). PostGIS lives in the
-- `extensions` schema on Supabase, so include it in search_path for ST_* funcs.

-- find_nearby_helpers: available helpers within `radius_m` of a point, nearest
-- first. Excludes the caller. SECURITY DEFINER so it returns a controlled,
-- limited projection regardless of how profiles RLS is tightened later.
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

-- create_help_request: open a new request for the calling user.
create or replace function public.create_help_request(
  p_type text,
  p_description text,
  lat double precision,
  lng double precision
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.help_requests (requester_id, type, description, location)
  values (
    auth.uid(),
    p_type,
    p_description,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- update_my_location: set the caller's live location + availability toggle.
create or replace function public.update_my_location(
  lat double precision,
  lng double precision,
  available boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.profiles
  set current_location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      is_available = available,
      last_seen_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.find_nearby_helpers(
  double precision, double precision, double precision
) to authenticated, anon;
grant execute on function public.create_help_request(
  text, text, double precision, double precision
) to authenticated, anon;
grant execute on function public.update_my_location(
  double precision, double precision, boolean
) to authenticated, anon;

-- migrate:down

drop function if exists public.update_my_location(
  double precision, double precision, boolean
);
drop function if exists public.create_help_request(
  text, text, double precision, double precision
);
drop function if exists public.find_nearby_helpers(
  double precision, double precision, double precision
);
