-- Live updates: the admin panel sees new requests/orders instantly, buyers see quotes without reloading.
-- Realtime respects row-level security, so buyers only receive their own rows; admins receive all.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'custom_requests') then
    alter publication supabase_realtime add table public.custom_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
