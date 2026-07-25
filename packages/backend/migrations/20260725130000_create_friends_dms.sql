-- migrate:up

-- Prijateljstva: jedan red po paru; smjer čuva ko je poslao zahtjev.
-- Mutacije idu isključivo kroz security definer RPC-ove ispod (nema
-- direktnog insert/update), pa je RLS samo za čitanje.
create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy friendships_select on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

grant select on public.friendships to authenticated;
grant select, insert, update, delete on public.friendships to service_role;

-- Direktne poruke između prijatelja.
create table public.direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  check (sender_id <> recipient_id)
);

create index direct_messages_pair_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index direct_messages_unread_idx
  on public.direct_messages (recipient_id)
  where read_at is null;

alter table public.direct_messages enable row level security;

create policy direct_messages_select on public.direct_messages
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Slanje samo prijateljima, i to bez aktivne blokade u bilo kom smjeru.
create policy direct_messages_insert on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = auth.uid()))
    )
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = auth.uid() and b.blocked_id = recipient_id)
         or (b.blocker_id = recipient_id and b.blocked_id = auth.uid())
    )
  );

grant select, insert on public.direct_messages to authenticated;
grant select, insert, update, delete on public.direct_messages to service_role;

alter publication supabase_realtime add table public.direct_messages;

-- Pošalji (ili obnovi) zahtjev za prijateljstvo. Ako obrnuti pending već
-- postoji, to znači da se oboje žele — odmah prihvati.
create or replace function public.send_friend_request(p_user_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  f public.friendships;
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot befriend yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_user_id)
       or (b.blocker_id = p_user_id and b.blocked_id = auth.uid())
  ) then
    raise exception 'Cannot send request because a block exists'
      using errcode = '42501';
  end if;

  select * into f from public.friendships
  where (requester_id = auth.uid() and addressee_id = p_user_id)
     or (requester_id = p_user_id and addressee_id = auth.uid());

  if found then
    if f.status = 'accepted' then
      return f.id;
    end if;
    if f.status = 'pending' and f.addressee_id = auth.uid() then
      update public.friendships
        set status = 'accepted', responded_at = now()
        where id = f.id;
      return f.id;
    end if;
    if f.status = 'pending' then
      return f.id; -- već poslano, idempotentno
    end if;
    -- declined: dozvoli novi pokušaj, novi red sa svježim smjerom
    delete from public.friendships where id = f.id;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), p_user_id)
  returning id into fid;
  return fid;
end;
$$;

-- Prihvati ili odbij dolazni zahtjev (samo primalac, samo pending).
create or replace function public.respond_friend_request(
  p_friendship_id uuid,
  p_accept boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  f public.friendships;
begin
  select * into f from public.friendships where id = p_friendship_id;
  if not found or f.addressee_id <> auth.uid() then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if f.status <> 'pending' then
    raise exception 'Request already handled' using errcode = '22023';
  end if;
  update public.friendships
    set status = case when p_accept then 'accepted' else 'declined' end,
        responded_at = now()
    where id = f.id;
end;
$$;

-- Ukloni prijatelja ili otkaži svoj poslani zahtjev.
create or replace function public.remove_friend(p_user_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.friendships f
  where ((f.requester_id = auth.uid() and f.addressee_id = p_user_id)
      or (f.requester_id = p_user_id and f.addressee_id = auth.uid()))
    and (f.status = 'accepted' or f.requester_id = auth.uid());
$$;

-- Pretraga korisnika po imenu + status prijateljstva prema pozivaocu.
create or replace function public.search_users(p_query text)
returns table (
  id uuid,
  full_name text,
  photo_url text,
  vehicle_type text,
  thumbs_up integer,
  thumbs_down integer,
  friendship_id uuid,
  friendship_status text,
  is_requester boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.photo_url,
    p.vehicle_type,
    p.thumbs_up,
    p.thumbs_down,
    f.id as friendship_id,
    f.status as friendship_status,
    f.requester_id = auth.uid() as is_requester
  from public.profiles p
  left join public.friendships f
    on (f.requester_id = auth.uid() and f.addressee_id = p.id)
    or (f.requester_id = p.id and f.addressee_id = auth.uid())
  where p.id is distinct from auth.uid()
    and char_length(trim(p_query)) >= 2
    and p.full_name ilike '%' || trim(p_query) || '%'
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by p.full_name
  limit 20;
$$;

-- Lista prihvaćenih prijatelja.
create or replace function public.list_friends()
returns table (
  friend_id uuid,
  full_name text,
  photo_url text,
  vehicle_type text,
  thumbs_up integer,
  thumbs_down integer,
  friends_since timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as friend_id,
    p.full_name,
    p.photo_url,
    p.vehicle_type,
    p.thumbs_up,
    p.thumbs_down,
    f.responded_at as friends_since
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid()
                   then f.addressee_id else f.requester_id end
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by p.full_name;
$$;

-- Pending zahtjevi u oba smjera (incoming = true za dolazne).
create or replace function public.list_friend_requests()
returns table (
  friendship_id uuid,
  user_id uuid,
  full_name text,
  photo_url text,
  incoming boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id as friendship_id,
    p.id as user_id,
    p.full_name,
    p.photo_url,
    f.addressee_id = auth.uid() as incoming,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid()
                   then f.addressee_id else f.requester_id end
  where f.status = 'pending'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by f.created_at desc;
$$;

-- Razgovori: po sagovorniku zadnja poruka + broj nepročitanih.
create or replace function public.list_conversations()
returns table (
  partner_id uuid,
  full_name text,
  photo_url text,
  last_body text,
  last_at timestamptz,
  last_is_own boolean,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select
      dm.*,
      case when dm.sender_id = auth.uid()
           then dm.recipient_id else dm.sender_id end as partner
    from public.direct_messages dm
    where dm.sender_id = auth.uid() or dm.recipient_id = auth.uid()
  ),
  last as (
    select distinct on (partner)
      partner, body, created_at, sender_id
    from mine
    order by partner, created_at desc
  )
  select
    l.partner as partner_id,
    p.full_name,
    p.photo_url,
    l.body as last_body,
    l.created_at as last_at,
    l.sender_id = auth.uid() as last_is_own,
    (select count(*) from public.direct_messages u
      where u.sender_id = l.partner
        and u.recipient_id = auth.uid()
        and u.read_at is null) as unread_count
  from last l
  left join public.profiles p on p.id = l.partner
  order by l.created_at desc;
$$;

-- Označi sve poruke od datog korisnika kao pročitane.
create or replace function public.mark_dm_read(p_from uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.direct_messages
  set read_at = now()
  where sender_id = p_from
    and recipient_id = auth.uid()
    and read_at is null;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean)
  to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.search_users(text) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.list_friend_requests() to authenticated;
grant execute on function public.list_conversations() to authenticated;
grant execute on function public.mark_dm_read(uuid) to authenticated;

-- migrate:down

drop function if exists public.mark_dm_read(uuid);
drop function if exists public.list_conversations();
drop function if exists public.list_friend_requests();
drop function if exists public.list_friends();
drop function if exists public.search_users(text);
drop function if exists public.remove_friend(uuid);
drop function if exists public.respond_friend_request(uuid, boolean);
drop function if exists public.send_friend_request(uuid);

alter publication supabase_realtime drop table public.direct_messages;

drop table if exists public.direct_messages cascade;
drop table if exists public.friendships cascade;
