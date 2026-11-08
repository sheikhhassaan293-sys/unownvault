"use client";

/**
 * Where Whop sends buyers after paying. Shows the success screen straight away, then
 * finds the new order (recorded by the Whop webhook, or right here if Whop passes a
 * receipt id back) and shows its number and "Pending delivery".
 */
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { confirmCheckout } from "@/app/actions";
import { ORDER_STATUS, useSession } from "../providers/Session";
import { Link } from "../providers/Transition";

type Pending = { name: string; kind: string; startedAt: number };

export function CheckoutSuccess() {
  const { ready, user, orders, reload } = useSession();
  const [pending, setPending] = useState<Pending | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const tried = useRef(false);

  // what they bought + any receipt id Whop added to the address
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("uv-checkout");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the pre-checkout note
      if (raw) setPending(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!ready || tried.current) return;
    tried.current = true;
    const q = new URLSearchParams(window.location.search);
    const receipt = q.get("receipt_id") || q.get("payment_id") || q.get("receipt") || q.get("id");
    (async () => {
      if (receipt) await confirmCheckout(receipt).catch(() => null);
      // guests have no order list to watch — their request page shows the progress
      if (!user) return setGaveUp(true);
      // poll for the order the webhook creates (up to ~40s)
      for (let i = 0; i < 20; i++) {
        await reload();
        await new Promise((r) => setTimeout(r, 2000));
      }
      setGaveUp(true);
    })();
  }, [ready, user, reload]);

  const [openedAt, setOpenedAt] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- time is only known in the browser
    setOpenedAt(Date.now());
  }, []);
  const since = pending?.startedAt ?? (openedAt ?? 0) - 15 * 60_000;
  const order = openedAt == null ? undefined : orders.find((o) => o.provider === "whop" && Date.parse(o.created_at) >= since - 60_000);
  const isSub = (order?.type ?? pending?.kind) === "subscription";

  return (
    <div className="auth-wrap">
      <motion.div className="panel auth-card success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} role="status">
        <svg viewBox="0 0 52 52" className="tick" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" />
          <motion.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.4 }} />
        </svg>
        <h1 className="h3">Gotcha! Payment successful</h1>
        {pending?.name && <p className="mono dim" style={{ fontSize: 13, marginTop: 6 }}>{pending.name}</p>}
        <div className="success-meta">
          {order ? <span className="mono dim">ORDER #{order.id}</span> : <span className="mono dim">{gaveUp ? "ORDER ON ITS WAY" : "CONFIRMING…"}</span>}
          <span className="badge solid">{order ? (isSub ? "Plan active" : ORDER_STATUS[order.status]) : isSub ? "Plan active" : "Pending delivery"}</span>
        </div>
        <p>
          {isSub
            ? "Your plan is live. Each hunt we deliver shows up in your account, and updates come to you on Discord."
            : "You're in the queue. We'll update you on Discord as we work — once it's delivered, mark it as received in your account."}
        </p>
        {gaveUp && !order && user && (
          <p className="dim" style={{ fontSize: 14, marginTop: 10 }}>
            Your payment went through — the order can take a minute to appear in your account. If it doesn&apos;t show within 10 minutes, message us on Discord.
          </p>
        )}
        {ready && !user && (
          <p className="dim" style={{ fontSize: 14, marginTop: 10 }}>
            Your payment went through. Your receipt is in your email from Whop, and your request page shows the progress.
          </p>
        )}
        <div className="stack" style={{ marginTop: 20 }}>
          {ready && !user ? (
            <Link className="btn btn-block" href="/custom">
              Back to my request
            </Link>
          ) : (
            <Link className="btn btn-block" href="/account">
              View my orders
            </Link>
          )}
          <Link className="btn ghost btn-block" href="/services">
            Back to the shop
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
