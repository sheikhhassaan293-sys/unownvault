"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cooldownText, type Cooldown, type CustomRequest } from "@/lib/types";
import { CooldownQuestion } from "../Cooldown";
import { BuyButton, useCheckout } from "../providers/Checkout";
import { Price } from "../providers/Currency";
import { useSession } from "../providers/Session";
import { Link } from "../providers/Transition";
import { useOrdersOpen } from "../providers/Settings";
import { Reveal } from "../ui";

export const REQUEST_TYPES = ["Shundo hunt", "Shiny hunt", "Stardust", "XP / levelling", "Raids", "Grunt boosting", "Event package", "Something else"];
const XP_TYPE = "XP / levelling";
const DRAFT_KEY = "uv-request-draft";

type Draft = { type: string; target: string; details: string; budget: string; discord: string; cur: string; want: string; xp: string; cooldown: Cooldown | null };
const EMPTY: Draft = { type: REQUEST_TYPES[0], target: "", details: "", budget: "", discord: "", cur: "", want: "", xp: "", cooldown: null };

/* ───────────────────────────── the form ───────────────────────────── */

export function RequestForm() {
  const { user, live, ready, sendRequest, signInDiscord } = useSession();
  const ordersOpen = useOrdersOpen();
  const [d, setD] = useState<Draft>(EMPTY);
  const [sendError, setSendError] = useState<string | null>(null);
  const [targetErr, setTargetErr] = useState<string | null>(null);
  const [budgetErr, setBudgetErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const isXp = d.type === XP_TYPE;
  const needsLogin = live && ready && !user;

  // restore what they typed before logging in; "Get a quote" links prefill ?type=…&item=…
  useEffect(() => {
    let saved: Partial<Draft> | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    } catch {}
    const q = new URLSearchParams(window.location.search);
    const t = q.get("type");
    const item = q.get("item");
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore after hydration */
    setD((x) => ({
      ...x,
      ...(saved ?? {}),
      ...(t && REQUEST_TYPES.includes(t) ? { type: t } : {}),
      ...(item && !saved?.target ? { target: item.slice(0, 80) } : {}),
    }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle tied to the chosen file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const saveDraft = () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {}
  };

  function validate() {
    const tErr = d.target.trim() ? null : "Tell us what you need";
    const bErr = d.budget.trim() && !/^\d+(\.\d{1,2})?$/.test(d.budget.trim()) ? "Numbers only, e.g. 40" : null;
    setTargetErr(tErr);
    setBudgetErr(bErr);
    if (tErr) document.getElementById("rq-target")?.focus();
    else if (bErr) document.getElementById("rq-budget")?.focus();
    return !tErr && !bErr;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (needsLogin) {
      saveDraft();
      setBusy(true);
      const r = await signInDiscord("/custom");
      if (r.error) {
        setBusy(false);
        setSendError(r.error);
      }
      return;
    }
    // optional extras travel inside the details, so they show everywhere the request does
    const extra = [
      isXp && (d.cur || d.want || d.xp)
        ? `Current level: ${d.cur || "?"} · Wants level: ${d.want || "?"}${d.xp ? ` · XP wanted: ${d.xp}` : ""}`
        : "",
      d.cooldown ? cooldownText(d.cooldown) : "",
    ].filter(Boolean);
    setBusy(true);
    setSendError(null);
    try {
      const req = await sendRequest({
        request_type: d.type,
        target: d.target.trim(),
        details: [d.details.trim(), ...extra].filter(Boolean).join("\n"),
        budget: d.budget.trim() ? Number(d.budget) : null,
        discord_username: d.discord.trim() || null,
        image: file,
      });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      setD({ ...EMPTY, type: d.type });
      setFile(null);
      setPreview(null);
      setOpenId(req.id);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Something went wrong — try again");
    }
    setBusy(false);
  }

  if (!ordersOpen) {
    return (
      <div className="ok" role="status">
        <div className="label">Orders paused</div>
        <h3 className="h3">Back soon.</h3>
        <p>We&apos;re not taking new requests right now. Join our Discord to hear the moment we reopen.</p>
      </div>
    );
  }

  return (
    <>
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="f">
          <label htmlFor="rq-type">Request type</label>
          <select id="rq-type" value={d.type} onChange={(e) => set("type", e.target.value)}>
            {REQUEST_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="rq-target">What do you need?</label>
          <input
            id="rq-target"
            value={d.target}
            onChange={(e) => set("target", e.target.value)}
            maxLength={200}
            placeholder={isXp ? "e.g. Level 38 → 42" : d.type === "Grunt boosting" ? "e.g. 20 grunts, Shadow Ralts" : "e.g. 130 Zacian raids, or 2M dust"}
            aria-invalid={!!targetErr}
            aria-describedby={targetErr ? "rq-target-err" : undefined}
          />
          {targetErr && (
            <span className="err" id="rq-target-err">
              {targetErr}
            </span>
          )}
        </div>
        {isXp && (
          <>
            <div className="f">
              <label htmlFor="rq-cur">Current level (optional)</label>
              <input id="rq-cur" inputMode="numeric" value={d.cur} onChange={(e) => set("cur", e.target.value)} placeholder="e.g. 38" />
            </div>
            <div className="f">
              <label htmlFor="rq-want">Level you want (optional)</label>
              <input id="rq-want" inputMode="numeric" value={d.want} onChange={(e) => set("want", e.target.value)} placeholder="e.g. 42" />
            </div>
            <div className="f full">
              <label htmlFor="rq-xp">How much XP? (optional)</label>
              <input id="rq-xp" value={d.xp} onChange={(e) => set("xp", e.target.value)} placeholder="e.g. 5,000,000" />
            </div>
          </>
        )}
        <div className="f full">
          <label htmlFor="rq-details">Details (optional)</label>
          <textarea id="rq-details" value={d.details} onChange={(e) => set("details", e.target.value)} maxLength={3500} placeholder="Anything we should know?" />
        </div>
        <div className="f full">
          <CooldownQuestion value={d.cooldown} onChange={(c) => set("cooldown", c)} idPrefix="rq-cd" />
        </div>
        <div className="f">
          <label htmlFor="rq-budget">Budget in USD (optional)</label>
          <input
            id="rq-budget"
            inputMode="decimal"
            value={d.budget}
            onChange={(e) => set("budget", e.target.value)}
            placeholder="e.g. 10"
            aria-invalid={!!budgetErr}
          />
          {budgetErr && <span className="err">{budgetErr}</span>}
        </div>
        <div className="f">
          <label htmlFor="rq-discord">Discord username (optional)</label>
          <input
            id="rq-discord"
            value={d.discord}
            onChange={(e) => set("discord", e.target.value)}
            maxLength={40}
            placeholder={user?.provider === "discord" ? "We'll use your Discord account" : "yourname"}
            autoComplete="off"
            autoCapitalize="off"
          />
        </div>
        <div className="f full">
          <span className="flabel">Reference image (optional)</span>
          <label className="file">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            {preview ? <img src={preview} alt="" /> : <span className="tag">Upload</span>}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file ? file.name : "Screenshot or image"}</span>
            <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="f full">
          {sendError && <span className="err">Couldn&apos;t send: {sendError}</span>}
          <button className={`btn btn-block ${needsLogin ? "discord" : ""}`} type="submit" disabled={busy}>
            {busy ? (needsLogin ? "Opening Discord…" : "Sending…") : needsLogin ? "Log in with Discord & send" : "Send request"}
          </button>
          {needsLogin && (
            <p className="help" style={{ textAlign: "center", marginTop: 10 }}>
              You need an account so you can see our quote and pay it. What you typed is saved.{" "}
              <Link className="linkish" href="/login" onClick={saveDraft}>
                Use email instead
              </Link>
            </p>
          )}
        </div>
      </form>
      <AnimatePresence>{openId && <RequestDialog id={openId} onClose={() => setOpenId(null)} justSent />}</AnimatePresence>
    </>
  );
}

/* ───────────────────────── status, actions, popup ───────────────────────── */

const STATUS_LABEL: Record<CustomRequest["status"], string> = {
  new: "Awaiting quote",
  quoted: "Quote ready",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
};

export function RequestStatus({ status }: { status: CustomRequest["status"] }) {
  return <span className={`badge ${status === "quoted" ? "solid" : status === "completed" || status === "declined" ? "quiet" : ""}`}>{STATUS_LABEL[status]}</span>;
}

const canDelete = (r: CustomRequest) => ["new", "quoted", "declined"].includes(r.status);
const payItem = (r: CustomRequest) => ({
  kind: "custom" as const,
  id: r.id,
  name: `Custom request #${r.id}`,
  description: `${r.request_type} · ${r.target}${r.eta ? ` · ready in ${r.eta}` : ""}. Quoted price.`,
  price: r.quote_amount ?? 0,
  currency: "USD" as const,
});

function DeleteButton({ r, onDone }: { r: CustomRequest; onDone?: () => void }) {
  const { deleteRequest } = useSession();
  const [busy, setBusy] = useState(false);
  if (!canDelete(r)) return null;
  return (
    <button
      type="button"
      className="linkish"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Delete request #${r.id}? You can send a new one any time.`)) return;
        setBusy(true);
        const res = await deleteRequest(r.id);
        setBusy(false);
        if (res.error) return window.alert(res.error);
        onDone?.();
      }}
    >
      {busy ? "Deleting…" : "Delete request"}
    </button>
  );
}

/** Re-check for a quote every 15s while something is waiting (only while the page is open). */
function useQuotePolling(active: boolean) {
  const { refreshRequests, live } = useSession();
  useEffect(() => {
    if (!active || !live) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refreshRequests();
    }, 15_000);
    return () => clearInterval(t);
  }, [active, live, refreshRequests]);
}

/** The popup after sending (and when opening a request): live status, quote, Pay, Delete. */
export function RequestDialog({ id, onClose, justSent = false }: { id: string; onClose: () => void; justSent?: boolean }) {
  const { requests } = useSession();
  const checkout = useCheckout();
  const r = requests.find((x) => x.id === id);
  const box = useRef<HTMLDivElement>(null);
  useQuotePolling(r?.status === "new");

  const close = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  return (
    <motion.div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rq-dlg-title"
        className="dlg"
        style={{ outline: "none" }}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <button className="x" onClick={close} aria-label="Close">
          ×
        </button>
        {!r ? (
          <>
            <div className="label">Request</div>
            <p className="muted" style={{ marginTop: 12 }}>
              This request was deleted.
            </p>
          </>
        ) : (
          <>
            <div className="label">{justSent && r.status === "new" ? "Request sent" : `Request #${r.id}`}</div>
            <h3 id="rq-dlg-title" className="h3" style={{ marginTop: 8 }}>
              {r.target}
            </h3>
            <p className="mono dim" style={{ fontSize: 12, marginTop: 6 }}>
              {r.request_type} · #{r.id}
            </p>
            {r.details && (
              <p className="muted" style={{ whiteSpace: "pre-line", marginTop: 12, fontSize: 15 }}>
                {r.details}
              </p>
            )}

            <div className="rq-state">
              <RequestStatus status={r.status} />
              {r.status === "new" && (
                <p className="muted">
                  <span className="rq-dot" aria-hidden="true" /> We&apos;re pricing it now. This window updates by itself when your quote is ready, and it&apos;s
                  saved in your account too.
                </p>
              )}
              {r.status === "quoted" && r.quote_amount != null && (
                <>
                  <div className="co-sum" style={{ margin: "14px 0 8px" }}>
                    <span className="mono dim" style={{ fontSize: 12, letterSpacing: ".12em" }}>
                      YOUR QUOTE{r.eta ? ` · READY IN ${r.eta.toUpperCase()}` : ""}
                    </span>
                    <b>
                      <Price amount={r.quote_amount} />
                    </b>
                  </div>
                  {r.admin_reply && <p className="muted">“{r.admin_reply}”</p>}
                  <button
                    className="btn btn-block"
                    style={{ marginTop: 14 }}
                    onClick={() => {
                      close();
                      checkout(payItem(r));
                    }}
                  >
                    Pay <Price amount={r.quote_amount} />
                  </button>
                </>
              )}
              {r.status === "declined" && <p className="muted">{r.admin_reply ? `“${r.admin_reply}”` : "We can't take this one, sorry."}</p>}
              {["accepted", "in_progress", "completed"].includes(r.status) && (
                <p className="muted">{r.eta && r.status !== "completed" ? `Expected in ${r.eta}. ` : ""}Track it in your account.</p>
              )}
            </div>

            <div className="rq-actions">
              <DeleteButton r={r} onDone={close} />
              <Link className="linkish" href="/account" onClick={close}>
                My account
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function RequestRow({ r }: { r: CustomRequest }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="req">
      <span className="id">#{r.id}</span>
      <div>
        <h3 className="h3" style={{ fontSize: 18 }}>
          <button type="button" className="rq-open" onClick={() => setOpen(true)}>
            {r.request_type} · {r.target}
          </button>
        </h3>
        {r.admin_reply ? <p>“{r.admin_reply}”</p> : r.details ? <p style={{ whiteSpace: "pre-line" }}>{r.details}</p> : null}
        {r.eta && r.status !== "completed" && <p className="mono dim" style={{ fontSize: 12 }}>Ready in {r.eta}</p>}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <RequestStatus status={r.status} />
        {r.status === "quoted" && r.quote_amount != null && (
          <BuyButton className="btn sm" item={payItem(r)}>
            Pay <Price amount={r.quote_amount} />
          </BuyButton>
        )}
        <DeleteButton r={r} />
      </div>
      <AnimatePresence>{open && <RequestDialog id={r.id} onClose={() => setOpen(false)} />}</AnimatePresence>
    </div>
  );
}

/** Logged-in users see their requests and quote status (refreshing while one is waiting). */
export function PastRequests() {
  const { user, requests } = useSession();
  // (an admin's session holds everyone's requests — show only your own here)
  const mine = requests.filter((r) => !user?.id || !r.user_id || r.user_id === user.id);
  useQuotePolling(!!user && mine.some((r) => r.status === "new"));
  if (!user || !mine.length) return null;
  return (
    <section className="sec" aria-labelledby="past-h">
      <div className="head">
        <Reveal>
          <h2 id="past-h" className="label">
            Your requests
          </h2>
        </Reveal>
      </div>
      <Reveal className="reqlist">
        {mine.map((r) => (
          <RequestRow key={r.id} r={r} />
        ))}
      </Reveal>
    </section>
  );
}
