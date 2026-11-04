"use server";

import { updateTag } from "next/cache";
import { LIVE } from "@/lib/supabase/env";
import { sbServer, sbService } from "@/lib/supabase/server";

async function currentUser() {
  const db = await sbServer();
  const { data } = await db.auth.getUser();
  return { db, user: data.user };
}

/** After an admin saves, refresh the public pages for everyone. */
export async function refreshContent() {
  if (!LIVE) return { ok: true };
  const { db, user } = await currentUser();
  if (!user) return { ok: false };
  const { data } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") return { ok: false };
  updateTag("content");
  return { ok: true };
}

/**
 * Makes the owner an admin on login: any email listed in the ADMIN_EMAILS
 * environment variable (comma-separated) gets the admin role automatically.
 */
export async function syncAdminRole(): Promise<"admin" | "user" | null> {
  if (!LIVE) return null;
  const { db, user } = await currentUser();
  if (!user) return null;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isOwner = !!user.email && admins.includes(user.email.toLowerCase()) && !!user.email_confirmed_at;
  const { data } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (isOwner && data?.role !== "admin") {
    await sbService().from("profiles").update({ role: "admin" }).eq("id", user.id);
    return "admin";
  }
  return (data?.role as "admin" | "user") ?? "user";
}

/* ───────────────────────────── payments ───────────────────────────── */

export type CheckoutResult = { ok: true; sessionId: string; purchaseUrl: string | null } | { ok: false; error: string };

/** Start a Whop checkout for one item. The price always comes from the database. */
export async function createCheckout(kind: "subscription" | "service" | "offer" | "custom", id: string, returnUrl: string): Promise<CheckoutResult> {
  if (!LIVE) return { ok: false, error: "demo" };
  const { whopConfigured, createWhopCheckout } = await import("@/lib/payments/whop");
  if (!whopConfigured()) {
    console.warn("[checkout] Whop env vars missing");
    return { ok: false, error: "Payments aren't switched on yet — message us on Discord to order." };
  }
  const { db, user } = await currentUser();
  if (!user) return { ok: false, error: "signin" };
  const { data: settings } = await db.from("site_settings").select("maintenance").eq("id", 1).single();
  if (settings?.maintenance) return { ok: false, error: "Checkout is paused for maintenance — try again soon." };
  try {
    const r = await createWhopCheckout(kind, id, user.id, returnUrl);
    console.info("[checkout] created", { kind, id, session: r.sessionId, hasUrl: !!r.purchaseUrl });
    return { ok: true, sessionId: r.sessionId, purchaseUrl: r.purchaseUrl };
  } catch (e) {
    const err = e as { message?: string; statusCode?: number; body?: unknown };
    console.error("[checkout] failed", { kind, id, message: err?.message, status: err?.statusCode, body: JSON.stringify(err?.body ?? null).slice(0, 800) });
    return { ok: false, error: err?.message ? `Checkout error: ${err.message}` : "Couldn't start checkout" };
  }
}

/** Called by the success popup with Whop's receipt id: records the order right away (the webhook does the same). */
export async function confirmCheckout(receiptId: string): Promise<{ orderId: string | null; status: string }> {
  if (!LIVE || !receiptId) return { orderId: null, status: "unknown" };
  const { user } = await currentUser();
  if (!user) return { orderId: null, status: "unknown" };
  try {
    const { recordWhopPayment } = await import("@/lib/payments/whop");
    const r = await recordWhopPayment(receiptId);
    return { orderId: r.order?.id ?? null, status: r.order?.status ?? r.status };
  } catch {
    return { orderId: null, status: "processing" };
  }
}
