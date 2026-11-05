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
  const { data: settings } = await db.from("site_settings").select("maintenance, queue_open").eq("id", 1).single();
  if (settings?.maintenance) return { ok: false, error: "Checkout is paused for maintenance — try again soon." };
  if (settings?.queue_open === false) return { ok: false, error: "Orders are paused right now — check back soon." };
  try {
    const r = await createWhopCheckout(kind, id, user.id, returnUrl);
    console.info("[checkout] created", { kind, id, session: r.sessionId, hasUrl: !!r.purchaseUrl });
    return { ok: true, sessionId: r.sessionId, purchaseUrl: r.purchaseUrl };
  } catch (e) {
    const err = e as { message?: string; statusCode?: number; body?: unknown };
    console.error("[checkout] failed", { kind, id, message: err?.message, status: err?.statusCode, body: JSON.stringify(err?.body ?? null).slice(0, 800) });
    // show the buyer Whop's own sentence, not the raw HTTP dump
    const whopMsg = (err?.body as { error?: { message?: string } } | undefined)?.error?.message ?? err?.message?.match(/"message":\s*"([^"]+)"/)?.[1];
    return { ok: false, error: whopMsg ? `Checkout couldn't start: ${whopMsg}. Please try again or message us on Discord.` : "Couldn't start checkout — please try again or message us on Discord." };
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

/* ───────────────────────────── Discord server setup (admin only) ───────────────────────────── */

async function requireAdmin() {
  if (!LIVE) throw new Error("Discord setup works on the live site only.");
  const { db, user } = await currentUser();
  if (!user) throw new Error("Please log in.");
  const { data } = await db.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") throw new Error("Admins only.");
}

export type DiscordStatus =
  | { ok: false; reason: "no-token" | "error"; message?: string }
  | {
      ok: true;
      inviteUrl: string | null;
      guild: { id: string; name: string } | null;
      guildCount: number;
      channels: string[];
      roles: string[];
      plan: { name: string; channels: string[] }[];
      newRoles: string[];
    };

export async function discordStatus(): Promise<DiscordStatus> {
  try {
    await requireAdmin();
    const { discordConfigured, botClientId, targetGuild, dc } = await import("@/lib/discord/api");
    if (!discordConfigured()) return { ok: false, reason: "no-token" };
    const id = botClientId();
    const inviteUrl = id ? `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot&permissions=8` : null;
    const { guild, count } = await targetGuild();
    const { blueprint, ROLES } = await import("@/lib/discord/blueprint");
    const { getSiteContent } = await import("@/lib/data");
    const plan = blueprint(await getSiteContent(), process.env.NEXT_PUBLIC_SITE_URL ?? "").map((c) => ({ name: c.name, channels: c.channels.map((x) => `#${x.name}`) }));
    if (!guild) return { ok: true, inviteUrl, guild: null, guildCount: count, channels: [], roles: [], plan, newRoles: ROLES.map((r) => r.name) };
    const [channels, roles] = await Promise.all([
      dc<{ name: string; type: number }[]>("GET", `/guilds/${guild.id}/channels`),
      dc<{ name: string; managed: boolean }[]>("GET", `/guilds/${guild.id}/roles`),
    ]);
    const roleNames = roles.filter((r) => !r.managed && r.name !== "@everyone").map((r) => r.name);
    return {
      ok: true,
      inviteUrl,
      guild,
      guildCount: count,
      channels: channels.map((c) => (c.type === 4 ? `▸ ${c.name.toUpperCase()}` : c.type === 2 ? `🔊 ${c.name}` : `#${c.name}`)),
      roles: roleNames,
      plan,
      newRoles: ROLES.filter((r) => !roleNames.includes(r.name)).map((r) => r.name),
    };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

export type DiscordStepResult = { ok: boolean; done: string[]; failed: string[]; message?: string };

/**
 * One step of the build, so no single request runs too long:
 *   "delete"   → delete every existing channel and category
 *   "roles"    → create the UnownVault roles that don't exist yet
 *   "category" → build category #index with its channels and info posts
 */
export async function discordStep(step: "delete" | "roles" | "category", index = 0): Promise<DiscordStepResult> {
  const done: string[] = [];
  const failed: string[] = [];
  try {
    await requireAdmin();
    const { dc, targetGuild } = await import("@/lib/discord/api");
    const { ROLES, blueprint, overwrites } = await import("@/lib/discord/blueprint");
    const { guild } = await targetGuild();
    if (!guild) return { ok: false, done, failed, message: "The bot isn't in exactly one server yet." };
    const g = guild.id;

    if (step === "delete") {
      const channels = await dc<{ id: string; name: string; type: number }[]>("GET", `/guilds/${g}/channels`);
      // channels first, categories last
      for (const ch of [...channels].sort((a, b) => Number(a.type === 4) - Number(b.type === 4))) {
        try {
          await dc("DELETE", `/channels/${ch.id}`);
          done.push(ch.name);
        } catch (e) {
          failed.push(`${ch.name} (${e instanceof Error ? e.message : "error"})`);
        }
      }
      return { ok: true, done, failed };
    }

    const roles = await dc<{ id: string; name: string }[]>("GET", `/guilds/${g}/roles`);
    const byName = new Map(roles.map((r) => [r.name, r.id]));

    if (step === "roles") {
      for (const r of ROLES) {
        if (byName.has(r.name)) continue;
        try {
          await dc("POST", `/guilds/${g}/roles`, { name: r.name, color: r.color, hoist: r.hoist, permissions: r.permissions, mentionable: false });
          done.push(r.name);
        } catch (e) {
          failed.push(`${r.name} (${e instanceof Error ? e.message : "error"})`);
        }
      }
      return { ok: true, done, failed };
    }

    // step === "category"
    const ids: Record<string, string> = {};
    for (const r of ROLES) if (byName.has(r.name)) ids[r.key] = byName.get(r.name)!;
    const { getSiteContent } = await import("@/lib/data");
    const cats = blueprint(await getSiteContent(), process.env.NEXT_PUBLIC_SITE_URL ?? "");
    const cat = cats[index];
    if (!cat) return { ok: true, done, failed };
    const parent = await dc<{ id: string }>("POST", `/guilds/${g}/channels`, { name: cat.name, type: 4, position: index, permission_overwrites: overwrites(cat.access, g, ids) });
    done.push(`▸ ${cat.name}`);
    for (const [i, ch] of cat.channels.entries()) {
      try {
        const made = await dc<{ id: string }>("POST", `/guilds/${g}/channels`, {
          name: ch.name,
          type: 0,
          topic: ch.topic.slice(0, 1024),
          parent_id: parent.id,
          position: i,
          permission_overwrites: overwrites(ch.access, g, ids),
        });
        for (const embed of ch.posts) {
          const msg = await dc<{ id: string }>("POST", `/channels/${made.id}/messages`, { embeds: [embed] });
          if (ch.posts.length === 1) await dc("PUT", `/channels/${made.id}/pins/${msg.id}`).catch(() => null);
        }
        done.push(`#${ch.name}`);
      } catch (e) {
        failed.push(`#${ch.name} (${e instanceof Error ? e.message : "error"})`);
      }
    }
    return { ok: true, done, failed };
  } catch (e) {
    return { ok: false, done, failed, message: e instanceof Error ? e.message : String(e) };
  }
}
