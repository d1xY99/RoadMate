-- migrate:up

-- ── help_offers ──────────────────────────────────────────────────────────────
-- A helper offering to take a request. The requester then accepts one offer.
create table public.help_offers (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.help_requests (id) on delete cascade,
  helper_id   uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'offered' check (status in
                ('offered', 'accepted', 'declined', 'withdrawn')),
  eta_minutes integer check (eta_minutes >= 0),
  created_at  timestamptz not null default now(),
  -- one offer per helper per request
  unique (request_id, helper_id)
);

create index help_offers_request_idx on public.help_offers (request_id);
create index help_offers_helper_idx on public.help_offers (helper_id);

alter table public.help_offers enable row level security;

-- Visible to the offering helper and to the request's owner.
create policy help_offers_select on public.help_offers
  for select to authenticated
  using (
    helper_id = auth.uid()
    or exists (
      select 1 from public.help_requests hr
      where hr.id = request_id and hr.requester_id = auth.uid()
    )
  );

-- A helper offers only as themselves.
create policy help_offers_insert on public.help_offers
  for insert to authenticated
  with check (helper_id = auth.uid());

-- Helper can withdraw; requester can accept/decline offers on their request.
create policy help_offers_update on public.help_offers
  for update to authenticated
  using (
    helper_id = auth.uid()
    or exists (
      select 1 from public.help_requests hr
      where hr.id = request_id and hr.requester_id = auth.uid()
    )
  )
  with check (
    helper_id = auth.uid()
    or exists (
      select 1 from public.help_requests hr
      where hr.id = request_id and hr.requester_id = auth.uid()
    )
  );

grant select, insert, update on public.help_offers to authenticated;
grant select, insert, update, delete on public.help_offers to service_role;

-- ── feedback ─────────────────────────────────────────────────────────────────
-- Thumbs up/down left after a request is resolved. One per rater per request.
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  from_user  uuid not null references auth.users (id) on delete cascade,
  to_user    uuid not null references auth.users (id) on delete cascade,
  positive   boolean not null,
  comment    text,
  created_at timestamptz not null default now(),
  check (from_user <> to_user),
  unique (request_id, from_user)
);

create index feedback_to_user_idx on public.feedback (to_user);
create index feedback_request_idx on public.feedback (request_id);

alter table public.feedback enable row level security;

-- Only the two parties involved can read a feedback row.
create policy feedback_select on public.feedback
  for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

-- You may only leave feedback as yourself.
create policy feedback_insert on public.feedback
  for insert to authenticated
  with check (from_user = auth.uid());

grant select, insert on public.feedback to authenticated;
grant select, insert, update, delete on public.feedback to service_role;

-- ── reports ──────────────────────────────────────────────────────────────────
-- A user reporting another (abuse, no-show, etc.). Moderated by support/admin
-- via the RBAC `reports.read` / `reports.manage` permissions.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  request_id  uuid references public.help_requests (id) on delete set null,
  reason      text not null,
  status      text not null default 'open' check (status in
                ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index reports_reported_idx on public.reports (reported_id);
create index reports_status_idx on public.reports (status);

alter table public.reports enable row level security;

-- The reporter sees their own reports; support/admin sees all.
create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or rbac.has(auth.uid(), 'reports.read'));

-- Anyone authenticated can file a report as themselves.
create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- Only support/admin can triage (resolve/dismiss) reports.
create policy reports_update on public.reports
  for update to authenticated
  using (rbac.has(auth.uid(), 'reports.manage'))
  with check (rbac.has(auth.uid(), 'reports.manage'));

grant select, insert, update on public.reports to authenticated;
grant select, insert, update, delete on public.reports to service_role;

-- migrate:down

drop table if exists public.reports cascade;
drop table if exists public.feedback cascade;
drop table if exists public.help_offers cascade;
