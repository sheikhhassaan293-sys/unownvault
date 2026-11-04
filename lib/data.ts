/**
 * DATA LAYER — the only place pages get content from.
 *
 * Phase 1: reads the mock file (data/content.ts).
 * Phase 2: replace each function body with a Supabase query, e.g.
 *
 *   const { data } = await supabase.from("subscription_tiers")
 *     .select("*").eq("active", true).order("sort_order");
 *
 * and wrap in `"use cache"` + `cacheTag("tiers")` so the admin panel can call
 * `revalidateTag("tiers")` and the live site updates instantly.
 */
import * as mock from "@/data/content";
import type { CustomRequest, Period } from "@/lib/types";

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export async function getSiteSettings() {
  return mock.site_settings;
}

export async function getTiers(period?: Period) {
  return mock.subscription_tiers
    .filter((t) => t.active && (!period || t.period === period))
    .sort(bySort);
}

export async function getServices() {
  return mock.services.filter((s) => s.active).sort(bySort);
}

export async function getServiceCategories() {
  return mock.service_categories;
}

export async function getPopularServices(limit = 3) {
  return (await getServices()).filter((s) => s.popular).slice(0, limit);
}

/** Published offers. Time filtering (not started / expired) happens on the client so countdowns stay live. */
export async function getOffers() {
  return mock.offers.filter((o) => o.published);
}

export async function getFaqs() {
  return [...mock.faqs].sort(bySort);
}

export const MOCK_NOW = mock.MOCK_NOW;

// ── Client-callable mock mutations (Phase 2: server actions / route handlers) ──

export type NewCustomRequest = Pick<
  CustomRequest,
  "request_type" | "target" | "details" | "budget" | "deadline" | "discord_username"
> & { image?: File | null };

export async function submitCustomRequest(input: NewCustomRequest): Promise<CustomRequest> {
  await new Promise((r) => setTimeout(r, 650)); // feels like a network call
  return {
    id: "UV-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
    user_id: null,
    request_type: input.request_type,
    target: input.target,
    details: input.details,
    budget: input.budget,
    deadline: input.deadline,
    discord_username: input.discord_username,
    image_url: null,
    status: "new",
    quote_amount: null,
    admin_reply: null,
    created_at: new Date().toISOString(),
  };
}

/** Phase 1: the fake signed-in account. Phase 2: queries scoped to auth.uid() via RLS. */
export async function getDemoAccount() {
  const tiers = mock.subscription_tiers;
  return {
    profile: mock.demo_profile,
    subscriptions: mock.demo_subscriptions.map((s) => ({ ...s, tier: tiers.find((t) => t.id === s.tier_id) ?? null })),
    orders: mock.demo_orders,
    custom_requests: mock.demo_custom_requests,
  };
}

export async function getTakenUsernames() {
  return mock.taken_usernames;
}
