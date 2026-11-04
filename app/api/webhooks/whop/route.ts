import { unwrapWebhook } from "@whop/sdk/helpers";
import { flagWhopPayment, recordWhopPayment, syncWhopMembership } from "@/lib/payments/whop";
import { sbService } from "@/lib/supabase/server";

/**
 * Whop → our site. Verifies the Standard Webhooks signature, logs the event, then
 * re-reads the payment / membership from Whop's API (so we never trust the payload alone)
 * and updates orders and subscriptions.
 *
 * In Whop: Developer → Webhooks → add https://YOUR-DOMAIN/api/webhooks/whop with events:
 * payment.succeeded, refund.created, dispute.created, dispute.updated,
 * membership.activated, membership.deactivated, membership.updated, membership.cancel_at_period_end_changed
 */
type Evt = { type?: string; event?: string; action?: string; id?: string; data?: Record<string, unknown> };

export async function POST(request: Request) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  let evt: Evt;
  try {
    evt = unwrapWebhook<Evt>(body, { headers, key: process.env.WHOP_WEBHOOK_SECRET });
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  const type = evt.type ?? evt.event ?? evt.action ?? "unknown";
  const data = (evt.data ?? {}) as Record<string, unknown>;
  const ref = (k: string) => {
    const v = data[k];
    return typeof v === "string" ? v : v && typeof v === "object" && "id" in v ? String((v as { id: unknown }).id) : null;
  };

  // log + de-duplicate (Whop retries deliveries)
  const deliveryId = headers["webhook-id"] ?? null;
  const log = await sbService().from("payment_events").insert({ provider: "whop", event_type: type, external_id: deliveryId, payload: evt });
  if (log.error && /duplicate/i.test(log.error.message)) return Response.json({ ok: true, duplicate: true });

  try {
    if (type === "payment.succeeded") {
      await recordWhopPayment(String(data.id));
    } else if (type.startsWith("membership.")) {
      await syncWhopMembership(String(data.id));
    } else if (type.startsWith("refund.")) {
      const pid = ref("payment") ?? ref("payment_id");
      if (pid) await flagWhopPayment(pid, "refunded");
    } else if (type.startsWith("dispute.")) {
      const pid = ref("payment") ?? ref("payment_id");
      if (pid) await flagWhopPayment(pid, "disputed");
    }
  } catch (e) {
    // 500 → Whop retries later
    console.error("whop webhook failed", type, e);
    // forget this delivery so Whop's retry gets processed instead of skipped as a duplicate
    if (deliveryId) await sbService().from("payment_events").delete().eq("provider", "whop").eq("external_id", deliveryId);
    return new Response("processing failed", { status: 500 });
  }
  return Response.json({ ok: true });
}
