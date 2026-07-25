-- migrate:up

-- Realtime za cijeli tok pomoći i prijateljstva: klijent globalno sluša
-- promjene (GlobalRealtime u webu) umjesto da čeka poll/refresh. RLS i dalje
-- filtrira šta ko smije primiti (request_messages i direct_messages su već
-- u publikaciji od ranije).
alter publication supabase_realtime add table public.help_requests;
alter publication supabase_realtime add table public.help_offers;
alter publication supabase_realtime add table public.friendships;

-- migrate:down

alter publication supabase_realtime drop table public.friendships;
alter publication supabase_realtime drop table public.help_offers;
alter publication supabase_realtime drop table public.help_requests;
