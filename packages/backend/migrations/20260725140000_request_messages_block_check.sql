-- migrate:up

-- Blocks (20260719120000) hide users from discovery, but the request chat
-- policies (20260706120000) predate them: two parties of an accepted request
-- could still message each other after blocking. Enforce blocks in chat too.
--
-- The check must run as a security definer function: RLS on blocked_users only
-- shows a user the rows they created, so a plain subquery in a policy would
-- miss "the other party blocked me".
create or replace function public.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocked_users bu
    where (bu.blocker_id = a and bu.blocked_id = b)
       or (bu.blocker_id = b and bu.blocked_id = a)
  );
$$;

revoke all on function public.blocked_between(uuid, uuid) from public;
grant execute on function public.blocked_between(uuid, uuid)
  to authenticated, service_role;

-- Only the two parties can read/write, so a block between requester and
-- helper is exactly "a block between the sender and the other party".
-- helper_id may still be null (no helper accepted): blocked_between then
-- returns false and the requester keeps access.
drop policy request_messages_select on public.request_messages;
create policy request_messages_select on public.request_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.help_requests hr
      where hr.id = request_id
        and (hr.requester_id = auth.uid() or hr.helper_id = auth.uid())
        and not public.blocked_between(hr.requester_id, hr.helper_id)
    )
  );

drop policy request_messages_insert on public.request_messages;
create policy request_messages_insert on public.request_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.help_requests hr
      where hr.id = request_id
        and (hr.requester_id = auth.uid() or hr.helper_id = auth.uid())
        and not public.blocked_between(hr.requester_id, hr.helper_id)
    )
  );

-- migrate:down

drop policy request_messages_select on public.request_messages;
create policy request_messages_select on public.request_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.help_requests hr
      where hr.id = request_id
        and (hr.requester_id = auth.uid() or hr.helper_id = auth.uid())
    )
  );

drop policy request_messages_insert on public.request_messages;
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

drop function if exists public.blocked_between(uuid, uuid);
