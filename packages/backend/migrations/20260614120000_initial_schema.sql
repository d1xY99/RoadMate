-- migrate:up

create extension if not exists postgis;


create schema if not exists rbac;

create table rbac.role (
  name        text primary key,
  description text
);

grant usage on schema rbac to authenticated, anon, service_role;
grant select on rbac.role to authenticated, anon;

-- migrate:down

drop schema if exists rbac cascade;
