-- Starter content (generated from data/content.ts). Safe to run more than once.

update public.site_settings set discord_url = 'https://discord.gg/your-invite',
  contact_email = 'hello@unownvault.com',
  hero_eyebrow = 'Services for Pokémon GO',
  hero_headline = 'Shundos,',
  hero_headline_accent = 'on order.',
  hero_tagline = 'Shiny, hundo and shundo hunts, stardust runs and raid packs — handled by real players while you get on with your week.',
  queue_open = true,
  status_payments = 'Card · PayPal · Crypto',
  status_plans = 'Weekly / Monthly',
  status_updates = 'Discord DMs',
  payment_instructions = 'JazzCash / Easypaisa: 0300-0000000 (UnownVault)
Bank transfer: IBAN PK00 XXXX 0000 0000 0000 0000
Use your trainer name as the reference.',
  maintenance = false,
  patreon_enabled = true,
  manual_payments_enabled = false,
  copy = '{"how_title":"Three steps.\nZero grinding.","home_steps":"Choose | Pick a weekly or monthly plan, or order a one-off hunt from the services page.\nPay | Card, Apple Pay, Google Pay, PayPal or crypto through secure checkout. Takes a minute.\nWe hunt | Your order joins the queue and progress lands in your Discord DMs until it''s done.","faq_title":"Before\nyou order.","discord_title":"The vault''s front door\nis on Discord.","discord_text":"Order updates, event drops and first dibs on limited slots — all in one server.","subs_title":"Weekly grind.\nYou sleep, *we hunt.*","services_title":"One-off hunts,\n*forged to order.*","services_banner":"Not on the list? Ask for it.","custom_title":"Not on the list?\n*We''ll hunt it down.*","custom_lead":"Tell us the target, the deadline and your budget. You''ll get a quote within a day — and you only pay once you accept it.","custom_steps":"Send | Fill in the form with what you''re after.\nGet a quote | We reply on Discord within 24 hours with a price and timeline.\nPay & we start | Accept and a pay button appears in your account. Work starts right after.","custom_form_title":"Your target,\nyour terms.","custom_points":"Quotes in USD, no surprises later\nPay only after you accept the quote\nProgress updates on Discord\nAnything that''s in the game right now","updates_title":"Limited drops.\n*Clock''s running.*","footer_tagline":"Hunts, dust and raids for Pokémon GO trainers who''d rather not grind."}'::jsonb,
  availability_note = 'Shiny and shundo hunts depend on availability — what''s spawning, in raids or featured in events that week. If a target isn''t around, we swap it or carry it over.',
  fx_rates = '{"USD":1,"EUR":0.92,"GBP":0.79,"JPY":150,"CZK":23,"CAD":1.37,"AUD":1.52,"CHF":0.88,"PLN":4,"SEK":10.6}'::jsonb
where id = 1;

insert into public.service_categories (slug, label, sort_order) values
  ('shundo', 'Shundo hunting', 1),
  ('shiny', 'Shiny hunting', 2),
  ('stardust', 'Stardust orders', 3),
  ('xp', 'XP / levelling', 4),
  ('raids', 'Raid packages', 5),
  ('events', 'Event packages', 6)
on conflict (slug) do nothing;

insert into public.subscription_tiers (id, name, tagline, period, price, currency, features, compare, recommended, sort_order, active, whop_plan_id, patreon_enabled, patreon_tier_id, patreon_join_url) values
  ('tier_w_scout', 'Scout', 'Dip in. Keep your collection moving.', 'weekly', 9, 'USD', '["10 raids","1 shiny hunt","Progress updates on Discord"]'::jsonb, '{"Raids":"10","Shiny hunts":"1","Hundo hunts":"—","Queue":"Standard","Custom request discount":"—","Discord progress updates":"Yes"}'::jsonb, false, 1, true, null, false, null, null),
  ('tier_w_hunter', 'Hunter', 'The sweet spot for active trainers.', 'weekly', 19, 'USD', '["25 raids","3 shiny hunts","Priority queue","10% off custom requests"]'::jsonb, '{"Raids":"25","Shiny hunts":"3","Hundo hunts":"—","Queue":"Priority","Custom request discount":"10%","Discord progress updates":"Yes"}'::jsonb, true, 2, true, null, false, null, null),
  ('tier_w_apex', 'Apex', 'Everything, first, every week.', 'weekly', 35, 'USD', '["50 raids","6 shiny hunts","1 hundo hunt","Top of the queue","20% off custom requests"]'::jsonb, '{"Raids":"50","Shiny hunts":"6","Hundo hunts":"1","Queue":"Top","Custom request discount":"20%","Discord progress updates":"Yes"}'::jsonb, false, 3, true, null, false, null, null),
  ('tier_m_scout', 'Scout', 'Dip in. Keep your collection moving.', 'monthly', 29, 'USD', '["45 raids","4 shiny hunts","Progress updates on Discord"]'::jsonb, '{"Raids":"45","Shiny hunts":"4","Hundo hunts":"—","Queue":"Standard","Custom request discount":"—","Discord progress updates":"Yes"}'::jsonb, false, 1, true, null, true, null, 'https://www.patreon.com/'),
  ('tier_m_hunter', 'Hunter', 'The sweet spot for active trainers.', 'monthly', 59, 'USD', '["110 raids","14 shiny hunts","Priority queue","10% off custom requests"]'::jsonb, '{"Raids":"110","Shiny hunts":"14","Hundo hunts":"—","Queue":"Priority","Custom request discount":"10%","Discord progress updates":"Yes"}'::jsonb, true, 2, true, null, true, null, 'https://www.patreon.com/'),
  ('tier_m_apex', 'Apex', 'Everything, first, every month.', 'monthly', 99, 'USD', '["220 raids","28 shiny hunts","4 hundo hunts","Top of the queue","20% off custom requests"]'::jsonb, '{"Raids":"220","Shiny hunts":"28","Hundo hunts":"4","Queue":"Top","Custom request discount":"20%","Discord progress updates":"Yes"}'::jsonb, false, 3, true, null, true, null, 'https://www.patreon.com/')
on conflict (id) do nothing;

insert into public.services (currency, image_url, active, whop_plan_id, featured, popular, id, name, category, description, price, price_is_from, delivery_time, sort_order) values
  ('USD', null, true, null, true, true, 'svc_shundo', 'Shundo Hunt', 'shundo', 'A shiny with perfect stats for the target you choose. Priced by rarity, quoted before we start.', 25, true, '3–7 days', 1),
  ('USD', null, true, null, false, false, 'svc_shundo_event', 'Event Shundo Run', 'shundo', 'We work a featured event for the one that matters: shiny, perfect, yours.', 35, true, 'event day', 2),
  ('USD', null, true, null, false, true, 'svc_shiny', 'Shiny Hunt', 'shiny', 'Pick a target, we track it down in shiny.', 10, true, '1–5 days', 3),
  ('USD', null, true, null, false, false, 'svc_shiny5', 'Shiny Bundle ×5', 'shiny', 'Five shiny targets of your choice from what''s spawning now.', 39, false, '5–10 days', 4),
  ('USD', null, true, null, false, true, 'svc_dust1', 'Stardust 1M', 'stardust', 'One million stardust, earned the long way so you don''t have to.', 15, false, '3 days', 5),
  ('USD', null, true, null, false, false, 'svc_dust5', 'Stardust 5M', 'stardust', 'Five million for maxing out your favourites.', 59, false, '10 days', 6),
  ('USD', null, true, null, false, false, 'svc_level', 'Level Push', 'xp', 'XP to your next level, or a range of levels. Quoted by gap.', 20, true, '2–7 days', 7),
  ('USD', null, true, null, false, false, 'svc_level_tasks', 'Level-up Tasks', 'xp', 'We clear the task list your next level asks for — catches, raids, the lot.', 30, true, '3–10 days', 8),
  ('USD', null, true, null, false, false, 'svc_raid20', 'Raid Pack ×20', 'raids', 'Twenty raids of your choice from what''s live.', 12, false, '2 days', 9),
  ('USD', null, true, null, false, false, 'svc_legend10', 'Legendary Pack ×10', 'raids', 'Ten top-tier raids while the boss is in rotation.', 18, false, '2 days', 10),
  ('USD', null, true, null, false, false, 'svc_eventday', 'Event Day Package', 'events', 'Full coverage of a featured event day: shiny hunts, bonus catches and event research.', 22, false, 'event day', 11),
  ('USD', null, true, null, false, false, 'svc_eventweek', 'Event Week Package', 'events', 'Every day of a week-long event worked for its bonuses. One price, all of it.', 49, false, 'event week', 12)
on conflict (id) do nothing;

insert into public.offers (id, title, body, image_url, price, currency, starts_at, ends_at, pinned, published, whop_plan_id) values
  ('off_weekend', 'Event weekend shiny bundle', 'Three shiny hunts on this weekend''s featured targets, plus a raid pack. Ends when the event does.', null, 24, 'USD', '2026-11-04T02:23:19.920Z', '2026-11-07T04:37:07.920Z', true, true, null),
  ('off_raidhour', 'Raid hour package', 'Ten raids during this week''s raid hour. Limited slots.', null, 9, 'USD', '2026-11-04T16:23:19.920Z', '2026-11-05T17:03:31.920Z', false, true, null),
  ('off_dust', 'Double dust week: 3M', 'Three million stardust while the bonus is live — 25% cheaper than usual.', null, 45, 'USD', '2026-11-02T20:23:19.920Z', '2026-11-10T01:23:19.920Z', false, true, null),
  ('off_spotlight', 'Spotlight hour hunts', 'Shiny hunts during spotlight hour, two targets.', null, 8, 'USD', '2026-10-28T20:23:19.920Z', '2026-11-04T20:23:19.920Z', false, true, null),
  ('off_scheduled', 'Season opener pack', 'Goes live with the new season.', null, 30, 'USD', '2026-11-08T22:23:19.920Z', '2026-11-15T18:23:19.920Z', false, true, null)
on conflict (id) do nothing;

insert into public.faqs (id, sort_order, question, answer) values
  ('faq1', 1, 'How long does an order take?', 'Every service shows a delivery window. Hunts depend on spawns and events, so rarer targets take longer — we''ll tell you up front.'),
  ('faq2', 2, 'How do I follow progress?', 'Updates come to you on Discord, and your order status is always visible in your account.'),
  ('faq3', 3, 'How do I pay?', 'Card, Apple Pay, Google Pay, PayPal or crypto through secure checkout on this site. Prices show in USD; switch the display currency any time.'),
  ('faq4', 4, 'Can I cancel a subscription?', 'Yes, any time from your account. You keep your benefits until the end of the period you''ve paid for.'),
  ('faq5', 5, 'What if my target never shows?', 'If a target can''t be found inside its window, you choose: swap it, extend the window, or get a refund.')
on conflict (id) do nothing;

