-- migrate:up

create table rbac.permission (
  name        text primary key,
  description text
);

create table rbac.role_permission (
  role_name       text not null references rbac.role (name) on delete cascade,
  permission_name text not null references rbac.permission (name) on delete cascade,
  primary key (role_name, permission_name)
);

grant select on rbac.permission to authenticated, anon;
grant select on rbac.role_permission to authenticated, anon;

insert into rbac.role (name, description) values
  ('admin', 'Full administrative access.'),
  ('support', 'Can review and manage requests and reports.'),
  ('customer', 'Regular user: creates requests and offers help.')
on conflict (name) do nothing;

insert into rbac.permission (name, description) values
  ('users.read', 'View users.'),
  ('users.manage', 'Create, edit, delete users and assign roles.'),
  ('requests.read', 'View help requests.'),
  ('requests.manage', 'Edit, cancel or resolve any help request.'),
  ('reports.read', 'View user reports.'),
  ('reports.manage', 'Resolve or dismiss user reports.'),
  ('roles.manage', 'Manage roles and permissions.')
on conflict (name) do nothing;

insert into rbac.role_permission (role_name, permission_name) values
  ('admin', 'users.read'),
  ('admin', 'users.manage'),
  ('admin', 'requests.read'),
  ('admin', 'requests.manage'),
  ('admin', 'reports.read'),
  ('admin', 'reports.manage'),
  ('admin', 'roles.manage'),
  ('support', 'users.read'),
  ('support', 'requests.read'),
  ('support', 'requests.manage'),
  ('support', 'reports.read'),
  ('support', 'reports.manage'),
  ('customer', 'requests.read')
on conflict do nothing;

-- migrate:down

drop table if exists rbac.role_permission;
drop table if exists rbac.permission;
delete from rbac.role where name in ('admin', 'support', 'customer');
