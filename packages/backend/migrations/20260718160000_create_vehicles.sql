-- migrate:up

create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  vin           text not null,
  make          text,
  model         text,
  model_year    integer check (model_year is null or model_year between 1886 and 2100),
  trim          text,
  body_class    text,
  vehicle_type  text,
  fuel_type     text,
  engine        text,
  transmission  text,
  drive_type    text,
  manufacturer  text,
  plant_country text,
  raw_decode    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint vehicles_vin_format check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  constraint vehicles_user_vin_unique unique (user_id, vin)
);

create index vehicles_user_idx on public.vehicles (user_id);

alter table public.vehicles enable row level security;

create policy vehicles_select on public.vehicles
  for select to authenticated
  using (user_id = auth.uid());

create policy vehicles_insert on public.vehicles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy vehicles_update on public.vehicles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy vehicles_delete on public.vehicles
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.vehicles to service_role;

-- migrate:down

drop table if exists public.vehicles cascade;
