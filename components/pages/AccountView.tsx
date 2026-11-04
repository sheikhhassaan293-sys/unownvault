"use client";

import type { SubscriptionTier, UserSubscription } from "@/lib/types";
import { Price } from "../providers/Currency";
import { ORDER_STATUS, useSession } from "../providers/Session";
import { useToast } from "../providers/Toast";
import { Link, useThemedNavigate } from "../providers/Transition";
import { daysUntil, Reveal, useNow } from "../ui";
import { RequestRow } from "./RequestForm";

type Sub = UserSubscription & { tier: SubscriptionTier | null };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function AccountView({ subs }: { subs: Sub[] }) {
  const { user, ready, signOut, orders, requests, markReceived, live, subscriptions } = useSession();
  const toast = useToast();
  const navigate = useThemedNavigate();
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
            <Link className="btn btn-block" href="/login">
              Log in
            </Link>
            <Link className="btn ghost btn-block" href="/signup">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const active = (live ? subscriptions : subs).find((s) => s.status === "active");
  const allRequests = requests;

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
              signOut().then(() => navigate("/"));
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
                <button
                  className="btn ghost btn-block"
                  onClick={() => {
                    const url = (active as { manage_url?: string | null }).manage_url;
                    if (live && url) window.open(url, "_blank", "noopener");
                    else toast(live ? "Message us on Discord to change this plan" : "Demo: opens your Whop billing portal");
                  }}
                >
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
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span className={`badge ${o.status === "completed" ? "quiet" : o.status === "pending" ? "solid" : ""}`}>{ORDER_STATUS[o.status]}</span>
                        {(o.status === "pending" || o.status === "in_progress") && (
                          <button
                            className="linkish"
                            onClick={() => {
                              if (confirm(`Mark ${o.item_name} as received? Only do this once it's been delivered.`)) {
                                markReceived(o.id).then((r) => toast(r.error ? `Couldn't update: ${r.error}` : "Marked as received — thanks!"));
                              }
                            }}
                          >
                            Mark as received
                          </button>
                        )}
                      </div>
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
