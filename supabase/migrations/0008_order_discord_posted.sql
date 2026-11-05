-- New orders are announced in Discord (#recent-orders + staff #order-log) once.
alter table public.orders add column if not exists discord_posted_at timestamptz;
