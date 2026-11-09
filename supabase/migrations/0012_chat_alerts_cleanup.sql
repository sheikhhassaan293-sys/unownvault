-- 1) Security clean-up
drop function if exists public.submit_manual_payment(text,text,text,text);
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 2) Staff alert for new custom requests (posted once to Discord #order-log)
alter table public.custom_requests add column if not exists discord_posted_at timestamptz;

-- 3) Order chat: one thread per order. A custom request and the order that pays for it share one
--    thread (the request id), so the conversation carries on from quote to delivery.
create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  sender text not null check (sender in ('buyer','staff')),
  body text not null check (length(body) between 1 and 1000),
  seen_by_staff boolean not null default false,
  seen_by_buyer boolean not null default false,
  staff_notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists order_messages_thread on public.order_messages (thread_id, created_at);
alter table public.order_messages enable row level security;

-- who is the caller in this thread? 'staff', 'buyer' or null (no access)
create or replace function public.chat_role(p_thread text, p_key text default null)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if public.is_admin() then return 'staff'; end if;
  if auth.uid() is not null and (
       exists (select 1 from public.custom_requests where id = p_thread and user_id = auth.uid())
    or exists (select 1 from public.orders where id = p_thread and user_id = auth.uid())
  ) then return 'buyer'; end if;
  if p_key is not null and exists (
       select 1 from public.custom_requests where id = p_thread and access_key is not null and access_key = p_key
  ) then return 'buyer'; end if;
  return null;
end $$;

-- open while the work is open; closes when the order is completed (or refunded / declined)
create or replace function public.chat_open(p_thread text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.custom_requests where id = p_thread) then
      (select status not in ('completed','declined') from public.custom_requests where id = p_thread)
      and not exists (select 1 from public.orders where type = 'custom' and item_id = p_thread and status in ('completed','refunded'))
    when exists (select 1 from public.orders where id = p_thread) then
      (select status not in ('completed','refunded') from public.orders where id = p_thread)
    else false
  end;
$$;

-- signed-in buyers and admins read rows directly (this is what lets live updates reach them)
drop policy if exists "chat read" on public.order_messages;
create policy "chat read" on public.order_messages for select
  using (public.chat_role(thread_id) is not null);

-- everything else goes through these functions
create or replace function public.chat_fetch(p_thread text, p_key text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text := public.chat_role(p_thread, p_key);
begin
  if v_role is null then raise exception 'Chat not found'; end if;
  if v_role = 'staff' then
    update public.order_messages set seen_by_staff = true where thread_id = p_thread and sender = 'buyer' and not seen_by_staff;
  else
    update public.order_messages set seen_by_buyer = true where thread_id = p_thread and sender = 'staff' and not seen_by_buyer;
  end if;
  return jsonb_build_object(
    'role', v_role,
    'open', public.chat_open(p_thread),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'sender', sender, 'body', body, 'created_at', created_at) order by created_at)
      from (select * from public.order_messages where thread_id = p_thread order by created_at desc limit 200) m
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.chat_send(p_thread text, p_body text, p_key text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.chat_role(p_thread, p_key); v_body text := btrim(coalesce(p_body, ''));
begin
  if v_role is null then raise exception 'Chat not found'; end if;
  if length(v_body) not between 1 and 1000 then raise exception 'Message must be 1 to 1000 characters'; end if;
  if v_role = 'buyer' then
    if not public.chat_open(p_thread) then raise exception 'This chat is closed'; end if;
    if (select count(*) from public.order_messages where thread_id = p_thread and sender = 'buyer' and created_at > now() - interval '10 minutes') >= 20 then
      raise exception 'Slow down a little — try again in a few minutes';
    end if;
  end if;
  insert into public.order_messages (thread_id, sender, body, seen_by_staff, seen_by_buyer)
  values (p_thread, v_role, v_body, v_role = 'staff', v_role = 'buyer');
end $$;

-- buyer: how many unread staff messages per thread (for the little dot)
create or replace function public.chat_unread(p_threads jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(t.id, n.c), '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_threads, '[]'::jsonb)) as t(id text, key text)
  cross join lateral (
    select count(*) as c from public.order_messages m
    where m.thread_id = t.id and m.sender = 'staff' and not m.seen_by_buyer
  ) n
  where public.chat_role(t.id, t.key) = 'buyer' and n.c > 0;
$$;

grant execute on function public.chat_role(text, text) to anon, authenticated;
grant execute on function public.chat_open(text) to anon, authenticated;
grant execute on function public.chat_fetch(text, text) to anon, authenticated;
grant execute on function public.chat_send(text, text, text) to anon, authenticated;
grant execute on function public.chat_unread(jsonb) to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'order_messages') then
    alter publication supabase_realtime add table public.order_messages;
  end if;
end $$;
