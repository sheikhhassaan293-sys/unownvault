/**
 * Row types — these mirror the Phase 2 Supabase tables 1:1 (snake_case on purpose).
 * When Supabase is wired in, `supabase gen types` output should be assignable to these.
 */

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "CZK" | "CAD" | "AUD" | "CHF" | "PLN" | "SEK";
export type Period = "weekly" | "monthly";
export type Role = "user" | "admin";

export type Profile = {
  id: string;
  username: string;
  discord_tag: string | null;
  role: Role;
  created_at: string;
};

export type SubscriptionTier = {
  id: string;
  name: string;
  /** Short one-line pitch under the tier name. (extra column, not in original spec list) */
  tagline: string;
  period: Period;
  price: number;
  currency: Currency;
  features: string[]; // jsonb
  /** Values for the comparison table, keyed by row label. (extra jsonb column) */
  compare: Record<string, string>; // jsonb
  recommended: boolean;
  sort_order: number;
  active: boolean;
  whop_plan_id: string | null;
};

export type ServiceCategory = string; // slugs live in service_categories (editable in admin)
export type _DefaultCategories =
  | "shundo"
  | "shiny"
  | "stardust"
  | "xp"
  | "raids"
  | "events";

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  price: number;
  currency: Currency;
  price_is_from: boolean;
  delivery_time: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  /** Big card on the services grid. (extra column) */
  featured: boolean;
  /** Shown in "Most ordered" on Home when true, in sort_order. (extra column) */
  popular: boolean;
  whop_plan_id: string | null;
  /** buyer can pick how many (−/+) at checkout */
  allow_quantity?: boolean;
  max_quantity?: number;
  /** no fixed price — "Get a quote" sends them to the custom request form */
  quote_only?: boolean;
};

/** The buyer's answer to "Do you have a cooldown timer?" (minutes_left: up to 120). */
export type Cooldown = { has: boolean; minutes_left: number | null };
export const COOLDOWN_OPTIONS = [
  { label: "Full 2 hours", minutes: 120 },
  { label: "About 1½ hours", minutes: 90 },
  { label: "About 1 hour", minutes: 60 },
  { label: "About 30 minutes", minutes: 30 },
  { label: "Less than 15 minutes", minutes: 15 },
] as const;
export function cooldownText(c: Cooldown | null | undefined) {
  if (!c) return "—";
  if (!c.has) return "No cooldown";
  const o = COOLDOWN_OPTIONS.find((x) => x.minutes === c.minutes_left);
  return `Cooldown: ${o ? o.label.toLowerCase() : `${c.minutes_left ?? "?"} min`} left`;
}

export type Offer = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  price: number;
  currency: Currency;
  starts_at: string; // ISO
  ends_at: string; // ISO
  pinned: boolean;
  published: boolean;
  whop_plan_id: string | null;
};

export type OrderStatus =
  | "awaiting_payment"
  | "awaiting_confirmation"
  | "pending"
  | "in_progress"
  | "completed"
  | "refunded"
  | "disputed";

export type Order = {
  id: string;
  user_id: string;
  type: "subscription" | "service" | "offer" | "custom";
  item_id: string;
  /** Denormalised for display. (extra column) */
  item_name: string;
  amount: number;
  currency: Currency;
  status: OrderStatus;
  provider: "whop" | "manual";
  payment_method: string | null;
  transaction_ref: string | null;
  external_payment_id: string | null;
  proof_url: string | null;
  created_at: string;
  /** copy of the buyer's priority Pokémon when they ordered */
  priorities?: Priorities | null;
  quantity?: number;
  cooldown?: Cooldown | null;
  /** when it was announced in Discord (#recent-orders) */
  discord_posted_at?: string | null;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  tier_id: string;
  source: "whop" | "manual";
  external_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "active" | "cancelled" | "expired" | "past_due";
  /** true when the provider will auto-renew (Whop). */
  renews: boolean;
  /** Whop's page where the buyer manages / cancels. */
  manage_url?: string | null;
};

export type CustomRequestStatus =
  | "new"
  | "quoted"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined";

export type CustomRequest = {
  id: string;
  user_id: string | null;
  request_type: string;
  target: string;
  details: string;
  budget: number | null;
  /** no longer asked for (old requests may have one) */
  deadline: string | null;
  discord_username: string | null;
  /** how long it'll take — set by the owner with the quote */
  eta?: string | null;
  image_url: string | null;
  status: CustomRequestStatus;
  quote_amount: number | null;
  admin_reply: string | null;
  created_at: string;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type SiteSettings = {
  discord_url: string;
  contact_email: string;
  hero_eyebrow: string;
  hero_headline: string;
  hero_headline_accent: string;
  hero_tagline: string;
  queue_open: boolean;
  status_payments: string;
  status_plans: string;
  status_updates: string;
  payment_instructions: string;
  maintenance: boolean;
  manual_payments_enabled: boolean;
  /** Page headings and text blocks, see lib/copy.ts. */
  copy: Record<string, string>;
  /** Footnote under the subscription tiers (shiny / shundo availability). */
  availability_note: string;
  /** Display-only FX rates from USD. Charges always happen in the item's currency. */
  fx_rates: Record<Currency, number>;
};

/** Postgres "numeric" can arrive as text ("8.00") — always turn money fields back into numbers. */
export const num = (v: unknown): number => (typeof v === "number" ? v : v == null || v === "" ? 0 : Number(v));
export const numOrNull = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));
export function normalizeRows<T extends Record<string, unknown>>(rows: T[] | null | undefined, fields: string[], nullable: string[] = []): T[] {
  return (rows ?? []).map((r) => {
    const o: Record<string, unknown> = { ...r };
    for (const f of fields) if (f in o) o[f] = num(o[f]);
    for (const f of nullable) if (f in o) o[f] = numOrNull(o[f]);
    return o as T;
  });
}

/** A customer's priority Pokémon (National Dex numbers), in the order they want them. */
export type PriorityKind = "shiny" | "shundo" | "hundo";
export type Priorities = Partial<Record<PriorityKind, number[]>>;
export const PRIORITY_KINDS: { key: PriorityKind; label: string; hint: string }[] = [
  { key: "shiny", label: "Shinies", hint: "Shiny targets you want first" },
  { key: "shundo", label: "Shundos", hint: "Shiny + perfect stats" },
  { key: "hundo", label: "Hundos", hint: "Perfect stats (any colour)" },
];
export const PRIORITY_MAX = 40;
