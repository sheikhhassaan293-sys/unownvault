"use client";

/**
 * Personal offers from the owner (Admin → Members). The moment one is sent, it pops up for that
 * member: title, description, price, Pay. "Maybe later" hides the popup on this device, and the
 * offer stays in their requests until they pay or the owner removes it (then it disappears here too).
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomRequest } from "@/lib/types";
import { useCheckout } from "./providers/Checkout";
import { Price } from "./providers/Currency";
import { useSession } from "./providers/Session";

const KEY = "uv-offers-seen";
const seenIds = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const markSeen = (id: string) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...seenIds().filter((x) => x !== id)].slice(0, 100)));
  } catch {}
};

export function OfferPopup() {
  const { user, requests } = useSession();
  const checkout = useCheckout();
  const [seen, setSeen] = useState<string[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read what this device already dismissed
    setSeen(seenIds());
  }, []);

  if (!user || seen === null) return null;
  // only this member's own, still-unpaid offers (the admin account holds everyone's)
  const offer: CustomRequest | undefined = requests.find((r) => r.is_offer && r.status === "quoted" && r.user_id === user.id && !seen.includes(r.id));

  const close = (id: string) => {
    markSeen(id);
    setSeen((s) => [...(s ?? []), id]);
  };

  return createPortal(
    <AnimatePresence>
      {offer && offer.quote_amount != null && (
        <motion.div key={offer.id} className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close(offer.id)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-title"
            className="dlg offer-dlg"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <button className="x" onClick={() => close(offer.id)} aria-label="Close">
              ×
            </button>
            <div className="label">✨ A special offer for you</div>
            <h3 id="offer-title" className="h3" style={{ margin: "10px 0 8px", fontSize: 24 }}>
              {offer.target}
            </h3>
            {offer.details && (
              <p className="muted" style={{ whiteSpace: "pre-line" }}>
                {offer.details}
              </p>
            )}
            <div className="co-sum" style={{ margin: "18px 0 6px" }}>
              <span className="mono dim" style={{ fontSize: 12, letterSpacing: ".1em" }}>
                YOUR PRICE{offer.eta ? ` · READY IN ${offer.eta.toUpperCase()}` : ""}
              </span>
              <b>
                <Price amount={offer.quote_amount} />
              </b>
            </div>
            <button
              className="btn btn-block"
              style={{ marginTop: 12 }}
              onClick={() => {
                close(offer.id);
                checkout({
                  kind: "custom",
                  id: offer.id,
                  name: offer.target,
                  description: offer.details || "Special offer",
                  price: offer.quote_amount ?? 0,
                  currency: "USD",
                });
              }}
            >
              Pay <Price amount={offer.quote_amount} />
            </button>
            <button className="btn ghost btn-block" style={{ marginTop: 8 }} onClick={() => close(offer.id)}>
              Maybe later
            </button>
            <p className="help" style={{ textAlign: "center", marginTop: 10 }}>
              It stays in your account under “Your requests” if you change your mind.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
