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
  patreon_user_id: string | null;
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
  patreon_enabled: boolean;
  patreon_tier_id: string | null;
  patreon_join_url: string | null;
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
};

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
  provider: "whop" | "patreon" | "manual";
  payment_method: string | null;
  transaction_ref: string | null;
  external_payment_id: string | null;
  proof_url: string | null;
  created_at: string;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  tier_id: string;
  source: "whop" | "patreon" | "manual";
  external_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "active" | "cancelled" | "expired" | "past_due";
  /** true when the provider will auto-renew (Whop / Patreon). */
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
  deadline: string | null;
  discord_username: string;
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
  patreon_enabled: boolean;
  manual_payments_enabled: boolean;
  /** Page headings and text blocks, see lib/copy.ts. */
  copy: Record<string, string>;
  /** Footnote under the subscription tiers (shiny / shundo availability). */
  availability_note: string;
  /** Display-only FX rates from USD. Charges always happen in the item's currency. */
  fx_rates: Record<Currency, number>;
};
