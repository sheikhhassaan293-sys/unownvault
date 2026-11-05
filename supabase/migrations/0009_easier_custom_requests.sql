-- Easier custom requests:
--  * only the target is required (details, Discord name, budget are optional); no deadline any more
--  * you must be signed in, so the buyer can see your quote and pay it
--  * the owner adds how long it'll take ("eta") with the quote
--  * buyers can delete their own request while it's waiting for / showing a quote
alter table public.custom_requests add column if not exists eta text;
alter table public.custom_requests alter column discord_username drop not null;
alter table public.custom_requests alter column details set default '';

create or replace function public.submit_custom_request(
  p_type text, p_target text, p_details text, p_budget numeric, p_discord text, p_image_url text
) returns text language plpgsql security definer set search_path = public as $$
declare new_id text; v_discord text;
begin
  if auth.uid() is null then raise exception 'Please log in to send a request'; end if;
  if (select queue_open from public.site_settings where id = 1) is false then raise exception 'Orders are paused right now'; end if;
  if length(btrim(coalesce(p_target,''))) not between 1 and 200 then raise exception 'Tell us what you need'; end if;
  if length(coalesce(p_details,'')) > 4000 then raise exception 'Details are too long'; end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 100000) then raise exception 'invalid budget'; end if;
  v_discord := nullif(btrim(coalesce(p_discord,'')), '');
  if v_discord is not null and length(v_discord) > 40 then raise exception 'Discord username is too long'; end if;
  -- fall back to the Discord name on their account
  v_discord := coalesce(v_discord, (select discord_tag from public.profiles where id = auth.uid()));
  insert into public.custom_requests (user_id, request_type, target, details, budget, discord_username, image_url)
  values (auth.uid(), left(coalesce(nullif(p_type,''), 'Something else'), 60), btrim(p_target), coalesce(p_details,''), p_budget, v_discord, p_image_url)
  returning id into new_id;
  return new_id;
end $$;
revoke execute on function public.submit_custom_request(text,text,text,numeric,text,text) from public, anon;
grant execute on function public.submit_custom_request(text,text,text,numeric,text,text) to authenticated;

-- the old guest version (with a deadline) is retired
drop function if exists public.submit_custom_request(text,text,text,numeric,date,text,text);

create or replace function public.delete_custom_request(p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  delete from public.custom_requests
  where id = p_id and user_id = auth.uid() and status in ('new','quoted','declined');
  if not found then raise exception 'This request can''t be deleted (it may already be paid or in progress)'; end if;
end $$;
revoke execute on function public.delete_custom_request(text) from public, anon;
grant execute on function public.delete_custom_request(text) to authenticated;
