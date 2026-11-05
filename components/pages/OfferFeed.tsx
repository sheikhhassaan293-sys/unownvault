"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { Offer } from "@/lib/types";
import { BuyButton } from "../providers/Checkout";
import { Price } from "../providers/Currency";
import { useContent, useOrdersOpen } from "../providers/Settings";
import { useNow } from "../ui";

const pad = (n: number) => String(n).padStart(2, "0");
const D = 86_400_000, H = 3_600_000, M = 60_000;

function split(ms: number) {
  ms = Math.max(0, ms);
  const d = Math.floor(ms / D);
  ms -= d * D;
  const h = Math.floor(ms / H);
  ms -= h * H;
  const m = Math.floor(ms / M);
  const s = Math.floor((ms - m * M) / 1000);
  return { d, h, m, s };
}

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();

function Glyph() {
  return (
    <svg className="glyph" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 1.5v7M16 23.5v7M1.5 16h7M23.5 16h7M5.7 5.7l5 5M21.3 21.3l5 5M26.3 5.7l-5 5M10.7 21.3l-5 5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Uploaded event image, or an engraved plate when there isn't one. */
function OfferImage({ offer, small, tag }: { offer: Offer; small?: boolean; tag?: string }) {
  const seed = offer.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div className={`plate ${small ? "small" : ""}`} style={{ ["--px" as string]: `${30 + (seed % 50)}%` }}>
      {offer.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin uploads come from Supabase storage in Phase 2
        <img src={offer.image_url} alt="" loading="lazy" />
      ) : (
        <Glyph />
      )}
      {tag && <span className="ptag">{tag}</span>}
    </div>
  );
}

export function OfferFeed() {
  const { content, ready } = useContent();
  const ordersOpen = useOrdersOpen();
  const offers = content.offers.filter((o) => o.published);
  const now = useNow(1000);

  const live = useMemo(() => {
    if (now == null) return null;
    return offers
      .map((o) => ({ o, start: Date.parse(o.starts_at), end: Date.parse(o.ends_at) }))
      .filter((x) => x.start <= now && x.end > now)
      .sort((a, b) => Number(b.o.pinned) - Number(a.o.pinned) || b.start - a.start);
  }, [offers, now]);

  if (live == null || !ready) return <div style={{ minHeight: 420 }} aria-busy="true" />;

  const [pin, ...rest] = live[0]?.o.pinned ? live : [null, ...live];

  return (
    <>
      <AnimatePresence>
        {pin && now != null && (
          <motion.article
            key={pin.o.id}
            className="panel pinned"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <OfferImage offer={pin.o} tag="PINNED · LIMITED" />
            <div className="pin-body">
              <div className="label">{fmtDate(pin.start)}</div>
              <h2 className="h3">{pin.o.title}</h2>
              <p>{pin.o.body}</p>
              <div className="cd" role="timer" aria-label="Time left">
                {Object.entries(split(pin.end - now)).map(([k, v]) => (
                  <div key={k}>
                    <b>{pad(v)}</b>
                    <small>{{ d: "DAYS", h: "HRS", m: "MIN", s: "SEC" }[k]}</small>
                  </div>
                ))}
              </div>
              <div className="pin-foot">
                <span className="pp">{ordersOpen ? <Price amount={pin.o.price} from={pin.o.currency} /> : null}</span>
                <BuyButton
                  item={{ kind: "offer", id: pin.o.id, name: pin.o.title, description: "Limited offer. Ends when the timer does.", price: pin.o.price, currency: pin.o.currency, whopPlanId: pin.o.whop_plan_id }}
                >
                  Order this
                </BuyButton>
              </div>
            </div>
          </motion.article>
        )}
      </AnimatePresence>

      <div className="feed">
        <AnimatePresence initial={false}>
          {rest.map((x, i) => {
            if (!x) return null;
            const t = split(x.end - now!);
            return (
              <motion.article
                key={x.o.id}
                className="post"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <OfferImage offer={x.o} small />
                <span className="date">{fmtDate(x.start)}</span>
                <div>
                  <h2 className="h3">{x.o.title}</h2>
                  <p>{x.o.body}</p>
                </div>
                <div className="left" role="timer">
                  <small>ENDS IN</small>
                  {t.d ? `${t.d}d ${pad(t.h)}h ${pad(t.m)}m` : `${pad(t.h)}h ${pad(t.m)}m ${pad(t.s)}s`}
                </div>
                <div className="act">
                  <span className="pp">{ordersOpen ? <Price amount={x.o.price} from={x.o.currency} /> : null}</span>
                  <BuyButton
                    className="btn sm ghost"
                    item={{ kind: "offer", id: x.o.id, name: x.o.title, description: "Limited offer. Ends when the timer does.", price: x.o.price, currency: x.o.currency, whopPlanId: x.o.whop_plan_id }}
                  >
                    Order
                  </BuyButton>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
        {live.length === 0 && <p className="empty">No live offers right now. New drops land here and on Discord first.</p>}
      </div>
    </>
  );
}
