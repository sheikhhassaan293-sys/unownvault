-- Quantity (+/−) per service, quote-only services, and the buyer's cooldown answer on orders.
alter table public.services add column if not exists allow_quantity boolean not null default false;
alter table public.services add column if not exists max_quantity int not null default 20 check (max_quantity between 1 and 100);
alter table public.services add column if not exists quote_only boolean not null default false;

alter table public.orders add column if not exists quantity int not null default 1 check (quantity between 1 and 100);
-- {"has": true, "minutes_left": 60} — "has": false means no cooldown
alter table public.orders add column if not exists cooldown jsonb;

-- Manual payments carry the same quantity + cooldown answer as Whop checkouts.
create or replace function public.submit_manual_payment(p_kind text, p_item_id text, p_txn text, p_proof_path text, p_quantity int, p_cooldown jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_name text; v_price numeric; v_allow boolean := false; v_max int := 1; v_quote boolean := false; v_qty int := 1; v_cd jsonb; new_id text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if (select queue_open from public.site_settings where id = 1) is false then raise exception 'Orders are paused right now'; end if;
  if not (select manual_payments_enabled from public.site_settings where id = 1) then raise exception 'manual payments are off'; end if;
  if length(coalesce(p_txn,'')) not between 4 and 100 then raise exception 'transaction id required'; end if;
  if p_kind = 'subscription' then select name || ' — ' || period, price into v_name, v_price from public.subscription_tiers where id = p_item_id and active;
  elsif p_kind = 'service' then select name, price, allow_quantity, max_quantity, quote_only into v_name, v_price, v_allow, v_max, v_quote from public.services where id = p_item_id and active;
  elsif p_kind = 'offer' then select title, price into v_name, v_price from public.offers where id = p_item_id and published and now() between starts_at and ends_at;
  elsif p_kind = 'custom' then select 'Custom request #' || id, quote_amount into v_name, v_price from public.custom_requests where id = p_item_id and user_id = auth.uid() and status = 'quoted';
  end if;
  if v_price is null or v_quote then raise exception 'item not available'; end if;
  if v_allow then v_qty := least(greatest(coalesce(p_quantity, 1), 1), v_max); end if;
  if v_qty > 1 then v_name := v_name || ' ×' || v_qty; v_price := round(v_price * v_qty, 2); end if;
  if p_kind <> 'subscription' and p_cooldown is not null then
    v_cd := jsonb_build_object('has', coalesce((p_cooldown->>'has')::boolean, false),
      'minutes_left', case when (p_cooldown->>'has')::boolean then least(greatest(coalesce((p_cooldown->>'minutes_left')::int, 0), 0), 120) end);
  end if;
  insert into public.orders (user_id, type, item_id, item_name, amount, status, provider, payment_method, transaction_ref, proof_url, quantity, cooldown)
  values (auth.uid(), p_kind, p_item_id, v_name, v_price, 'awaiting_confirmation', 'manual', 'manual', p_txn, p_proof_path, v_qty, v_cd)
  returning id into new_id;
  return new_id;
end $$;
revoke execute on function public.submit_manual_payment(text,text,text,text,int,jsonb) from public, anon;
grant execute on function public.submit_manual_payment(text,text,text,text,int,jsonb) to authenticated;
