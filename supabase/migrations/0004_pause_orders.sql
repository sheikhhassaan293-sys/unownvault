-- "Taking orders" switch off (site_settings.queue_open = false) also blocks new requests and manual payments.
create or replace function public.submit_custom_request(
  p_type text, p_target text, p_details text, p_budget numeric, p_deadline date, p_discord text, p_image_url text
) returns text language plpgsql security definer set search_path = public as $$
declare new_id text;
begin
  if (select queue_open from public.site_settings where id = 1) is false then raise exception 'Orders are paused right now'; end if;
  if length(coalesce(p_target,'')) not between 1 and 200 then raise exception 'target required'; end if;
  if length(coalesce(p_details,'')) not between 10 and 4000 then raise exception 'details too short or long'; end if;
  if coalesce(p_discord,'') !~ '^[A-Za-z0-9_.]{2,32}$' then raise exception 'invalid discord username'; end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 100000) then raise exception 'invalid budget'; end if;
  insert into public.custom_requests (user_id, request_type, target, details, budget, deadline, discord_username, image_url)
  values (auth.uid(), left(p_type, 60), p_target, p_details, p_budget, p_deadline, p_discord, p_image_url)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.submit_manual_payment(p_kind text, p_item_id text, p_txn text, p_proof_path text)
returns text language plpgsql security definer set search_path = public as $$
declare v_name text; v_price numeric; new_id text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if (select queue_open from public.site_settings where id = 1) is false then raise exception 'Orders are paused right now'; end if;
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
