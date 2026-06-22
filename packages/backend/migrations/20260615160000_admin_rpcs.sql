-- migrate:up

-- Current user's role names (not gated — the client uses this to decide whether
-- to show the admin UI).
create or replace function public.current_user_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(ur.role_name), '{}')
  from rbac.user_role ur
  where ur.user_id = auth.uid();
$$;

-- Admin: list all users (profiles) with their roles. Gated on users.read.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  vehicle_type text,
  is_available boolean,
  created_at timestamptz,
  roles text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.vehicle_type,
    p.is_available,
    p.created_at,
    coalesce(
      array_agg(ur.role_name) filter (where ur.role_name is not null), '{}'
    ) as roles
  from public.profiles p
  left join rbac.user_role ur on ur.user_id = p.id
  where rbac.has(auth.uid(), 'users.read')
  group by p.id;
$$;

-- Admin: list roles with their permission count. Gated on roles.manage.
create or replace function public.admin_list_roles()
returns table (name text, description text, permission_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.name, r.description, count(rp.permission_name) as permission_count
  from rbac.role r
  left join rbac.role_permission rp on rp.role_name = r.name
  where rbac.has(auth.uid(), 'roles.manage')
  group by r.name, r.description;
$$;

-- Admin: list permissions. Gated on roles.manage.
create or replace function public.admin_list_permissions()
returns table (name text, description text)
language sql
stable
security definer
set search_path = public
as $$
  select p.name, p.description
  from rbac.permission p
  where rbac.has(auth.uid(), 'roles.manage');
$$;

grant execute on function public.current_user_roles() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_list_roles() to authenticated;
grant execute on function public.admin_list_permissions() to authenticated;

-- migrate:down

drop function if exists public.admin_list_permissions();
drop function if exists public.admin_list_roles();
drop function if exists public.admin_list_users();
drop function if exists public.current_user_roles();
