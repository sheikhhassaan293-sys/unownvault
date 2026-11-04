-- Patreon is not used: remove its columns and log table.
alter table public.profiles drop column if exists patreon_user_id;
alter table public.subscription_tiers drop column if exists patreon_enabled, drop column if exists patreon_tier_id, drop column if exists patreon_join_url;
alter table public.site_settings drop column if exists patreon_enabled;
drop table if exists public.patreon_events;

alter table public.orders drop constraint if exists orders_provider_check;
alter table public.orders add constraint orders_provider_check check (provider in ('whop','manual'));
alter table public.subscriptions drop constraint if exists subscriptions_source_check;
alter table public.subscriptions add constraint subscriptions_source_check check (source in ('whop','manual'));

-- Tighten function permissions (from Supabase's security advisor).
alter function public.touch_updated_at() set search_path = public;
alter function public.guard_profile_role() set search_path = public;

-- trigger-only: nobody should call it directly
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- signed-in only (they already refuse anonymous callers; this removes the endpoint for them)
revoke execute on function public.mark_order_received(text) from public, anon;
revoke execute on function public.submit_manual_payment(text,text,text,text) from public, anon;
grant execute on function public.mark_order_received(text) to authenticated;
grant execute on function public.submit_manual_payment(text,text,text,text) to authenticated;

-- Intentionally public (used by the site before login):
--   username_available()      live trainer-name check
--   submit_custom_request()   custom request form (validates its inputs)
--   is_admin()                used inside row-level security rules, must stay callable
