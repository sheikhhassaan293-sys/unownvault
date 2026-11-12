-- Members list + personal offers.
-- A personal offer is a custom request the owner creates for a member, already quoted, so the
-- member can pay it with the normal "Pay" button. It pops up for them the moment it's sent.

alter table public.custom_requests add column if not exists is_offer boolean not null default false;

-- Admin only: everyone who has signed up, with their email and last sign-in.
create or replace function public.admin_members()
returns table (id uuid, username text, discord_tag text, email text, provider text, role text, joined_at timestamptz, last_sign_in_at timestamptz, orders int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, p.username, p.discord_tag, u.email::text, coalesce(u.raw_app_meta_data->>'provider', 'email'), p.role,
           u.created_at, u.last_sign_in_at,
           (select count(*)::int from public.orders o where o.user_id = p.id)
    from public.profiles p join auth.users u on u.id = p.id
    order by u.created_at desc;
end $$;
revoke execute on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;

-- Admin only: send the same offer to one or more members. Returns how many were sent.
create or replace function public.admin_send_offer(p_users uuid[], p_title text, p_description text, p_price numeric, p_eta text)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; u uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then raise exception 'Give the offer a title'; end if;
  if p_price is null or p_price <= 0 or p_price > 100000 then raise exception 'Set a price above 0'; end if;
  foreach u in array coalesce(p_users, '{}') loop
    if exists (select 1 from public.profiles where id = u) then
      insert into public.custom_requests (user_id, request_type, target, details, budget, discord_username, status, quote_amount, eta, is_offer)
      values (u, 'Special offer', btrim(p_title), coalesce(btrim(p_description), ''), null,
              (select discord_tag from public.profiles where id = u), 'quoted', round(p_price, 2), nullif(btrim(coalesce(p_eta, '')), ''), true);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.admin_send_offer(uuid[], text, text, numeric, text) from public, anon;
grant execute on function public.admin_send_offer(uuid[], text, text, numeric, text) to authenticated;

-- Admin only: take back an offer (unless it's already been paid).
create or replace function public.admin_delete_offer(p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.custom_requests where id = p_id and is_offer and status in ('quoted', 'new', 'declined');
  if not found then raise exception 'That offer was already paid, so it can''t be removed'; end if;
end $$;
revoke execute on function public.admin_delete_offer(text) from public, anon;
grant execute on function public.admin_delete_offer(text) to authenticated;

-- new sign-ups show up in the admin list straight away
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
