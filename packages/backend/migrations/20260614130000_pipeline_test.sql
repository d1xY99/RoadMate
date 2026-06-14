-- migrate:up

create table public.pipeline_test (
  id         uuid primary key default gen_random_uuid(),
  note       text,
  created_at timestamptz not null default now()
);

-- migrate:down

drop table if exists public.pipeline_test;
