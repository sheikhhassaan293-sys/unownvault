-- Guests can send custom requests without an account.
-- Each guest request gets a private key; the buyer's link (/custom?req=ID&key=KEY) is the only way to
-- see, pay or delete it. Logged-in buyers work as before. A guest who later logs in can claim theirs.
alter table public.custom_requests add column if not exists access_key text;
alter table public.custom_requests add column if not exists ip_hash text;
create index if not exists custom_requests_ip_recent on public.custom_requests (ip_hash, created_at);

-- Send a request (guest or signed in). Returns {"id": "...", "key": "..."} (key only for guests).
create or replace function public.send_custom_request(
  p_type text, p_target text, p_details text, p_budget numeric, p_discord text, p_image_url text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare new_id text; v_discord text; v_key text; v_ip text; v_headers jsonb;
begin
  if (select queue_open from public.site_settings where id = 1) is false then raise exception 'Orders are paused right now'; end if;
  if length(btrim(coalesce(p_target,''))) not between 1 and 200 then raise exception 'Tell us what you need'; end if;
  if length(coalesce(p_details,'')) > 4000 then raise exception 'Details are too long'; end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 100000) then raise exception 'invalid budget'; end if;
  v_discord := nullif(btrim(coalesce(p_discord,'')), '');
  if v_discord is not null and length(v_discord) > 40 then raise exception 'Discord username is too long'; end if;

  -- light spam guard: at most 5 requests an hour from one connection
  begin
    v_headers := current_setting('request.headers', true)::jsonb;
  exception when others then v_headers := null;
  end;
  v_ip := split_part(coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', ''), ',', 1);
  if v_ip <> '' then
    v_ip := md5(v_ip || 'uv-salt');
    if (select count(*) from public.custom_requests where ip_hash = v_ip and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'Too many requests — please wait a bit and try again';
    end if;
  else
    v_ip := null;
  end if;

  if auth.uid() is null then
    v_key := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  else
    v_discord := coalesce(v_discord, (select discord_tag from public.profiles where id = auth.uid()));
  end if;

  insert into public.custom_requests (user_id, request_type, target, details, budget, discord_username, image_url, access_key, ip_hash)
  values (auth.uid(), left(coalesce(nullif(p_type,''), 'Something else'), 60), btrim(p_target), coalesce(p_details,''), p_budget, v_discord, p_image_url, v_key, v_ip)
  returning id into new_id;
  return jsonb_build_object('id', new_id, 'key', v_key);
end $$;
grant execute on function public.send_custom_request(text,text,text,numeric,text,text) to anon, authenticated;

-- A guest reads their own requests with the key from their link.
create or replace function public.get_guest_requests(p_items jsonb)
returns setof public.custom_requests language sql security definer set search_path = public stable as $$
  select r.* from public.custom_requests r
  join jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x(id text, key text) on x.id = r.id
  where r.access_key is not null and r.access_key = x.key
  order by r.created_at desc
  limit 20;
$$;
grant execute on function public.get_guest_requests(jsonb) to anon, authenticated;

-- Delete: your own (signed in), or a guest request with its key.
create or replace function public.remove_custom_request(p_id text, p_key text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.custom_requests
  where id = p_id
    and status in ('new','quoted','declined')
    and ((auth.uid() is not null and user_id = auth.uid()) or (p_key is not null and access_key is not null and access_key = p_key));
  if not found then raise exception 'This request can''t be deleted (it may already be paid or in progress)'; end if;
end $$;
grant execute on function public.remove_custom_request(text, text) to anon, authenticated;

-- After logging in, a guest's requests (from this browser) move into their account.
create or replace function public.claim_guest_requests(p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return 0; end if;
  update public.custom_requests r set user_id = auth.uid(), access_key = null
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x(id text, key text)
  where x.id = r.id and r.user_id is null and r.access_key is not null and r.access_key = x.key;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.claim_guest_requests(jsonb) from public, anon;
grant execute on function public.claim_guest_requests(jsonb) to authenticated;

-- the sign-in-only versions are replaced by send_custom_request / remove_custom_request
drop function if exists public.submit_custom_request(text,text,text,numeric,text,text);
drop function if exists public.delete_custom_request(text);
