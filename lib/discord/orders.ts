import "server-only";
import { sbService } from "@/lib/supabase/server";
import { cooldownText, type Cooldown } from "@/lib/types";
import { dc, discordConfigured, findChannel, targetGuild } from "./api";
import { ROLES, overwrites } from "./blueprint";

/**
 * New-order announcements:
 *  - #recent-orders (public): "A trainer just ordered Raid Pack ×20" — never the buyer's name.
 *  - #order-log (staff only): the full details you need to start the order.
 * Each order is announced once (orders.discord_posted_at).
 */
export const PUBLIC_ORDERS_CHANNEL = "recent-orders";
const LIME = 0xc8f56a;
const ORANGE = 0xff6a1a;

type Row = {
  id: string;
  type: string;
  item_name: string;
  amount: number | string;
  currency: string;
  status: string;
  provider: string;
  quantity: number | null;
  cooldown: Cooldown | null;
  user_id: string | null;
  discord_posted_at: string | null;
  created_at: string;
};

const money = (n: number | string, cur = "USD") => `${cur === "USD" ? "$" : ""}${Number(n).toFixed(2)}${cur === "USD" ? "" : ` ${cur}`}`;

/** Find #recent-orders, or create it (read-only for members) under the PROOF category. */
async function publicChannel(guildId: string): Promise<string> {
  const found = await findChannel(guildId, PUBLIC_ORDERS_CHANNEL);
  if (found) return found.id;
  const [channels, roles] = await Promise.all([
    dc<{ id: string; name: string; type: number }[]>("GET", `/guilds/${guildId}/channels`),
    dc<{ id: string; name: string }[]>("GET", `/guilds/${guildId}/roles`),
  ]);
  const byName = new Map(roles.map((r) => [r.name, r.id]));
  const ids = Object.fromEntries(ROLES.map((r) => [r.key, byName.get(r.name)]).filter(([, v]) => v)) as Record<string, string>;
  const parent = channels.find((c) => c.type === 4 && c.name.toUpperCase() === "PROOF");
  const made = await dc<{ id: string }>("POST", `/guilds/${guildId}/channels`, {
    name: PUBLIC_ORDERS_CHANNEL,
    type: 0,
    topic: "Live feed of new orders 🛒",
    ...(parent ? { parent_id: parent.id } : {}),
    permission_overwrites: ids.staff ? overwrites("info", guildId, ids) : [],
  });
  return made.id;
}

export type AnnounceResult = { ok: boolean; message: string };

export async function announceOrder(orderId: string): Promise<AnnounceResult> {
  if (!discordConfigured()) return { ok: false, message: "Discord bot isn't connected" };
  const db = sbService();
  const { data: o } = await db
    .from("orders")
    .select("id, type, item_name, amount, currency, status, provider, quantity, cooldown, user_id, discord_posted_at, created_at")
    .eq("id", orderId)
    .single<Row>();
  if (!o) return { ok: false, message: "Order not found" };
  if (o.discord_posted_at) return { ok: true, message: "Already posted" };
  if (["refunded", "cancelled", "awaiting_confirmation"].includes(o.status)) return { ok: false, message: `Not posted: order is ${o.status.replace("_", " ")}` };

  const { guild } = await targetGuild();
  if (!guild) return { ok: false, message: "The bot isn't in your server" };
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const renewal = o.item_name.startsWith("Renewal");
  const sub = o.type === "subscription";

  // public: no names, no ids — just what was bought
  if (!renewal) {
    const ch = await publicChannel(guild.id);
    await dc("POST", `/channels/${ch}/messages`, {
      embeds: [
        {
          title: sub ? "🎉 New subscriber!" : "🛒 New order!",
          description: sub ? `A trainer just joined **${o.item_name}**.` : `A trainer just ordered **${o.item_name}**.`,
          color: LIME,
          ...(site ? { url: `${site}/${sub ? "subscriptions" : "services"}` } : {}),
          footer: { text: site ? `Order yours at ${site.replace(/^https?:\/\//, "")}` : "UnownVault" },
          timestamp: o.created_at,
        },
      ],
      allowed_mentions: { parse: [] },
    });
  }

  // staff: everything needed to start the work
  const log = await findChannel(guild.id, "order-log");
  if (log) {
    const { data: p } = o.user_id
      ? await db.from("profiles").select("username, discord_tag").eq("id", o.user_id).maybeSingle()
      : { data: null };
    await dc("POST", `/channels/${log.id}/messages`, {
      embeds: [
        {
          title: `${renewal ? "🔁 Renewal" : "🧾 New order"} ${o.id}`,
          color: ORANGE,
          fields: [
            { name: "Item", value: o.item_name, inline: true },
            { name: "Paid", value: `${money(o.amount, o.currency)} · ${o.provider}`, inline: true },
            { name: "Buyer", value: [p?.username, p?.discord_tag ? `Discord: ${p.discord_tag}` : null].filter(Boolean).join("\n") || "—", inline: true },
            ...(o.cooldown ? [{ name: "Cooldown", value: cooldownText(o.cooldown), inline: true }] : []),
            ...(site ? [{ name: "Admin", value: `${site}/admin`, inline: true }] : []),
          ],
          timestamp: o.created_at,
        },
      ],
      allowed_mentions: { parse: [] },
    });
  }

  await db.from("orders").update({ discord_posted_at: new Date().toISOString() }).eq("id", o.id);
  return { ok: true, message: renewal ? "Logged for staff (renewals aren't posted publicly)" : `Posted in #${PUBLIC_ORDERS_CHANNEL}` };
}

/* ───────────── staff alerts in #order-log: new custom requests and new chat messages ───────────── */

async function staffLog(embed: Record<string, unknown>): Promise<boolean> {
  if (!discordConfigured()) return false;
  const { guild } = await targetGuild();
  const log = guild ? await findChannel(guild.id, "order-log") : null;
  if (!log) return false;
  await dc("POST", `/channels/${log.id}/messages`, { embeds: [embed], allowed_mentions: { parse: [] } });
  return true;
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const adminUrl = () => `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/admin`;

/** A new custom request → one post for staff. Safe to call from anyone: it only ever posts once per request. */
export async function announceRequest(requestId: string): Promise<AnnounceResult> {
  const db = sbService();
  const { data: r } = await db
    .from("custom_requests")
    .select("id, request_type, target, details, budget, discord_username, user_id, discord_posted_at, created_at")
    .eq("id", requestId)
    .single();
  if (!r) return { ok: false, message: "Request not found" };
  if (r.discord_posted_at) return { ok: true, message: "Already posted" };
  // claim it first so two calls can't both post
  const { data: claimed } = await db
    .from("custom_requests")
    .update({ discord_posted_at: new Date().toISOString() })
    .eq("id", r.id)
    .is("discord_posted_at", null)
    .select("id");
  if (!claimed?.length) return { ok: true, message: "Already posted" };
  const ok = await staffLog({
    title: `📝 New custom request ${r.id}`,
    color: LIME,
    fields: [
      { name: "Wants", value: clip(`${r.request_type} · ${r.target}`, 250) },
      ...(r.details ? [{ name: "Details", value: clip(r.details, 500) }] : []),
      { name: "Budget", value: r.budget != null ? `$${r.budget}` : "—", inline: true },
      { name: "Buyer", value: r.discord_username ? `Discord: ${clip(r.discord_username, 40)}` : r.user_id ? "Has an account" : "Guest", inline: true },
      { name: "Quote it", value: adminUrl(), inline: true },
    ],
    timestamp: r.created_at,
  });
  return { ok, message: ok ? "Posted in #order-log" : "No #order-log channel" };
}

/** New buyer chat messages → one staff post (at most one per thread every 5 minutes). */
export async function announceChat(threadId: string): Promise<AnnounceResult> {
  const db = sbService();
  const { data: fresh } = await db
    .from("order_messages")
    .select("id, body, created_at")
    .eq("thread_id", threadId)
    .eq("sender", "buyer")
    .eq("seen_by_staff", false)
    .is("staff_notified_at", null)
    .order("created_at", { ascending: true })
    .limit(20);
  if (!fresh?.length) return { ok: true, message: "Nothing new" };
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: recent } = await db.from("order_messages").select("id").eq("thread_id", threadId).gt("staff_notified_at", fiveMinAgo).limit(1);
  if (recent?.length) return { ok: true, message: "Staff were alerted a moment ago" };
  const { data: claimed } = await db
    .from("order_messages")
    .update({ staff_notified_at: new Date().toISOString() })
    .in("id", fresh.map((m) => m.id))
    .is("staff_notified_at", null)
    .select("id");
  if (!claimed?.length) return { ok: true, message: "Already alerted" };
  const ok = await staffLog({
    title: `💬 New message on ${threadId}`,
    color: ORANGE,
    description: clip(fresh.map((m) => `“${m.body}”`).join("\n"), 900),
    fields: [{ name: "Reply", value: adminUrl(), inline: true }],
    timestamp: fresh[fresh.length - 1].created_at,
  });
  return { ok, message: ok ? "Posted in #order-log" : "No #order-log channel" };
}
