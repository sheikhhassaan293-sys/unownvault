"use client";

/**
 * Admin → Members: everyone who has signed up (updates live as new people join),
 * plus "send a personal offer" to the ones you tick, and the list of offers you've sent.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase/browser";
import { LIVE } from "@/lib/supabase/env";
import type { CustomRequest } from "@/lib/types";
import { useSession } from "../providers/Session";
import { useToast } from "../providers/Toast";

type Member = {
  id: string;
  username: string | null;
  discord_tag: string | null;
  email: string | null;
  provider: string;
  role: string;
  joined_at: string;
  last_sign_in_at: string | null;
  orders: number;
};

const when = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!LIVE) return setLoaded(true);
    const { data, error } = await sb().rpc("admin_members");
    if (error) setError(error.message);
    else {
      setError(null);
      setMembers((data ?? []) as Member[]);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
    if (!LIVE) return;
    const db = sb();
    // a new sign-up creates a profile row → reload the list
    const channel = db.channel("admin-members").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load()).subscribe();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 30_000);
    return () => {
      clearInterval(t);
      db.removeChannel(channel);
    };
  }, [load]);
  return { members, error, loaded, reload: load };
}

export function MembersAdmin() {
  const { members, error, loaded } = useMembers();
  const { requests, refreshRequests } = useSession();
  const toast = useToast();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [eta, setEta] = useState("");
  const [busy, setBusy] = useState(false);

  const buyers = members.filter((m) => m.role !== "admin");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return buyers;
    return buyers.filter((m) => [m.username, m.discord_tag, m.email].some((x) => x?.toLowerCase().includes(s)));
  }, [buyers, q]);
  const nameOf = (id: string | null) => {
    const m = members.find((x) => x.id === id);
    return m?.username || m?.discord_tag || m?.email || "member";
  };
  const offers = requests.filter((r) => r.is_offer);
  const allShownPicked = shown.length > 0 && shown.every((m) => picked.has(m.id));

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function send() {
    const amount = Number(price);
    if (!title.trim()) return toast("Give the offer a title");
    if (!(amount > 0)) return toast("Set a price above 0");
    if (!picked.size) return toast("Tick at least one member");
    if (!window.confirm(`Send “${title.trim()}” for $${amount} to ${picked.size} member${picked.size === 1 ? "" : "s"}? It pops up for them straight away.`)) return;
    setBusy(true);
    const { data, error } = await sb().rpc("admin_send_offer", {
      p_users: Array.from(picked),
      p_title: title.trim(),
      p_description: desc.trim(),
      p_price: amount,
      p_eta: eta.trim(),
    });
    setBusy(false);
    if (error) return toast(`Couldn't send: ${error.message}`);
    toast(`Offer sent to ${data} member${data === 1 ? "" : "s"}`);
    setPicked(new Set());
    refreshRequests();
  }

  async function remove(r: CustomRequest) {
    if (!window.confirm(`Remove the offer “${r.target}” for ${nameOf(r.user_id)}? It disappears from their screen.`)) return;
    const { error } = await sb().rpc("admin_delete_offer", { p_id: r.id });
    if (error) return toast(error.message);
    toast("Offer removed");
    refreshRequests();
  }

  if (!LIVE) return <p className="muted">The members list works on the live site.</p>;

  return (
    <div className="agrid">
      <section className="panel asec" style={{ gridColumn: "1 / -1" }}>
        <div className="head-row" style={{ alignItems: "center", marginBottom: 12 }}>
          <h2 className="label bare">
            Members <span className="mono dim">({buyers.length})</span>
          </h2>
          <input className="mem-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, Discord or email" aria-label="Search members" />
        </div>
        <p className="help" style={{ marginBottom: 12 }}>Updates by itself when someone new signs up. Tick people, then send them an offer below.</p>
        {error && <p className="err">{error}</p>}
        {!loaded ? (
          <p className="muted">Loading…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="otable">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select everyone shown"
                      checked={allShownPicked}
                      onChange={() =>
                        setPicked((p) => {
                          const n = new Set(p);
                          shown.forEach((m) => (allShownPicked ? n.delete(m.id) : n.add(m.id)));
                          return n;
                        })
                      }
                    />
                  </th>
                  <th>Trainer</th>
                  <th>Contact</th>
                  <th className="hide-m">Joined</th>
                  <th className="hide-m">Last sign-in</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id} onClick={() => toggle(m.id)} style={{ cursor: "pointer" }}>
                    <td>
                      <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${m.username ?? "member"}`} />
                    </td>
                    <td>{m.username || <span className="dim">no name yet</span>}</td>
                    <td className="m">
                      {m.discord_tag ? `Discord: ${m.discord_tag}` : m.email || "—"}
                      <br />
                      <small className="dim">{m.provider === "discord" ? "Discord sign-in" : "Email sign-in"}</small>
                    </td>
                    <td className="m dim hide-m">{when(m.joined_at)}</td>
                    <td className="m dim hide-m">{when(m.last_sign_in_at)}</td>
                    <td className="m">{m.orders}</td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={6} className="dim">
                      {buyers.length ? "Nobody matches that search." : "Nobody has signed up yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel asec">
        <h2 className="label bare">Send a personal offer</h2>
        <p className="help" style={{ margin: "8px 0 14px" }}>
          It pops up on their screen straight away (or next time they visit) with a Pay button, and stays in their requests until they pay or you remove it.
        </p>
        <div className="form">
          <div className="f full">
            <label htmlFor="po-title">Title</label>
            <input id="po-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. 3 shundos of your choice" />
          </div>
          <div className="f full">
            <label htmlFor="po-desc">Description</label>
            <textarea id="po-desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} placeholder="What they get, any conditions" />
          </div>
          <div className="f">
            <label htmlFor="po-price">Price (USD)</label>
            <input id="po-price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 5" />
          </div>
          <div className="f">
            <label htmlFor="po-eta">How long it&apos;ll take (optional)</label>
            <input id="po-eta" value={eta} onChange={(e) => setEta(e.target.value)} maxLength={40} placeholder="e.g. 2 hours" />
          </div>
          <div className="f full">
            <button className="btn btn-block" disabled={busy || !picked.size} onClick={send}>
              {busy ? "Sending…" : picked.size ? `Send to ${picked.size} member${picked.size === 1 ? "" : "s"}` : "Tick members above first"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel asec">
        <h2 className="label bare">Offers you&apos;ve sent ({offers.length})</h2>
        {!offers.length && <p className="muted" style={{ marginTop: 10 }}>None yet.</p>}
        <div className="stack" style={{ marginTop: 10 }}>
          {offers.map((r) => (
            <div key={r.id} className="kv" style={{ alignItems: "center" }}>
              <span style={{ textTransform: "none", letterSpacing: 0, fontFamily: "inherit", fontSize: 15, color: "var(--text)" }}>
                <b>{r.target}</b> · ${r.quote_amount}
                <br />
                <small className="dim mono">
                  for {nameOf(r.user_id)} · {r.status === "quoted" ? "waiting" : r.status.replace("_", " ")}
                </small>
              </span>
              {["quoted", "new", "declined"].includes(r.status) ? (
                <button className="linkish" onClick={() => remove(r)}>
                  Remove
                </button>
              ) : (
                <span className="badge quiet">Paid</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
