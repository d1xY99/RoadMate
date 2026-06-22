-- migrate:up

create extension if not exists postgis;

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '',
  phone            text,
  photo_url        text,
  vehicle_type     text check (vehicle_type in
                     ('car', 'van', 'truck', 'motorcycle', 'suv_4x4')),
  is_available     boolean not null default false,
  current_location geography(point, 4326),
  last_seen_at     timestamptz,
  thumbs_up        integer not null default 0,
  thumbs_down      integer not null default 0,
  created_at       timestamptz not null default now()
);

create index profiles_location_idx on public.profiles using gist (current_location);
create index profiles_available_idx on public.profiles (is_available)
  where is_available = true;

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- migrate:down

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop table if exists public.profiles cascade;
