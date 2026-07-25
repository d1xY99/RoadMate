-- migrate:up

-- Zid zahvale: javni feed riješenih pomoći. Prikazuje pomagača (heroja),
-- tip problema i eventualnu pozitivnu pohvalu tražitelja; tražitelj ostaje
-- anoniman. Pomoći čiji je feedback prema pomagaču negativan se preskaču —
-- ovo je zid zahvale, ne žalbi.
create or replace function public.list_gratitude_wall(p_limit integer default 30)
returns table (
  request_id uuid,
  type text,
  resolved_at timestamptz,
  helper_id uuid,
  helper_name text,
  helper_photo text,
  helper_vehicle text,
  comment text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    hr.id as request_id,
    hr.type,
    hr.resolved_at,
    p.id as helper_id,
    p.full_name as helper_name,
    p.photo_url as helper_photo,
    p.vehicle_type as helper_vehicle,
    f.comment
  from public.help_requests hr
  join public.profiles p on p.id = hr.helper_id
  left join public.feedback f
    on f.request_id = hr.id
   and f.to_user = hr.helper_id
   and f.from_user = hr.requester_id
  where hr.status = 'resolved'
    and hr.helper_id is not null
    and hr.resolved_at is not null
    and coalesce(f.positive, true)
  order by hr.resolved_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

-- Brojke za vrh zida: ukupno pomoći, zadnjih 7 dana, broj heroja.
create or replace function public.gratitude_stats()
returns table (
  total_helps bigint,
  helps_7d bigint,
  helpers bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) as total_helps,
    count(*) filter (
      where hr.resolved_at > now() - interval '7 days'
    ) as helps_7d,
    count(distinct hr.helper_id) as helpers
  from public.help_requests hr
  where hr.status = 'resolved' and hr.helper_id is not null;
$$;

grant execute on function public.list_gratitude_wall(integer) to authenticated;
grant execute on function public.gratitude_stats() to authenticated;

-- migrate:down

drop function if exists public.gratitude_stats();
drop function if exists public.list_gratitude_wall(integer);
