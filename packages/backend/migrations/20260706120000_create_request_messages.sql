-- migrate:up

-- #29: chat between the requester and the helper of a request. Web talks to
-- Supabase directly (Realtime for live updates); the Elysia endpoint is #35.
create table public.request_messages (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  sender_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index request_messages_request_idx
  on public.request_messages (request_id, created_at);

alter table public.request_messages enable row level security;

-- Only the two parties of the request can read or write its messages.
create policy request_messages_select on public.request_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.help_requests hr
      where hr.id = request_id
        and (hr.requester_id = auth.uid() or hr.helper_id = auth.uid())
    )
  );

create policy request_messages_insert on public.request_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.help_requests hr
      where hr.id = request_id
        and (hr.requester_id = auth.uid() or hr.helper_id = auth.uid())
    )
  );

grant select, insert on public.request_messages to authenticated;
grant select, insert, update, delete on public.request_messages to service_role;

-- Live updates over Supabase Realtime (postgres_changes honours RLS).
alter publication supabase_realtime add table public.request_messages;

-- migrate:down

drop table if exists public.request_messages cascade;
