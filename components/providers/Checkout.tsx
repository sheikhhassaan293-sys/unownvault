"use client";

/**
 * Checkout dialog:
 *   quantity (−/+) where allowed, the cooldown question on one-off orders,
 *   one "Pay" button → Whop's hosted checkout
 *   small secondary link → "Other payment methods" (manual, if enabled)
 */
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CheckoutItem } from "@/lib/payments/types";
import { useMoney } from "./Currency";
import { useOrdersOpen, useSettings } from "./Settings";
import { newId, useSession } from "./Session";
import { useThemedNavigate } from "./Transition";
import { createCheckout } from "@/app/actions";
import { PriorityPicker, PrioritySummary, usePokedex } from "../PriorityPicker";
import { sb } from "@/lib/supabase/browser";
import type { Cooldown } from "@/lib/types";
import { CooldownQuestion, QuantityStepper } from "../Cooldown";

type Step = "summary" | "whop" | "manual" | "manual-done" | "success" | "signin" | "priorities";
const CheckoutCtx = createContext<(item: CheckoutItem) => void>(() => {});
export const useCheckout = () => useContext(CheckoutCtx);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<CheckoutItem | null>(null);
  const [step, setStep] = useState<Step>("summary");
  const open = useCallback((i: CheckoutItem) => {
    setItem(i);
    setStep("summary");
  }, []);
  const close = useCallback(() => setItem(null), []);

  return (
    <CheckoutCtx.Provider value={open}>
      {children}
      <AnimatePresence>{item && <CheckoutDialog key={item.id} item={item} step={step} setStep={setStep} onClose={close} />}</AnimatePresence>
    </CheckoutCtx.Provider>
  );
}

/** Use from server components: `<BuyButton item={...}>Order</BuyButton>` */
export function BuyButton({ item, className = "btn", children }: { item: CheckoutItem; className?: string; children: React.ReactNode }) {
  const open = useCheckout();
  const ordersOpen = useOrdersOpen();
  if (!ordersOpen) {
    return (
      <button type="button" className={`${className.replace(/\bghost\b/, "")} ghost`} disabled aria-disabled="true" title="Orders are paused right now">
        Orders paused
      </button>
    );
  }
  return (
    <button type="button" className={className} onClick={() => open(item)}>
      {children}
    </button>
  );
}

function CheckoutDialog({ item, step, setStep, onClose }: { item: CheckoutItem; step: Step; setStep: (s: Step) => void; onClose: () => void }) {
  const settings = useSettings();
  const { money, exact, currency } = useMoney();
  const box = useRef<HTMLDivElement>(null);
  const [txn, setTxn] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const { user, addOrder, updateRequest, live, reload, priorities, savePriorities } = useSession();
  const { nameOf } = usePokedex();
  const [starting, setStarting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [cooldown, setCooldown] = useState<Cooldown | null>(null);
  const maxQty = item.allowQuantity ? Math.max(1, item.maxQuantity ?? 20) : 1;
  const units = Math.min(qty, maxQty);
  // every one-off order asks about the buyer's cooldown (custom quotes already asked on the request form)
  const asksCooldown = item.kind === "service" || item.kind === "offer";
  const needsCooldown = asksCooldown && !cooldown;
  const amount = Math.round(item.price * units * 100) / 100;
  const extras = { quantity: units, cooldown: asksCooldown ? cooldown : null, guestKey: item.guestKey ?? null };
  const guestPay = item.kind === "custom" && !!item.guestKey;

  /**
   * Live: ask the server for a Whop checkout for this item, then send the buyer to Whop's
   * secure checkout page. Whop sends them back to /checkout/success when they've paid.
   */
  async function startWhop() {
    if (!live) return setStep("whop");
    if (!user && !guestPay) return setStep("signin");
    setStarting(true);
    setPayError(null);
    const r = await createCheckout(item.kind, item.id, `${window.location.origin}/checkout/success`, extras);
    if (!r.ok) {
      setStarting(false);
      return r.error === "signin" ? setStep("signin") : setPayError(r.error);
    }
    if (!r.purchaseUrl) {
      setStarting(false);
      return setPayError("Couldn't open checkout — please try again or message us on Discord.");
    }
    try {
      sessionStorage.setItem("uv-checkout", JSON.stringify({ name: units > 1 ? `${item.name} ×${units}` : item.name, kind: item.kind, startedAt: Date.now() }));
    } catch {}
    window.location.href = r.purchaseUrl;
  }

  /** Live manual payment: upload the screenshot privately, then create an "awaiting confirmation" order. */
  async function submitManual() {
    setStarting(true);
    setPayError(null);
    const db = sb();
    let proofPath: string | null = null;
    if (proof) {
      const path = `proofs/${crypto.randomUUID()}.${(proof.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const up = await db.storage.from("request-images").upload(path, proof, { contentType: proof.type });
      if (!up.error) proofPath = path;
    }
    const { data, error } = await db.rpc("submit_manual_payment", {
      p_kind: item.kind,
      p_item_id: item.id,
      p_txn: txn.trim(),
      p_proof_path: proofPath,
      p_quantity: units,
      p_cooldown: extras.cooldown,
    });
    setStarting(false);
    if (error) return setPayError(error.message);
    setOrderId(String(data));
    reload();
    setStep("manual-done");
  }

  const navigate = useThemedNavigate();

  /** Phase 2: this runs from Whop's onComplete callback; the webhook makes it official server-side. */
  function recordOrder(status: "pending" | "awaiting_confirmation" | "completed", provider: "whop" | "manual") {
    const id = newId();
    addOrder({
      id,
      user_id: user?.username ?? "guest",
      type: item.kind,
      item_id: item.id,
      item_name: units > 1 ? `${item.name} ×${units}` : item.name,
      amount,
      currency: item.currency,
      status,
      provider,
      payment_method: provider === "manual" ? "manual" : "card",
      transaction_ref: provider === "manual" ? txn : null,
      external_payment_id: null,
      proof_url: null,
      created_at: new Date().toISOString(),
      priorities,
      quantity: units,
      cooldown: extras.cooldown,
    });
    if (item.kind === "custom") updateRequest(item.id, { status: status === "awaiting_confirmation" ? "accepted" : "in_progress" });
    setOrderId(id);
  }
  const isSub = item.kind === "subscription";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const showManual = settings.manual_payments_enabled;
  const total = money(amount, item.currency);
  const charged = exact(amount, item.currency);

  return (
    <motion.div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="co-title"
        className={`dlg ${step === "priorities" ? "wide" : ""}`}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
        style={{ outline: "none" }}
      >
        <button className="x" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="label">{step === "success" ? "Done" : "Checkout"}</div>
        <h3 id="co-title" className="h3">
          {item.name}
        </h3>
        {step !== "success" && <p className="s">{item.description}</p>}
        {step !== "success" && (
        <div className="co-sum">
          <span className="mono dim" style={{ fontSize: 12, letterSpacing: ".12em" }}>
            {item.priceIsFrom ? "FROM" : "TOTAL"}
            {units > 1 ? ` · ${units} × ${money(item.price, item.currency)}` : ""}
            {item.period ? ` / ${item.period === "weekly" ? "WEEK" : "MONTH"}` : ""}
          </span>
          <b>{total}</b>
        </div>
        )}
        {currency !== item.currency && step !== "success" && (
          <p className="mono dim" style={{ fontSize: 12, marginTop: -8, marginBottom: 16 }}>
            Charged in {item.currency}: {charged}. Display currency is an estimate.
          </p>
        )}

        {step === "priorities" && (
          <PriorityPicker
            value={priorities}
            focus={item.priorityKinds}
            includes={item.priorityIncludes}
            onCancel={() => setStep("summary")}
            onSave={async (p) => {
              const r = await savePriorities(p);
              if (!r.error) setStep("summary");
              return r;
            }}
          />
        )}

        {step === "summary" && (
          <>
            {item.priorityKinds?.length ? (
              <div className="pri-box">
                <div className="head-row" style={{ alignItems: "center", gap: 10 }}>
                  <span className="mono dim" style={{ fontSize: 11, letterSpacing: ".14em" }}>
                    YOUR PRIORITY POKÉMON
                  </span>
                  <button className="linkish" onClick={() => (live && !user ? setStep("signin") : setStep("priorities"))}>
                    {item.priorityKinds.some((k) => priorities[k]?.length) ? "Edit" : "Choose"}
                  </button>
                </div>
                <PrioritySummary value={Object.fromEntries(item.priorityKinds.map((k) => [k, priorities[k] ?? []]))} nameOf={nameOf} />
              </div>
            ) : null}
            {item.allowQuantity && (
              <div className="qty-row">
                <span className="mono dim" style={{ fontSize: 11, letterSpacing: ".14em" }}>
                  HOW MANY?
                </span>
                <QuantityStepper value={units} max={maxQty} onChange={setQty} />
              </div>
            )}
            {asksCooldown && <CooldownQuestion value={cooldown} onChange={setCooldown} />}
            <div className="paychips">
              <span>CARD</span>
              <span>APPLE PAY</span>
              <span>GOOGLE PAY</span>
              <span>PAYPAL</span>
              <span>CRYPTO</span>
            </div>
            <button className="btn btn-block" disabled={settings.maintenance || starting || needsCooldown} onClick={startWhop}>
              {settings.maintenance
                ? "Checkout paused (maintenance)"
                : starting
                  ? "Opening secure checkout…"
                  : needsCooldown
                    ? "Answer the cooldown question first"
                    : `Pay ${charged}`}
            </button>
            {live && (
              <p className="mono dim" style={{ fontSize: 12, textAlign: "center", marginTop: 10 }}>
                You&apos;ll pay on Whop&apos;s secure page, then come straight back here.
              </p>
            )}
            {payError && (
              <p className="err mono" style={{ marginTop: 10, fontSize: 12, color: "#ff8a8a" }}>
                {payError}
              </p>
            )}
            {showManual && (
              <div className="alt-pay">
                <button className="linkish" disabled={needsCooldown} onClick={() => setStep("manual")}>
                  Other payment methods
                </button>
              </div>
            )}
          </>
        )}

        {step === "signin" && (
          <div className="stack">
            <p className="muted">Sign in first so your order shows up in your account and we can deliver it.</p>
            <button
              className="btn btn-block"
              onClick={() => {
                onClose();
                navigate("/login");
              }}
            >
              Log in
            </button>
            <button
              className="btn ghost btn-block"
              onClick={() => {
                onClose();
                navigate("/signup");
              }}
            >
              Create an account
            </button>
          </div>
        )}

        {step === "whop" && !live && (
          <div className="embed">
            <span className="acc">SECURE CHECKOUT · DEMO</span>
            <div className="fake">Card number</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="fake">MM / YY</div>
              <div className="fake">CVC</div>
            </div>
            <span>
              On the live site, Whop&apos;s checkout loads right here — cards, Apple Pay, Google Pay, PayPal and crypto. No payment is taken in
              this demo.
            </span>
            <button
              className="btn btn-block"
              onClick={() => {
                recordOrder(isSub ? "completed" : "pending", "whop");
                setStep("success");
              }}
            >
              Simulate a successful payment
            </button>
            <button className="linkish" onClick={() => setStep("summary")}>
              ← Back
            </button>
          </div>
        )}

        {step === "manual" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (txn.trim().length < 4) return;
              if (!live) {
                recordOrder("awaiting_confirmation", "manual");
                return setStep("manual-done");
              }
              if (!user) return setStep("signin");
              submitManual();
            }}
          >
            <div className="instructions">{settings.payment_instructions}</div>
            <div className="f">
              <label htmlFor="txn">Transaction ID</label>
              <input id="txn" value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="e.g. 0123456789" required minLength={4} />
            </div>
            <div className="f">
              <span className="flabel">Payment screenshot</span>
              <label className="file">
                <span className="tag">Upload</span>
                <span>{proof ? proof.name : "PNG or JPG"}</span>
                <input type="file" accept="image/*" hidden onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {payError && <span className="err">{payError}</span>}
            <button className="btn btn-block" type="submit" disabled={starting}>
              Submit for confirmation
            </button>
            <button type="button" className="linkish" onClick={() => setStep("summary")}>
              ← Back to card checkout
            </button>
          </form>
        )}

        {step === "success" && (
          <motion.div className="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }} role="status">
            <motion.svg viewBox="0 0 52 52" className="tick" aria-hidden="true">
              <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" />
              <motion.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.4 }} />
            </motion.svg>
            <h3 className="h3">Payment successful</h3>
            <div className="success-meta">
              <span className="mono dim">ORDER #{orderId}</span>
              <span className="badge solid">{isSub ? "Plan active" : "Pending delivery"}</span>
            </div>
            <p>
              {isSub
                ? "Your plan is live. Each hunt we deliver shows up in your account, and updates come to you on Discord."
                : "You're in the queue. We'll update you on Discord as we work — once it's delivered, mark it as received in your account."}
            </p>
            <div className="stack" style={{ marginTop: 18 }}>
              {user ? (
                <button
                  className="btn btn-block"
                  onClick={() => {
                    onClose();
                    navigate("/account");
                  }}
                >
                  View my orders
                </button>
              ) : (
                <button
                  className="btn btn-block"
                  onClick={() => {
                    onClose();
                    navigate("/signup");
                  }}
                >
                  Create an account to track it
                </button>
              )}
              <button className="btn ghost btn-block" onClick={onClose}>
                Done
              </button>
            </div>
          </motion.div>
        )}

        {step === "manual-done" && (
          <div className="ok">
            <div className="label">Awaiting confirmation</div>
            <h3 className="h3">Got it.</h3>
            <p>We&apos;ll confirm your payment and start the order — usually within a few hours. You&apos;ll see the status in your account.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
