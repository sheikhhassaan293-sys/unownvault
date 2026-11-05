"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cooldownText, type Cooldown, type CustomRequest } from "@/lib/types";
import { CooldownQuestion } from "../Cooldown";
import { BuyButton } from "../providers/Checkout";
import { Price } from "../providers/Currency";
import { useSession } from "../providers/Session";
import { Link } from "../providers/Transition";
import { useOrdersOpen } from "../providers/Settings";
import { Reveal } from "../ui";

export const REQUEST_TYPES = ["Shundo hunt", "Shiny hunt", "Stardust", "XP / levelling", "Raids", "Grunt boosting", "Event package", "Something else"];
const XP_TYPE = "XP / levelling";

type Errors = Partial<Record<"target" | "details" | "budget" | "discord" | "cur" | "want" | "xp" | "cooldown", string>>;

export function RequestForm() {
  const { user, sendRequest } = useSession();
  const ordersOpen = useOrdersOpen();
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<CustomRequest | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [type, setType] = useState(REQUEST_TYPES[0]);
  const [target, setTarget] = useState("");
  const [cooldown, setCooldown] = useState<Cooldown | null>(null);
  const isXp = type === XP_TYPE;

  // "Get a quote" on the services page links here with ?type=…&item=…
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("type");
    /* eslint-disable react-hooks/set-state-in-effect -- read the link's query once after hydration */
    if (t && REQUEST_TYPES.includes(t)) setType(t);
    const item = q.get("item");
    if (item) setTarget(item.slice(0, 80));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle tied to the chosen file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const errs: Errors = {};
    if (!v("target")) errs.target = "What are we hunting?";
    if (isXp) {
      const lvl = (k: string) => /^\d{1,2}$/.test(v(k)) && Number(v(k)) >= 1 && Number(v(k)) <= 80;
      if (!lvl("cur")) errs.cur = "Your level now, e.g. 38";
      if (!lvl("want")) errs.want = "The level you want, e.g. 42";
      else if (lvl("cur") && Number(v("want")) <= Number(v("cur"))) errs.want = "Must be higher than your current level";
      if (!v("xp")) errs.xp = "How much XP? e.g. 5,000,000";
    }
    if (!cooldown) errs.cooldown = "Pick one";
    if (v("details").length < 10 && !isXp) errs.details = "A few more words, please";
    if (v("budget") && !/^\d+(\.\d{1,2})?$/.test(v("budget"))) errs.budget = "Numbers only, e.g. 40";
    if (!/^[a-z0-9_.]{2,32}$/i.test(v("discord"))) errs.discord = "Your Discord username, e.g. nighthunter7";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`rq-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    // the extra answers travel inside the request's details, so they show everywhere the request does
    const extra = [
      isXp ? `Current level: ${v("cur")} · Wants level: ${v("want")} · XP wanted: ${v("xp")}` : "",
      cooldownText(cooldown),
    ].filter(Boolean);
    const details = [v("details"), ...extra].filter(Boolean).join("\n");
    setBusy(true);
    setSendError(null);
    let req: CustomRequest;
    try {
      req = await sendRequest({
      request_type: v("type"),
      target: v("target"),
      details,
      budget: v("budget") ? Number(v("budget")) : null,
      deadline: v("deadline") || null,
      discord_username: v("discord"),
      image: file,
      });
    } catch (e) {
      setBusy(false);
      setSendError(e instanceof Error ? e.message : "Something went wrong — try again");
      return;
    }
    setBusy(false);
    setDone(req);
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <span className="err" id={`rq-${k}-err`}>
        {errors[k]}
      </span>
    ) : null;
  const a11y = (k: keyof Errors) => ({ id: `rq-${k}`, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `rq-${k}-err` : undefined });

  if (!ordersOpen && !done) {
    return (
      <div className="ok" role="status">
        <div className="label">Orders paused</div>
        <h3 className="h3">Back soon.</h3>
        <p>We&apos;re not taking new requests right now. Join our Discord to hear the moment we reopen.</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <motion.div key="ok" className="ok" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} role="status">
          <div className="label">Request received</div>
          <h3 className="h3">We&apos;re on it.</h3>
          <p>
            Request <span className="mono acc">#{done.id}</span> is in. Expect a quote on Discord within 24 hours — you only pay once you accept it.
          </p>
          <p style={{ marginTop: 14 }}>
            {user ? (
              <>You can follow it below and in your account.</>
            ) : (
              <>
                <Link className="linkish" href="/signup">
                  Create an account
                </Link>{" "}
                to track quotes here.
              </>
            )}
          </p>
          <button className="btn ghost sm" style={{ marginTop: 20 }} onClick={() => setDone(null)}>
            Send another
          </button>
        </motion.div>
      ) : (
        <motion.form key="form" className="form" onSubmit={onSubmit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="f">
            <label htmlFor="rq-type">Request type</label>
            <select id="rq-type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {REQUEST_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="f">
            <label htmlFor="rq-target">Target / quantity</label>
            <input
              name="target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={isXp ? "e.g. Level 38 → 42" : type === "Grunt boosting" ? "e.g. 20 grunts, Shadow Ralts" : "e.g. 3 targets, or 2M dust"}
              {...a11y("target")}
            />
            {err("target")}
          </div>
          {isXp && (
            <>
              <div className="f">
                <label htmlFor="rq-cur">Current level</label>
                <input name="cur" inputMode="numeric" placeholder="e.g. 38" {...a11y("cur")} />
                {err("cur")}
              </div>
              <div className="f">
                <label htmlFor="rq-want">Level you want</label>
                <input name="want" inputMode="numeric" placeholder="e.g. 42" {...a11y("want")} />
                {err("want")}
              </div>
              <div className="f full">
                <label htmlFor="rq-xp">How much XP do you want?</label>
                <input name="xp" placeholder="e.g. 5,000,000" {...a11y("xp")} />
                {err("xp")}
                <span className="help">We&apos;ll send you a quote for this — you only pay once you accept it.</span>
              </div>
            </>
          )}
          <div className="f full" id="rq-cooldown" tabIndex={-1}>
            <CooldownQuestion value={cooldown} onChange={setCooldown} idPrefix="rq-cd" />
            {err("cooldown")}
          </div>
          <div className="f full">
            <label htmlFor="rq-details">{isXp ? "Anything else? (optional)" : "Details"}</label>
            <textarea name="details" placeholder="What do you need, and anything we should know?" {...a11y("details")} />
            {err("details")}
          </div>
          <div className="f">
            <label htmlFor="rq-deadline">Deadline</label>
            <input id="rq-deadline" name="deadline" type="date" />
          </div>
          <div className="f">
            <label htmlFor="rq-budget">Budget (USD)</label>
            <input name="budget" inputMode="decimal" placeholder="e.g. 40" {...a11y("budget")} />
            {err("budget")}
          </div>
          <div className="f">
            <label htmlFor="rq-discord">Discord username</label>
            <input name="discord" placeholder="yourname" autoComplete="off" autoCapitalize="off" {...a11y("discord")} />
            {err("discord")}
          </div>
          <div className="f">
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
            <button className="btn btn-block" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

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

export function RequestRow({ r }: { r: CustomRequest }) {
  return (
    <div className="req">
      <span className="id">#{r.id}</span>
      <div>
        <h3 className="h3" style={{ fontSize: 18 }}>
          {r.request_type} · {r.target}
        </h3>
        {r.admin_reply ? <p>“{r.admin_reply}”</p> : <p>{r.details}</p>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <RequestStatus status={r.status} />
        {r.status === "quoted" && r.quote_amount != null && (
          <BuyButton
            className="btn sm"
            item={{ kind: "custom", id: r.id, name: `Custom request #${r.id}`, description: `${r.request_type} · ${r.target}. Quoted price.`, price: r.quote_amount, currency: "USD" }}
          >
            Pay <Price amount={r.quote_amount} />
          </BuyButton>
        )}
      </div>
    </div>
  );
}

/** Logged-in users see their past requests and quote status. */
export function PastRequests() {
  const { user, requests } = useSession();
  if (!user) return null;
  const all = requests;
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
        {all.map((r) => (
          <RequestRow key={r.id} r={r} />
        ))}
      </Reveal>
    </section>
  );
}
