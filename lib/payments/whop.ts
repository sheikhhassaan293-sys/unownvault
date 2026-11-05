import "server-only";
import { WhopClient } from "@whop/sdk";
import { sbService } from "@/lib/supabase/server";
import type { Cooldown } from "@/lib/types";

/**
 * Whop — primary payment provider.
 *
 * Checkout: the server builds a Whop "checkout configuration" for the exact item and price
 * (looked up in our database, never trusted from the browser), with our user id + item in
 * its metadata. The buyer is sent to Whop's hosted page (purchase_url).
 * If the admin filled in a Whop plan ID for an item, that plan is used; otherwise Whop
 * creates a matching plan on the fly from the price, so nothing has to be set up in Whop.
 *
 * Env: WHOP_API_KEY, WHOP_WEBHOOK_SECRET, WHOP_COMPANY_ID (biz_…), optional WHOP_PRODUCT_ID (prod_…).
 */
export const whopConfigured = () => !!(process.env.WHOP_API_KEY && process.env.WHOP_COMPANY_ID);

export function whop() {
  return new WhopClient({ token: process.env.WHOP_API_KEY!, apiVersionDate: "2026-10-28" });
}

export type CheckoutKind = "subscription" | "service" | "offer" | "custom";
export type CheckoutMeta = {
  site_user_id: string;
  kind: CheckoutKind;
  item_id: string;
  item_name: string;
  /** strings — Whop metadata values are kept simple */
  quantity?: string;
  /** "none" | minutes left, e.g. "60" */
  cooldown?: string;
};
export type CheckoutExtras = { quantity?: number; cooldown?: Cooldown | null };

type Priced = { name: string; price: number; plan: string | null; period: "weekly" | "monthly" | null; quantity: number };

/** The real price of an item, from the database. */
export async function priceOf(kind: CheckoutKind, id: string, userId: string, qty = 1): Promise<Priced> {
  const db = sbService();
  if (kind === "subscription") {
    const { data } = await db.from("subscription_tiers").select("name, price, period, whop_plan_id, active").eq("id", id).single();
    if (!data?.active) throw new Error("This plan isn't available");
    return { name: `${data.name} — ${data.period}`, price: Number(data.price), plan: data.whop_plan_id, period: data.period, quantity: 1 };
  }
  if (kind === "service") {
    const { data } = await db.from("services").select("name, price, whop_plan_id, active, allow_quantity, max_quantity, quote_only").eq("id", id).single();
    if (!data?.active) throw new Error("This service isn't available");
    if (data.quote_only) throw new Error("This service is quoted — send a custom request instead");
    // quantity is only honoured where the owner allows it, and never above the item's max
    const n = data.allow_quantity ? Math.min(Math.max(1, Math.floor(Number(qty) || 1)), data.max_quantity ?? 20) : 1;
    const unit = Number(data.price);
    return {
      name: n > 1 ? `${data.name} ×${n}` : data.name,
      price: Math.round(unit * n * 100) / 100,
      // a fixed Whop plan only matches a single unit
      plan: n > 1 ? null : data.whop_plan_id,
      period: null,
      quantity: n,
    };
  }
  if (kind === "offer") {
    const { data } = await db.from("offers").select("title, price, whop_plan_id, published, starts_at, ends_at").eq("id", id).single();
    const now = Date.now();
    if (!data?.published || Date.parse(data.starts_at) > now || Date.parse(data.ends_at) < now) throw new Error("This offer has ended");
    return { name: data.title, price: Number(data.price), plan: data.whop_plan_id, period: null, quantity: 1 };
  }
  const { data } = await db.from("custom_requests").select("id, user_id, quote_amount, status, request_type, target").eq("id", id).single();
  if (!data || data.user_id !== userId) throw new Error("Request not found");
  if (data.status !== "quoted" || !data.quote_amount) throw new Error("There's no quote to pay yet");
  return { name: `Custom request ${data.id}`, price: Number(data.quote_amount), plan: null, period: null, quantity: 1 };
}

/** Whop allows at most 30 characters in a plan title. */
const whopTitle = (t: string) => (t.length <= 30 ? t : t.slice(0, 29).trimEnd() + "…");

const PRODUCT_TITLE = "UnownVault";
let productIdCache: string | null = null;

/**
 * Whop needs every plan to belong to a product (subscriptions fail without one).
 * Uses WHOP_PRODUCT_ID if set; otherwise finds our hidden "UnownVault" product, or creates it once.
 */
async function ensureProductId(): Promise<string> {
  if (process.env.WHOP_PRODUCT_ID) return process.env.WHOP_PRODUCT_ID;
  if (productIdCache) return productIdCache;
  const client = whop();
  const account_id = process.env.WHOP_COMPANY_ID;
  try {
    const page = await client.products.list({ account_id, query: PRODUCT_TITLE } as Parameters<typeof client.products.list>[0]);
    for await (const p of page) {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      if (meta.unownvault === true || p.title === PRODUCT_TITLE) {
        productIdCache = p.id;
        return p.id;
      }
    }
  } catch (e) {
    console.warn("[whop] couldn't list products", e instanceof Error ? e.message : e);
  }
  const created = await client.products.create({
    account_id,
    title: PRODUCT_TITLE,
    headline: "Pokémon GO hunts, dust & raid services",
    visibility: "hidden",
    metadata: { unownvault: true },
  } as Parameters<typeof client.products.create>[0]);
  console.info("[whop] created product", created.id);
  productIdCache = created.id;
  return created.id;
}

export async function createWhopCheckout(kind: CheckoutKind, id: string, userId: string, returnUrl: string, extras: CheckoutExtras = {}) {
  const item = await priceOf(kind, id, userId, extras.quantity);
  const metadata: CheckoutMeta = { site_user_id: userId, kind, item_id: id, item_name: item.name, quantity: String(item.quantity) };
  if (kind !== "subscription" && extras.cooldown) {
    const m = Math.min(120, Math.max(0, Math.round(Number(extras.cooldown.minutes_left) || 0)));
    metadata.cooldown = extras.cooldown.has ? String(m) : "none";
  }
  const product_id = item.plan ? undefined : await ensureProductId();
  const res = await whop().checkoutConfigurations.create({
    account_id: process.env.WHOP_COMPANY_ID,
    metadata,
    redirect_url: returnUrl,
    ...(item.plan
      ? { variant_id: item.plan }
      : {
          variant: {
            title: whopTitle(item.name),
            currency: "usd",
            product_id,
            visibility: "hidden",
            ...(item.period
              ? // renewal: Whop charges initial_price as an EXTRA sign-up fee on top of the first renewal, so it must be 0
                { billing_type: "renewal", billing_period: item.period === "weekly" ? 7 : 30, initial_price: 0, renewal_price: item.price }
              : { billing_type: "one_time", initial_price: item.price }),
          },
        }),
  } as Parameters<ReturnType<typeof whop>["checkoutConfigurations"]["create"]>[0]);
  return { sessionId: res.id, purchaseUrl: res.purchase_url ?? null, name: item.name, price: item.price };
}

/* ───────────────────────────── recording payments ───────────────────────────── */

const money = (m: { amount: string } | null | undefined) => (m ? Number(m.amount) : 0);

/**
 * Turn a Whop payment into our order (+ subscription). Idempotent: called by the webhook
 * and by the success popup, whichever comes first.
 */
export async function recordWhopPayment(paymentId: string) {
  const p = await whop().payments.retrieve({ id: paymentId });
  if (p.status !== "paid") return { order: null, status: p.status };
  const meta = (p.metadata ?? {}) as Partial<CheckoutMeta>;
  const db = sbService();

  const { data: existing } = await db.from("orders").select("id, status").eq("external_payment_id", p.id).maybeSingle();
  if (existing) return { order: existing, status: p.status };

  const kind = (meta.kind ?? "service") as CheckoutKind;
  const isRenewal = kind === "subscription" && !!p.membership_id && (await db.from("subscriptions").select("id").eq("external_id", p.membership_id).maybeSingle()).data;
  const { data: order, error } = await db
    .from("orders")
    .insert({
      user_id: meta.site_user_id ?? null,
      buyer_email: p.customer_email ?? null,
      type: kind,
      item_id: meta.item_id ?? p.variant_id ?? "unknown",
      item_name: (isRenewal ? "Renewal — " : "") + (meta.item_name ?? "Whop purchase"),
      amount: money(p.total) || money(p.usd_total),
      currency: (p.total?.currency ?? "usd").toUpperCase(),
      // plans are active straight away; one-off work waits for delivery
      status: kind === "subscription" ? "completed" : "pending",
      provider: "whop",
      payment_method: p.payment_method_type ?? null,
      external_payment_id: p.id,
      quantity: Math.min(100, Math.max(1, Number(meta.quantity) || 1)),
      cooldown: meta.cooldown == null ? null : meta.cooldown === "none" ? { has: false, minutes_left: null } : { has: true, minutes_left: Number(meta.cooldown) || null },
    })
    .select("id, status")
    .single();
  if (error && !/duplicate/i.test(error.message)) throw error;

  if (kind === "custom" && meta.item_id) {
    await db.from("custom_requests").update({ status: "in_progress" }).eq("id", meta.item_id);
  }
  if (kind === "subscription" && p.membership_id) await syncWhopMembership(p.membership_id);
  // a brand-new order (not a duplicate webhook): announce it in Discord; never block the payment on it
  if (order?.id) {
    const { announceOrder } = await import("@/lib/discord/orders");
    await announceOrder(order.id).catch((e) => console.warn("[discord] order announce failed", e instanceof Error ? e.message : e));
  }
  return { order, status: p.status };
}

/** Mirror a Whop membership into our subscriptions table (activate / renew / cancel / end). */
export async function syncWhopMembership(membershipId: string) {
  const m = await whop().memberships.retrieve({ id: membershipId });
  const meta = (m.metadata ?? {}) as Partial<CheckoutMeta>;
  if (meta.kind && meta.kind !== "subscription") return;
  const status =
    m.status === "active" || m.status === "trialing" || m.status === "canceling"
      ? m.cancel_at_period_end || m.status === "canceling"
        ? "cancelled"
        : "active"
      : m.status === "past_due"
        ? "past_due"
        : "expired";
  const db = sbService();
  await db.from("subscriptions").upsert(
    {
      external_id: m.id,
      user_id: meta.site_user_id ?? null,
      tier_id: meta.item_id ?? null,
      source: "whop",
      starts_at: m.created_at,
      ends_at: m.current_period_end ?? m.expires_at ?? null,
      // "cancelled" = still usable until ends_at, just won't renew
      status: status === "cancelled" && m.current_period_end && Date.parse(m.current_period_end) < Date.now() ? "expired" : status,
      renews: status === "active",
      manage_url: m.manage_url,
    },
    { onConflict: "external_id" },
  );
}

/** Refunds and chargebacks: flag the order so the admin sees it. */
export async function flagWhopPayment(paymentId: string, status: "refunded" | "disputed") {
  await sbService().from("orders").update({ status }).eq("external_payment_id", paymentId);
}
