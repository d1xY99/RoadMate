-- migrate:up

-- #10: the map needs to place helper markers, but exact positions stay private
-- ("approximate location shared on request; exact only after a match").
-- Return coordinates rounded to 3 decimals (~100 m) alongside the existing
-- projection. Distance still uses the exact location.
drop function if exists public.find_nearby_helpers(
  double precision, double precision, double precision
);

create function public.find_nearby_helpers(
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
  distance_m double precision,
  approx_lat double precision,
  approx_lng double precision
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
    ) as distance_m,
    round(ST_Y(p.current_location::geometry)::numeric, 3)::double precision
      as approx_lat,
    round(ST_X(p.current_location::geometry)::numeric, 3)::double precision
      as approx_lng
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

grant execute on function public.find_nearby_helpers(
  double precision, double precision, double precision
) to authenticated, anon;

-- migrate:down

drop function if exists public.find_nearby_helpers(
  double precision, double precision, double precision
);

-- Restore the #24 projection (no coordinates).
create function public.find_nearby_helpers(
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

grant execute on function public.find_nearby_helpers(
  double precision, double precision, double precision
) to authenticated, anon;
