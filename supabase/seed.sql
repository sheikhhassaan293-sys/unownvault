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
  ('events', 'Event packages', 6),
  ('rocket', 'Team GO Rocket', 7),
  ('items', 'Items', 8)
on conflict (slug) do nothing;

insert into public.subscription_tiers (id, name, tagline, period, price, currency, features, compare, recommended, sort_order, active, whop_plan_id) values
  ('tier_w_scout', 'Scout', 'Dip in. Keep your collection moving.', 'weekly', 5.99, 'USD', '["10 raids of your choice","2 shinies not yet in your Pokédex","1 shundo","2 hundos","250k stardust"]'::jsonb, '{"Raids":"10","Shiny hunts":"2 (new to your Pokédex)","Shundos":"1","Hundo hunts":"2","Stardust":"250k","Queue":"Standard","Discord progress updates":"Yes"}'::jsonb, false, 1, true, null),
  ('tier_w_hunter', 'Hunter', 'The sweet spot for active trainers.', 'weekly', 10.99, 'USD', '["25 raids of your choice","5 shinies not yet in your Pokédex","2 shundos","5 hundos","500k stardust","Priority queue"]'::jsonb, '{"Raids":"25","Shiny hunts":"5 (new to your Pokédex)","Shundos":"2","Hundo hunts":"5","Stardust":"500k","Queue":"Priority","Discord progress updates":"Yes"}'::jsonb, true, 2, true, null),
  ('tier_w_apex', 'Apex', 'Everything, first, every week.', 'weekly', 27.99, 'USD', '["50 raids of your choice","10 shinies not yet in your Pokédex","5 shundos","10 hundos","2M stardust","Top of the queue"]'::jsonb, '{"Raids":"50","Shiny hunts":"10 (new to your Pokédex)","Shundos":"5","Hundo hunts":"10","Stardust":"2M","Queue":"Top","Discord progress updates":"Yes"}'::jsonb, false, 3, true, null),
  ('tier_m_scout', 'Scout', 'Dip in. Keep your collection moving.', 'monthly', 18.99, 'USD', '["40 raids of your choice","8 shinies not yet in your Pokédex","3 shundos","7 hundos","1M stardust"]'::jsonb, '{"Raids":"40","Shiny hunts":"8 (new to your Pokédex)","Shundos":"3","Hundo hunts":"7","Stardust":"1M","Queue":"Standard","Discord progress updates":"Yes"}'::jsonb, false, 1, true, null),
  ('tier_m_hunter', 'Hunter', 'The sweet spot for active trainers.', 'monthly', 25.99, 'USD', '["100 raids of your choice","16 shinies not yet in your Pokédex","6 shundos","16 hundos","2.5M stardust","Priority queue"]'::jsonb, '{"Raids":"100","Shiny hunts":"16 (new to your Pokédex)","Shundos":"6","Hundo hunts":"16","Stardust":"2.5M","Queue":"Priority","Discord progress updates":"Yes"}'::jsonb, true, 2, true, null),
  ('tier_m_apex', 'Apex', 'Everything, first, every month.', 'monthly', 69.99, 'USD', '["220 raids of your choice","35 shinies, prioritising ones not in your Pokédex","25 shundos","25 hundos","8M stardust","Top of the queue"]'::jsonb, '{"Raids":"220","Shiny hunts":"35 (new to your Pokédex first)","Shundos":"25","Hundo hunts":"25","Stardust":"8M","Queue":"Top","Discord progress updates":"Yes"}'::jsonb, false, 3, true, null)
on conflict (id) do nothing;

insert into public.services (currency, image_url, active, whop_plan_id, featured, popular, allow_quantity, max_quantity, quote_only, id, name, category, description, price, price_is_from, delivery_time, sort_order) values
  ('USD', null, true, null, true, true, true, 20, false, 'svc_shundo', 'Shundo Hunt', 'shundo', 'A shiny with perfect stats for the target you choose. Time is subject to your cooldown timer.', 3, false, '1–2 hours', 1),
  ('USD', null, true, null, false, false, true, 20, false, 'svc_shundo_event', 'Event Shundo Run', 'shundo', 'We work a featured event for the one that matters: shiny, perfect, yours.', 3.5, false, 'event day', 2),
  ('USD', null, true, null, false, true, true, 20, false, 'svc_shiny', 'Shiny ×3', 'shiny', 'Three shiny targets of your choice from what''s out in the game.', 3, false, '1–5 days', 3),
  ('USD', null, true, null, false, false, true, 20, false, 'svc_shiny5', 'Shiny ×5', 'shiny', 'Five shiny targets of your choice from what''s out in the game.', 4.5, false, '5–10 days', 4),
  ('USD', null, true, null, false, false, true, 20, false, 'svc_shiny10', 'Shiny ×10', 'shiny', 'Ten shiny targets of your choice from what''s out in the game.', 9, false, '5–10 days', 5),
  ('USD', null, true, null, false, true, false, 20, false, 'svc_dust1', 'Stardust 1M', 'stardust', 'One million stardust, earned the long way so you don''t have to.', 1.75, false, '3 days', 6),
  ('USD', null, true, null, false, false, false, 20, false, 'svc_dust5', 'Stardust 5M', 'stardust', 'Five million for maxing out your favourites.', 8.5, false, '10 days', 7),
  ('USD', null, true, null, false, false, false, 20, true, 'svc_level', 'Level Push', 'xp', 'XP to the level you want. Tell us your current level, the level you want and how much XP — we''ll send you a quote.', 20, true, '2–7 days', 8),
  ('USD', null, true, null, false, false, false, 20, true, 'svc_level_tasks', 'Level-up Tasks', 'xp', 'We clear the task list your next level asks for. Tell us your current and target level — we''ll send you a quote.', 30, true, '3–10 days', 9),
  ('USD', null, true, null, false, false, true, 20, false, 'svc_raid10', 'Raid Pack ×10', 'raids', 'Ten raids — any star level, whatever''s live.', 1, false, '2 days', 10),
  ('USD', null, true, null, false, false, true, 20, false, 'svc_raid20', 'Raid Pack ×20', 'raids', 'Twenty raids — any star level, whatever''s live.', 3, false, '2 days', 11),
  ('USD', null, true, null, false, false, false, 20, false, 'svc_legend10', 'Legendary Pack ×10', 'raids', 'Ten top-tier raids while the boss is in rotation.', 18, false, '2 days', 12),
  ('USD', null, false, null, false, false, false, 20, false, 'svc_eventday', 'Event Day Package', 'events', 'Full coverage of a featured event day: shiny hunts, bonus catches and event research.', 22, false, 'event day', 13),
  ('USD', null, false, null, false, false, false, 20, false, 'svc_eventweek', 'Event Week Package', 'events', 'Every day of a week-long event worked for its bonuses. One price, all of it.', 49, false, 'event week', 14),
  ('USD', null, true, null, false, false, false, 20, true, 'svc_grunt', 'Grunt Boosting', 'rocket', 'We battle Team GO Rocket grunts for you — for Shadow Pokémon, research tasks or medals. Tell us what you need and we''ll quote it.', 0, false, 'quoted', 15),
  ('USD', null, true, null, false, false, false, 20, false, 'svc_rarecandy10', 'Rare Candy ×10', 'items', 'Ten Rare Candies added to your account.', 1, false, '1–2 days', 20),
  ('USD', null, true, null, false, false, false, 20, false, 'svc_rarecandy25', 'Rare Candy ×25', 'items', 'Twenty-five Rare Candies added to your account.', 2.3, false, '1–2 days', 21),
  ('USD', null, true, null, false, false, false, 20, false, 'svc_rarecandy50', 'Rare Candy ×50', 'items', 'Fifty Rare Candies added to your account.', 4.5, false, '2–4 days', 22),
  ('USD', null, true, null, false, false, false, 20, false, 'svc_rarecandy100', 'Rare Candy ×100', 'items', 'A hundred Rare Candies added to your account.', 9, false, '3–5 days', 23)
on conflict (id) do nothing;

insert into public.offers (id, title, body, image_url, price, currency, starts_at, ends_at, pinned, published, whop_plan_id) values
  ('off_weekend', 'Event weekend shiny bundle', 'Three shiny hunts on this weekend''s featured targets, plus a raid pack. Ends when the event does.', null, 24, 'USD', '2026-11-04T19:12:12.087Z', '2026-11-07T21:26:00.087Z', true, true, null),
  ('off_raidhour', 'Raid hour package', 'Ten raids during this week''s raid hour. Limited slots.', null, 9, 'USD', '2026-11-05T09:12:12.087Z', '2026-11-06T09:52:24.087Z', false, true, null),
  ('off_dust', 'Double dust week: 3M', 'Three million stardust while the bonus is live — 25% cheaper than usual.', null, 45, 'USD', '2026-11-03T13:12:12.087Z', '2026-11-10T18:12:12.087Z', false, true, null),
  ('off_spotlight', 'Spotlight hour hunts', 'Shiny hunts during spotlight hour, two targets.', null, 8, 'USD', '2026-10-29T13:12:12.087Z', '2026-11-05T13:12:12.087Z', false, true, null),
  ('off_scheduled', 'Season opener pack', 'Goes live with the new season.', null, 30, 'USD', '2026-11-09T15:12:12.087Z', '2026-11-16T11:12:12.087Z', false, true, null)
on conflict (id) do nothing;

insert into public.faqs (id, sort_order, question, answer) values
  ('faq1', 1, 'How long does an order take?', 'Every service shows a delivery window. Hunts depend on spawns and events, so rarer targets take longer — we''ll tell you up front.'),
  ('faq2', 2, 'How do I follow progress?', 'Updates come to you on Discord, and your order status is always visible in your account.'),
  ('faq3', 3, 'How do I pay?', 'Card, Apple Pay, Google Pay, PayPal or crypto through secure checkout on this site. Prices show in USD; switch the display currency any time.'),
  ('faq4', 4, 'Can I cancel a subscription?', 'Yes, any time from your account. You keep your benefits until the end of the period you''ve paid for.'),
  ('faq5', 5, 'What if my target never shows?', 'If a target can''t be found inside its window, you choose: swap it, extend the window, or get a refund.')
on conflict (id) do nothing;

