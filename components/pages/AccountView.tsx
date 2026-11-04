"use client";

import { useRouter } from "next/navigation";
import type { CustomRequest, Order, SubscriptionTier, UserSubscription } from "@/lib/types";
import { Price } from "../providers/Currency";
import { useSession } from "../providers/Session";
import { useSettings } from "../providers/Settings";
import { useToast } from "../providers/Toast";
import { Link } from "../providers/Transition";
import { daysUntil, Reveal, useNow } from "../ui";
import { RequestRow } from "./RequestForm";

type Sub = UserSubscription & { tier: SubscriptionTier | null };

const ORDER_STATUS: Record<Order["status"], string> = {
  awaiting_payment: "Awaiting payment",
  awaiting_confirmation: "Awaiting confirmation",
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  refunded: "Refunded",
  disputed: "Disputed",
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function AccountView({ subs, orders, requests }: { subs: Sub[]; orders: Order[]; requests: CustomRequest[] }) {
  const { user, ready, signOut, myRequests } = useSession();
  const { patreon_enabled } = useSettings();
  const toast = useToast();
  const router = useRouter();
  const now = useNow(60_000);

  if (!ready) return <div style={{ minHeight: "60vh" }} />;
  if (!user) {
    return (
      <div className="auth-wrap" style={{ minHeight: "70vh" }}>
        <div className="panel auth-card">
          <div className="label">Account</div>
          <h1 className="h2">You&apos;re not signed in</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            Sign in to see your plan, orders and custom request quotes.
          </p>
          <div className="stack">
            <Link className="btn block" href="/login">
              Log in
            </Link>
            <Link className="btn ghost block" href="/signup">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const active = subs.find((s) => s.status === "active");
  const allRequests = [...myRequests, ...requests];

  return (
    <div className="page">
      <div className="head">
        <div className="label">Account</div>
        <div className="head-row">
          <h1 className="h2">
            {user.username}
            <span className="acc">.</span>
          </h1>
          <button
            className="btn ghost sm"
            onClick={() => {
              signOut();
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="acct-grid">
        <Reveal className="panel acct-card">
          <div className="label bare" style={{ marginBottom: 12 }}>
            Your plan
          </div>
          {active && active.tier ? (
            <>
              <h2 className="h3" style={{ fontSize: 28 }}>
                {active.tier.name} <span className="dim mono" style={{ fontSize: 14 }}>/ {active.tier.period}</span>
              </h2>
              <div style={{ marginTop: 14 }}>
                <div className="kv">
                  <span>Status</span>
                  <span className="badge">Active</span>
                </div>
                <div className="kv">
                  <span>{active.renews ? "Renews on" : "Expires"}</span>
                  <span className="mono">
                    {active.renews ? fmt(active.ends_at) : now ? `in ${daysUntil(active.ends_at, now)} days` : fmt(active.ends_at)}
                  </span>
                </div>
                <div className="kv">
                  <span>Price</span>
                  <span className="mono">
                    <Price amount={active.tier.price} from={active.tier.currency} /> / {active.tier.period === "weekly" ? "week" : "month"}
                  </span>
                </div>
                <div className="kv">
                  <span>Billed via</span>
                  <span className="mono" style={{ textTransform: "capitalize" }}>
                    {active.source}
                  </span>
                </div>
              </div>
              <div className="stack" style={{ marginTop: 20 }}>
                <button className="btn ghost block" onClick={() => toast("Demo: opens your Whop billing portal")}>
                  Manage or cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">No active plan.</p>
              <Link className="btn" href="/subscriptions" style={{ marginTop: 16 }}>
                See plans
              </Link>
            </>
          )}
          {patreon_enabled && (
            <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <div className="label bare" style={{ marginBottom: 8 }}>
                Patreon
              </div>
              <p className="muted" style={{ fontSize: 15, marginBottom: 14 }}>
                Already a patron? Link it and your tier unlocks here automatically.
              </p>
              <button className="btn patreon block" onClick={() => toast("Demo: Patreon sign-in opens here")}>
                Connect Patreon
              </button>
            </div>
          )}
        </Reveal>

        <Reveal className="panel acct-card" delay={0.06}>
          <div className="label bare" style={{ marginBottom: 6 }}>
            Order history
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="otable">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Item</th>
                  <th className="hide-m">Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="m dim">{o.id}</td>
                    <td>{o.item_name}</td>
                    <td className="m dim hide-m">{fmt(o.created_at)}</td>
                    <td className="m">
                      <Price amount={o.amount} from={o.currency} />
                    </td>
                    <td>
                      <span className={`badge ${o.status === "completed" ? "quiet" : ""}`}>{ORDER_STATUS[o.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>

      <section className="sec" style={{ marginTop: 60 }} aria-labelledby="req-h">
        <div className="head-row head">
          <h2 id="req-h" className="label">
            Custom requests
          </h2>
          <Link className="mono acc" href="/custom" style={{ fontSize: 13, letterSpacing: ".1em" }}>
            NEW REQUEST →
          </Link>
        </div>
        <div className="reqlist">
          {allRequests.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </div>
      </section>
    </div>
  );
}
