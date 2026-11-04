-- UnownVault — database schema, security rules (RLS) and storage.
-- Run once in Supabase: Dashboard → SQL Editor → paste this whole file → Run.

-- ───────────────────────────────────────────── helpers
create extension if not exists pgcrypto;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────────────────────────────────────── profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  discord_tag text,
  role text not null default 'user' check (role in ('user','admin')),
  patreon_user_id text unique,
  whop_user_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

-- new auth user → empty profile (username picked on first visit)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, discord_tag)
  values (new.id, coalesce(new.raw_user_meta_data->>'preferred_username', new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- users can't promote themselves: only admins may change role
create or replace function public.guard_profile_role() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_admin() and current_user <> 'service_role' and auth.uid() is not null then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles for each row execute function public.guard_profile_role();

-- live "is this trainer name free?" check, callable by anyone
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name))
     and lower(name) not in ('admin','administrator','support','mod','moderator','unownvault','staff','owner','system');
$$;

-- ───────────────────────────────────────────── site content (edited from /admin)
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  discord_url text not null default '',
  contact_email text not null default '',
  hero_eyebrow text not null default '',
  hero_headline text not null default '',
  hero_headline_accent text not null default '',
  hero_tagline text not null default '',
  queue_open boolean not null default true,
  status_payments text not null default '',
  status_plans text not null default '',
  status_updates text not null default '',
  payment_instructions text not null default '',
  maintenance boolean not null default false,
  patreon_enabled boolean not null default false,
  manual_payments_enabled boolean not null default false,
  availability_note text not null default '',
  copy jsonb not null default '{}'::jsonb,
  fx_rates jsonb not null default '{"USD":1}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

create table if not exists public.subscription_tiers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  tagline text not null default '',
  period text not null check (period in ('weekly','monthly')),
  price numeric(10,2) not null check (price >= 0),
  currency text not null default 'USD',
  features jsonb not null default '[]'::jsonb,
  compare jsonb not null default '{}'::jsonb,
  recommended boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  whop_plan_id text,
  patreon_enabled boolean not null default false,
  patreon_tier_id text,
  patreon_join_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  slug text primary key,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.services (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null references public.service_categories(slug) on update cascade,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  currency text not null default 'USD',
  price_is_from boolean not null default false,
  delivery_time text not null default '',
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  featured boolean not null default false,
  popular boolean not null default false,
  whop_plan_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  body text not null default '',
  image_url text,
  price numeric(10,2) not null check (price >= 0),
  currency text not null default 'USD',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  pinned boolean not null default false,
  published boolean not null default false,
  whop_plan_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id text primary key default gen_random_uuid()::text,
  question text not null,
  answer text not null default '',
  sort_order int not null default 0
);

-- ───────────────────────────────────────────── orders & subscriptions
create table if not exists public.orders (
  id text primary key default ('UV-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  user_id uuid references public.profiles(id) on delete set null,
  buyer_email text,
  type text not null check (type in ('subscription','service','offer','custom')),
  item_id text not null,
  item_name text not null,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','awaiting_confirmation','pending','in_progress','completed','refunded','disputed')),
  provider text not null check (provider in ('whop','patreon','manual')),
  payment_method text,
  transaction_ref text,
  external_payment_id text unique,
  proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user on public.orders (user_id, created_at desc);

create table if not exists public.subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references public.profiles(id) on delete cascade,
  tier_id text references public.subscription_tiers(id) on delete set null,
  source text not null check (source in ('whop','patreon','manual')),
  external_id text unique,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active','cancelled','expired','past_due')),
  renews boolean not null default true,
  manage_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_requests (
  id text primary key default ('UV-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  user_id uuid references public.profiles(id) on delete set null,
  request_type text not null,
  target text not null,
  details text not null,
  budget numeric(10,2),
  deadline date,
  discord_username text not null,
  image_url text,
  status text not null default 'new' check (status in ('new','quoted','accepted','in_progress','completed','declined')),
  quote_amount numeric(10,2),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- raw webhook logs (debugging, unclaimed Patreon pledges)
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_type text not null,
  external_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
create unique index if not exists payment_events_dedupe on public.payment_events (provider, external_id) where external_id is not null;

create table if not exists public.patreon_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  patreon_user_id text,
  patreon_tier_id text,
  payload jsonb not null,
  matched_user_id uuid references public.profiles(id),
  received_at timestamptz not null default now()
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['site_settings','subscription_tiers','services','offers','orders','subscriptions','custom_requests'] loop
    execute format('drop trigger if exists touch on public.%I; create trigger touch before update on public.%I for each row execute function public.touch_updated_at();', t, t);
  end loop;
end $$;

-- buyer confirms delivery
create or replace function public.mark_order_received(order_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'completed'
   where id = order_id and user_id = auth.uid() and status in ('pending','in_progress');
  if not found then raise exception 'order not found or not deliverable'; end if;
end $$;

-- anyone (signed in or not) can send a custom request; returns its id
create or replace function public.submit_custom_request(
  p_type text, p_target text, p_details text, p_budget numeric, p_deadline date, p_discord text, p_image_url text
) returns text language plpgsql security definer set search_path = public as $$
declare new_id text;
begin
  if length(coalesce(p_target,'')) not between 1 and 200 then raise exception 'target required'; end if;
  if length(coalesce(p_details,'')) not between 10 and 4000 then raise exception 'details too short or long'; end if;
  if coalesce(p_discord,'') !~ '^[A-Za-z0-9_.]{2,32}$' then raise exception 'invalid discord username'; end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 100000) then raise exception 'invalid budget'; end if;
  insert into public.custom_requests (user_id, request_type, target, details, budget, deadline, discord_username, image_url)
  values (auth.uid(), left(p_type, 60), p_target, p_details, p_budget, p_deadline, p_discord, p_image_url)
  returning id into new_id;
  return new_id;
end $$;

-- manual payment (bank transfer etc.): order waits for the admin to confirm. Price comes from the database.
create or replace function public.submit_manual_payment(p_kind text, p_item_id text, p_txn text, p_proof_path text)
returns text language plpgsql security definer set search_path = public as $$
declare v_name text; v_price numeric; new_id text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not (select manual_payments_enabled from public.site_settings where id = 1) then raise exception 'manual payments are off'; end if;
  if length(coalesce(p_txn,'')) not between 4 and 100 then raise exception 'transaction id required'; end if;
  if p_kind = 'subscription' then select name || ' — ' || period, price into v_name, v_price from public.subscription_tiers where id = p_item_id and active;
  elsif p_kind = 'service' then select name, price into v_name, v_price from public.services where id = p_item_id and active;
  elsif p_kind = 'offer' then select title, price into v_name, v_price from public.offers where id = p_item_id and published and now() between starts_at and ends_at;
  elsif p_kind = 'custom' then select 'Custom request #' || id, quote_amount into v_name, v_price from public.custom_requests where id = p_item_id and user_id = auth.uid() and status = 'quoted';
  end if;
  if v_price is null then raise exception 'item not available'; end if;
  insert into public.orders (user_id, type, item_id, item_name, amount, status, provider, payment_method, transaction_ref, proof_url)
  values (auth.uid(), p_kind, p_item_id, v_name, v_price, 'awaiting_confirmation', 'manual', 'manual', p_txn, p_proof_path)
  returning id into new_id;
  return new_id;
end $$;

-- ───────────────────────────────────────────── row level security
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.subscription_tiers enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.offers enable row level security;
alter table public.faqs enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.custom_requests enable row level security;
alter table public.payment_events enable row level security;
alter table public.patreon_events enable row level security;

-- drop + recreate so this file can be re-run safely
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: you see/edit yourself; admins see/edit everyone
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "edit own profile" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- public content: everyone reads what's live; admins read & write everything
create policy "read settings" on public.site_settings for select using (true);
create policy "admin settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

create policy "read tiers" on public.subscription_tiers for select using (active or public.is_admin());
create policy "admin tiers" on public.subscription_tiers for all using (public.is_admin()) with check (public.is_admin());

create policy "read categories" on public.service_categories for select using (true);
create policy "admin categories" on public.service_categories for all using (public.is_admin()) with check (public.is_admin());

create policy "read services" on public.services for select using (active or public.is_admin());
create policy "admin services" on public.services for all using (public.is_admin()) with check (public.is_admin());

create policy "read offers" on public.offers for select using (published or public.is_admin());
create policy "admin offers" on public.offers for all using (public.is_admin()) with check (public.is_admin());

create policy "read faqs" on public.faqs for select using (true);
create policy "admin faqs" on public.faqs for all using (public.is_admin()) with check (public.is_admin());

-- orders & subscriptions: created by the payment webhooks (service role); users read their own
create policy "own orders" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "admin orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "own subscriptions" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy "admin subscriptions" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

-- custom requests: sent through submit_custom_request(); you read your own; admins read & reply
create policy "own requests" on public.custom_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "admin requests" on public.custom_requests for update using (public.is_admin()) with check (public.is_admin());

create policy "admin payment events" on public.payment_events for select using (public.is_admin());
create policy "admin patreon events" on public.patreon_events for select using (public.is_admin());

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.mark_order_received(text) to authenticated;
grant execute on function public.submit_manual_payment(text,text,text,text) to authenticated;
grant execute on function public.submit_custom_request(text,text,text,numeric,date,text,text) to anon, authenticated;

-- ───────────────────────────────────────────── storage (images)
insert into storage.buckets (id, name, public) values ('public-images', 'public-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('request-images', 'request-images', false) on conflict (id) do nothing;

drop policy if exists "public images read" on storage.objects;
drop policy if exists "admin uploads public images" on storage.objects;
drop policy if exists "anyone uploads request images" on storage.objects;
drop policy if exists "admin reads request images" on storage.objects;
create policy "public images read" on storage.objects for select using (bucket_id = 'public-images');
create policy "admin uploads public images" on storage.objects for all
  using (bucket_id = 'public-images' and public.is_admin()) with check (bucket_id = 'public-images' and public.is_admin());
create policy "anyone uploads request images" on storage.objects for insert with check (bucket_id = 'request-images');
create policy "admin reads request images" on storage.objects for select using (bucket_id = 'request-images' and public.is_admin());
-- (payment screenshots also go in the private request-images bucket, under proofs/)
