-- Discord's new usernames come through as "name#0": store just "name".
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, discord_tag)
  values (new.id, regexp_replace(coalesce(new.raw_user_meta_data->>'preferred_username', new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name'), '#0$', ''))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
update public.profiles set discord_tag = regexp_replace(discord_tag, '#0$', '') where discord_tag like '%#0';
