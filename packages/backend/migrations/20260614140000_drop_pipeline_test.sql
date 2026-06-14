-- migrate:up

-- Remove the temporary table used to verify the migration pipeline.
drop table if exists public.pipeline_test;

-- migrate:down

create table public.pipeline_test (
  id         uuid primary key default gen_random_uuid(),
  note       text,
  created_at timestamptz not null default now()
);
