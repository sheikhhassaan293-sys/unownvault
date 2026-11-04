"use client";

/**
 * Checkout drawer — Phase 1 mock of the Phase 2 flow:
 *   one "Pay" button → Whop embedded checkout (renders inside this dialog)
 *   small secondary links → "Pay with Patreon" (monthly tiers, if enabled) / "Other payment methods" (manual, if enabled)
 */
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CheckoutItem } from "@/lib/payments/types";
import { useMoney } from "./Currency";
import { useSettings } from "./Settings";
import { useToast } from "./Toast";

type Step = "summary" | "whop" | "manual" | "manual-done";
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
  return (
    <button type="button" className={className} onClick={() => open(item)}>
      {children}
    </button>
  );
}

function CheckoutDialog({ item, step, setStep, onClose }: { item: CheckoutItem; step: Step; setStep: (s: Step) => void; onClose: () => void }) {
  const settings = useSettings();
  const { money, exact, currency } = useMoney();
  const toast = useToast();
  const box = useRef<HTMLDivElement>(null);
  const [txn, setTxn] = useState("");
  const [proof, setProof] = useState<File | null>(null);

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

  const showPatreon = settings.patreon_enabled && item.period === "monthly" && !!item.patreonJoinUrl;
  const showManual = settings.manual_payments_enabled;
  const total = money(item.price, item.currency);
  const charged = exact(item.price, item.currency);

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
        className="dlg"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
        style={{ outline: "none" }}
      >
        <button className="x" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="label">Checkout</div>
        <h3 id="co-title" className="h3">
          {item.name}
        </h3>
        <p className="s">{item.description}</p>
        <div className="co-sum">
          <span className="mono dim" style={{ fontSize: 12, letterSpacing: ".12em" }}>
            {item.priceIsFrom ? "FROM" : "TOTAL"}
            {item.period ? ` / ${item.period === "weekly" ? "WEEK" : "MONTH"}` : ""}
          </span>
          <b>{total}</b>
        </div>
        {currency !== item.currency && (
          <p className="mono dim" style={{ fontSize: 12, marginTop: -8, marginBottom: 16 }}>
            Charged in {item.currency}: {charged}. Display currency is an estimate.
          </p>
        )}

        {step === "summary" && (
          <>
            <div className="paychips">
              <span>CARD</span>
              <span>APPLE PAY</span>
              <span>GOOGLE PAY</span>
              <span>PAYPAL</span>
              <span>CRYPTO</span>
            </div>
            <button className="btn block" onClick={() => setStep("whop")}>
              Pay {charged}
            </button>
            {(showPatreon || showManual) && (
              <div className="alt-pay">
                {showPatreon && (
                  <button className="linkish" onClick={() => toast("Demo: opens this tier's Patreon join page")}>
                    Pay with Patreon
                  </button>
                )}
                {showManual && (
                  <button className="linkish" onClick={() => setStep("manual")}>
                    Other payment methods
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {step === "whop" && (
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
            <button className="btn ghost sm" onClick={() => setStep("summary")}>
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
              setStep("manual-done");
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
            <button className="btn block" type="submit">
              Submit for confirmation
            </button>
            <button type="button" className="linkish" onClick={() => setStep("summary")}>
              ← Back to card checkout
            </button>
          </form>
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
