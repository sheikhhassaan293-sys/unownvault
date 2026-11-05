-- Remember which offers were already posted to Discord #limited-offers (so each is posted once).
alter table public.offers add column if not exists discord_posted_at timestamptz;
-- offers that existed before auto-posting count as already posted
update public.offers set discord_posted_at = now() where discord_posted_at is null;
