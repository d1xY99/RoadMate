-- migrate:up

-- #31: keep the profiles thumbs_up / thumbs_down aggregates in sync with the
-- feedback table. Fires on insert; feedback is immutable (no update policy).
create or replace function public.apply_feedback_thumbs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.positive then
    update public.profiles
    set thumbs_up = thumbs_up + 1
    where id = new.to_user;
  else
    update public.profiles
    set thumbs_down = thumbs_down + 1
    where id = new.to_user;
  end if;
  return new;
end;
$$;

create trigger apply_feedback_thumbs_trg
  after insert on public.feedback
  for each row execute function public.apply_feedback_thumbs();

-- migrate:down

drop trigger if exists apply_feedback_thumbs_trg on public.feedback;
drop function if exists public.apply_feedback_thumbs();
