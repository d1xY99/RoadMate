-- migrate:up

create table rbac.user_role (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role_name  text not null references rbac.role (name) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_name)
);

-- Permission check usable in RLS policies and the backend auth middleware.
-- security definer so it reads rbac.* without tripping RLS recursion.
create or replace function rbac.has(uid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = rbac
as $$
  select exists (
    select 1
    from rbac.user_role ur
    join rbac.role_permission rp on rp.role_name = ur.role_name
    where ur.user_id = uid and rp.permission_name = perm
  );
$$;

alter table rbac.user_role enable row level security;

create policy user_role_select on rbac.user_role
  for select to authenticated
  using (user_id = auth.uid() or rbac.has(auth.uid(), 'roles.manage'));

create policy user_role_admin_write on rbac.user_role
  for all to authenticated
  using (rbac.has(auth.uid(), 'roles.manage'))
  with check (rbac.has(auth.uid(), 'roles.manage'));

grant select on rbac.user_role to authenticated;
grant execute on function rbac.has(uuid, text) to authenticated, anon;

-- migrate:down

drop table if exists rbac.user_role cascade;
drop function if exists rbac.has(uuid, text) cascade;
