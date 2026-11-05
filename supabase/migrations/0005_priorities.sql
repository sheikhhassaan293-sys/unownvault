-- Priority Pokémon: each customer keeps a wishlist ({"shiny":[ids], "shundo":[ids], "hundo":[ids]}),
-- and every order stores a copy of it from the moment they bought.
alter table public.profiles add column if not exists priorities jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists priorities jsonb;

-- keep wishlists small and well-formed
alter table public.profiles drop constraint if exists profiles_priorities_shape;
alter table public.profiles add constraint profiles_priorities_shape check (
  jsonb_typeof(priorities) = 'object'
  and (priorities->'shiny'  is null or jsonb_typeof(priorities->'shiny')  = 'array')
  and (priorities->'shundo' is null or jsonb_typeof(priorities->'shundo') = 'array')
  and (priorities->'hundo'  is null or jsonb_typeof(priorities->'hundo')  = 'array')
  and coalesce(jsonb_array_length(case when jsonb_typeof(priorities->'shiny')  = 'array' then priorities->'shiny'  end), 0) <= 40
  and coalesce(jsonb_array_length(case when jsonb_typeof(priorities->'shundo') = 'array' then priorities->'shundo' end), 0) <= 40
  and coalesce(jsonb_array_length(case when jsonb_typeof(priorities->'hundo')  = 'array' then priorities->'hundo'  end), 0) <= 40
);

-- orders made by bank transfer also keep the buyer's wishlist
create or replace function public.copy_priorities_to_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.priorities is null and new.user_id is not null then
    select priorities into new.priorities from public.profiles where id = new.user_id;
  end if;
  return new;
end $$;
revoke execute on function public.copy_priorities_to_order() from public, anon, authenticated;
drop trigger if exists orders_copy_priorities on public.orders;
create trigger orders_copy_priorities before insert on public.orders for each row execute function public.copy_priorities_to_order();
