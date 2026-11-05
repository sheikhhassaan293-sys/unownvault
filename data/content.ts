/**
 * PHASE 1 MOCK DATA — the single source of content for the demo.
 *
 * Every export here is shaped exactly like a Phase 2 Supabase table (see lib/types.ts),
 * so going live means replacing the functions in lib/data.ts with Supabase queries —
 * nothing in the pages or components changes. This file then becomes the seed script.
 *
 * Edit freely: prices, names, features, copy. Prices are stored in USD; the currency
 * switcher converts for display using site_settings.fx_rates.
 */
import type {
  CustomRequest,
  Faq,
  Offer,
  Order,
  Profile,
  Service,
  ServiceCategory,
  SiteSettings,
  SubscriptionTier,
  UserSubscription,
} from "@/lib/types";
import { DEFAULT_COPY } from "@/lib/copy";

/**
 * All mock dates are written relative to this moment. In demo mode the Updates page
 * shifts them so countdowns are always live, whatever day you open the demo.
 */
export const MOCK_NOW = "2026-11-04T12:00:00.000Z";
const at = (hours: number) =>
  new Date(Date.parse(MOCK_NOW) + hours * 3_600_000).toISOString();

// ───────────────────────────────────────────── site_settings (single row)
export const site_settings: SiteSettings = {
  discord_url: "https://discord.gg/your-invite",
  contact_email: "hello@unownvault.com",
  hero_eyebrow: "Services for Pokémon GO",
  hero_headline: "Shundos,",
  hero_headline_accent: "on order.",
  hero_tagline:
    "Shiny, hundo and shundo hunts, stardust runs and raid packs — handled by real players while you get on with your week.",
  queue_open: true,
  status_payments: "Card · PayPal · Crypto",
  status_plans: "Weekly / Monthly",
  status_updates: "Discord DMs",
  payment_instructions:
    "JazzCash / Easypaisa: 0300-0000000 (UnownVault)\nBank transfer: IBAN PK00 XXXX 0000 0000 0000 0000\nUse your trainer name as the reference.",
  maintenance: false,
  manual_payments_enabled: false,
  copy: DEFAULT_COPY,
  availability_note: "Shiny and shundo hunts depend on availability — what's spawning, in raids or featured in events that week. If a target isn't around, we swap it or carry it over.",
  // approximate — update now and then; visitors only see estimates, charges stay in USD
  fx_rates: { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, CZK: 23, CAD: 1.37, AUD: 1.52, CHF: 0.88, PLN: 4, SEK: 10.6 },
};

// ───────────────────────────────────────────── subscription_tiers

export const subscription_tiers: SubscriptionTier[] = [
  {
    id: "tier_w_scout",
    name: "Scout",
    tagline: "Dip in. Keep your collection moving.",
    period: "weekly",
    price: 5.99,
    currency: "USD",
    features: ["10 raids of your choice", "2 shinies not yet in your Pokédex", "1 shundo", "2 hundos", "250k stardust"],
    compare: { Raids: "10", "Shiny hunts": "2 (new to your Pokédex)", Shundos: "1", "Hundo hunts": "2", Stardust: "250k", Queue: "Standard", "Discord progress updates": "Yes" },
    recommended: false,
    sort_order: 1,
    active: true,
    whop_plan_id: null,
  },
  {
    id: "tier_w_hunter",
    name: "Hunter",
    tagline: "The sweet spot for active trainers.",
    period: "weekly",
    price: 10.99,
    currency: "USD",
    features: ["25 raids of your choice", "5 shinies not yet in your Pokédex", "2 shundos", "5 hundos", "500k stardust", "Priority queue"],
    compare: { Raids: "25", "Shiny hunts": "5 (new to your Pokédex)", Shundos: "2", "Hundo hunts": "5", Stardust: "500k", Queue: "Priority", "Discord progress updates": "Yes" },
    recommended: true,
    sort_order: 2,
    active: true,
    whop_plan_id: null,
  },
  {
    id: "tier_w_apex",
    name: "Apex",
    tagline: "Everything, first, every week.",
    period: "weekly",
    price: 27.99,
    currency: "USD",
    features: ["50 raids of your choice", "10 shinies not yet in your Pokédex", "5 shundos", "10 hundos", "2M stardust", "Top of the queue"],
    compare: { Raids: "50", "Shiny hunts": "10 (new to your Pokédex)", Shundos: "5", "Hundo hunts": "10", Stardust: "2M", Queue: "Top", "Discord progress updates": "Yes" },
    recommended: false,
    sort_order: 3,
    active: true,
    whop_plan_id: null,
  },
  {
    id: "tier_m_scout",
    name: "Scout",
    tagline: "Dip in. Keep your collection moving.",
    period: "monthly",
    price: 18.99,
    currency: "USD",
    features: ["40 raids of your choice", "8 shinies not yet in your Pokédex", "3 shundos", "7 hundos", "1M stardust"],
    compare: { Raids: "40", "Shiny hunts": "8 (new to your Pokédex)", Shundos: "3", "Hundo hunts": "7", Stardust: "1M", Queue: "Standard", "Discord progress updates": "Yes" },
    recommended: false,
    sort_order: 1,
    active: true,
    whop_plan_id: null,
  },
  {
    id: "tier_m_hunter",
    name: "Hunter",
    tagline: "The sweet spot for active trainers.",
    period: "monthly",
    price: 25.99,
    currency: "USD",
    features: ["100 raids of your choice", "16 shinies not yet in your Pokédex", "6 shundos", "16 hundos", "2.5M stardust", "Priority queue"],
    compare: { Raids: "100", "Shiny hunts": "16 (new to your Pokédex)", Shundos: "6", "Hundo hunts": "16", Stardust: "2.5M", Queue: "Priority", "Discord progress updates": "Yes" },
    recommended: true,
    sort_order: 2,
    active: true,
    whop_plan_id: null,
  },
  {
    id: "tier_m_apex",
    name: "Apex",
    tagline: "Everything, first, every month.",
    period: "monthly",
    price: 69.99,
    currency: "USD",
    features: ["220 raids of your choice", "35 shinies, prioritising ones not in your Pokédex", "25 shundos", "25 hundos", "8M stardust", "Top of the queue"],
    compare: { Raids: "220", "Shiny hunts": "35 (new to your Pokédex first)", Shundos: "25", "Hundo hunts": "25", Stardust: "8M", Queue: "Top", "Discord progress updates": "Yes" },
    recommended: false,
    sort_order: 3,
    active: true,
    whop_plan_id: null,
  },
];

// ───────────────────────────────────────────── services
export const service_categories: { slug: ServiceCategory; label: string }[] = [
  { slug: "shundo", label: "Shundo hunting" },
  { slug: "shiny", label: "Shiny hunting" },
  { slug: "stardust", label: "Stardust orders" },
  { slug: "xp", label: "XP / levelling" },
  { slug: "raids", label: "Raid packages" },
  { slug: "events", label: "Event packages" },
  { slug: "items", label: "Items" },
];

const svc = (
  s: Omit<Service, "currency" | "image_url" | "active" | "whop_plan_id" | "featured" | "popular"> &
    Partial<Pick<Service, "featured" | "popular">>,
): Service => ({
  currency: "USD",
  image_url: null,
  active: true,
  whop_plan_id: null,
  featured: false,
  popular: false,
  ...s,
});

export const services: Service[] = [
  svc({ id: "svc_shundo", name: "Shundo Hunt", category: "shundo", description: "A shiny with perfect stats for the target you choose. Priced by rarity, quoted before we start.", price: 25, price_is_from: true, delivery_time: "3–7 days", sort_order: 1, featured: true, popular: true }),
  svc({ id: "svc_shundo_event", name: "Event Shundo Run", category: "shundo", description: "We work a featured event for the one that matters: shiny, perfect, yours.", price: 35, price_is_from: true, delivery_time: "event day", sort_order: 2 }),
  svc({ id: "svc_shiny", name: "Shiny Hunt", category: "shiny", description: "Pick a target, we track it down in shiny.", price: 10, price_is_from: true, delivery_time: "1–5 days", sort_order: 3, popular: true }),
  svc({ id: "svc_shiny5", name: "Shiny Bundle ×5", category: "shiny", description: "Five shiny targets of your choice from what's spawning now.", price: 39, price_is_from: false, delivery_time: "5–10 days", sort_order: 4 }),
  svc({ id: "svc_dust1", name: "Stardust 1M", category: "stardust", description: "One million stardust, earned the long way so you don't have to.", price: 15, price_is_from: false, delivery_time: "3 days", sort_order: 5, popular: true }),
  svc({ id: "svc_dust5", name: "Stardust 5M", category: "stardust", description: "Five million for maxing out your favourites.", price: 59, price_is_from: false, delivery_time: "10 days", sort_order: 6 }),
  svc({ id: "svc_level", name: "Level Push", category: "xp", description: "XP to your next level, or a range of levels. Quoted by gap.", price: 20, price_is_from: true, delivery_time: "2–7 days", sort_order: 7 }),
  svc({ id: "svc_level_tasks", name: "Level-up Tasks", category: "xp", description: "We clear the task list your next level asks for — catches, raids, the lot.", price: 30, price_is_from: true, delivery_time: "3–10 days", sort_order: 8 }),
  svc({ id: "svc_raid20", name: "Raid Pack ×20", category: "raids", description: "Twenty raids of your choice from what's live.", price: 12, price_is_from: false, delivery_time: "2 days", sort_order: 9 }),
  svc({ id: "svc_legend10", name: "Legendary Pack ×10", category: "raids", description: "Ten top-tier raids while the boss is in rotation.", price: 18, price_is_from: false, delivery_time: "2 days", sort_order: 10 }),
  svc({ id: "svc_eventday", name: "Event Day Package", category: "events", description: "Full coverage of a featured event day: shiny hunts, bonus catches and event research.", price: 22, price_is_from: false, delivery_time: "event day", sort_order: 11 }),
  svc({ id: "svc_eventweek", name: "Event Week Package", category: "events", description: "Every day of a week-long event worked for its bonuses. One price, all of it.", price: 49, price_is_from: false, delivery_time: "event week", sort_order: 12 }),
  svc({ id: "svc_rarecandy25", name: "Rare Candy ×25", category: "items", description: "Twenty-five Rare Candies, farmed and banked on your account.", price: 8, price_is_from: false, delivery_time: "1–2 days", sort_order: 13 }),
  svc({ id: "svc_rarecandy100", name: "Rare Candy ×100", category: "items", description: "A hundred Rare Candies for powering up whatever you're short on.", price: 25, price_is_from: false, delivery_time: "3–5 days", sort_order: 14 }),
  svc({ id: "svc_rarecandyxl", name: "Rare Candy XL ×20", category: "items", description: "Twenty Rare Candy XL to push your favourites past level 40.", price: 18, price_is_from: false, delivery_time: "2–4 days", sort_order: 15 }),
];

// ───────────────────────────────────────────── offers
export const offers: Offer[] = [
  {
    id: "off_weekend",
    title: "Event weekend shiny bundle",
    body: "Three shiny hunts on this weekend's featured targets, plus a raid pack. Ends when the event does.",
    image_url: null,
    price: 24,
    currency: "USD",
    starts_at: at(-20),
    ends_at: at(54.23),
    pinned: true,
    published: true,
    whop_plan_id: null,
  },
  {
    id: "off_raidhour",
    title: "Raid hour package",
    body: "Ten raids during this week's raid hour. Limited slots.",
    image_url: "/mock/offer-raid-hour.svg",
    price: 9,
    currency: "USD",
    starts_at: at(-6),
    ends_at: at(18.67),
    pinned: false,
    published: true,
    whop_plan_id: null,
  },
  {
    id: "off_dust",
    title: "Double dust week: 3M",
    body: "Three million stardust while the bonus is live — 25% cheaper than usual.",
    image_url: null,
    price: 45,
    currency: "USD",
    starts_at: at(-50),
    ends_at: at(123),
    pinned: false,
    published: true,
    whop_plan_id: null,
  },
  {
    // expired → auto-hidden
    id: "off_spotlight",
    title: "Spotlight hour hunts",
    body: "Shiny hunts during spotlight hour, two targets.",
    image_url: null,
    price: 8,
    currency: "USD",
    starts_at: at(-170),
    ends_at: at(-2),
    pinned: false,
    published: true,
    whop_plan_id: null,
  },
  {
    // scheduled → hidden until starts_at
    id: "off_scheduled",
    title: "Season opener pack",
    body: "Goes live with the new season.",
    image_url: null,
    price: 30,
    currency: "USD",
    starts_at: at(96),
    ends_at: at(260),
    pinned: false,
    published: true,
    whop_plan_id: null,
  },
];

// ───────────────────────────────────────────── FAQ (homepage)
export const faqs: Faq[] = [
  { id: "faq1", sort_order: 1, question: "How long does an order take?", answer: "Every service shows a delivery window. Hunts depend on spawns and events, so rarer targets take longer — we'll tell you up front." },
  { id: "faq2", sort_order: 2, question: "How do I follow progress?", answer: "Updates come to you on Discord, and your order status is always visible in your account." },
  { id: "faq3", sort_order: 3, question: "How do I pay?", answer: "Card, Apple Pay, Google Pay, PayPal or crypto through secure checkout on this site. Prices show in USD; switch the display currency any time." },
  { id: "faq4", sort_order: 4, question: "Can I cancel a subscription?", answer: "Yes, any time from your account. You keep your benefits until the end of the period you've paid for." },
  { id: "faq5", sort_order: 5, question: "What if my target never shows?", answer: "If a target can't be found inside its window, you choose: swap it, extend the window, or get a refund." },
];

// ───────────────────────────────────────────── demo account (used only by mock auth screens)
export const demo_profile: Profile = {
  id: "user_demo",
  username: "NightHunter_7",
  discord_tag: "nighthunter7",
  role: "user",
  created_at: at(-24 * 40),
};

export const demo_subscriptions: UserSubscription[] = [
  { id: "sub_1", user_id: "user_demo", tier_id: "tier_m_hunter", source: "whop", external_id: "mem_demo", starts_at: at(-24 * 12), ends_at: at(24 * 18), status: "active", renews: true },
];

export const demo_orders: Order[] = [
  { id: "UV-7K2QD", user_id: "user_demo", type: "service", item_id: "svc_shundo", item_name: "Shundo Hunt", amount: 25, currency: "USD", status: "in_progress", provider: "whop", payment_method: "card", transaction_ref: null, external_payment_id: "pay_demo1", proof_url: null, created_at: at(-30) },
  { id: "UV-3MX8A", user_id: "user_demo", type: "subscription", item_id: "tier_m_hunter", item_name: "Hunter — monthly", amount: 59, currency: "USD", status: "completed", provider: "whop", payment_method: "apple_pay", transaction_ref: null, external_payment_id: "pay_demo2", proof_url: null, created_at: at(-24 * 12) },
  { id: "UV-9PL0C", user_id: "user_demo", type: "service", item_id: "svc_dust1", item_name: "Stardust 1M", amount: 15, currency: "USD", status: "completed", provider: "whop", payment_method: "paypal", transaction_ref: null, external_payment_id: "pay_demo3", proof_url: null, created_at: at(-24 * 20) },
];

export const demo_custom_requests: CustomRequest[] = [
  { id: "UV-R4T7N", user_id: "user_demo", request_type: "Shiny hunt", target: "2 regional targets", details: "Two regionals from the current travel event.", budget: 40, deadline: at(24 * 6), discord_username: "nighthunter7", image_url: null, status: "quoted", quote_amount: 34, admin_reply: "Doable inside 4 days. $34 for both.", created_at: at(-26) },
  { id: "UV-Q1B2S", user_id: "user_demo", request_type: "Stardust", target: "2M dust", details: "Before the weekend if possible.", budget: 30, deadline: null, discord_username: "nighthunter7", image_url: null, status: "completed", quote_amount: 28, admin_reply: "Done — enjoy.", created_at: at(-24 * 15) },
];

/** Usernames the mock availability check treats as taken. */
export const taken_usernames = ["admin", "trainer", "unownvault", "support", "mod", "nighthunter_7", "ashketchum"];
