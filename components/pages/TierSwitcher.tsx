"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Period, SubscriptionTier } from "@/lib/types";
import { CurrencySwitch, Price } from "../providers/Currency";
import { BuyButton } from "../providers/Checkout";
import { useSettings } from "../providers/Settings";
import { ShardList } from "../ShardBullet";
import { Reveal } from "../ui";

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function TierSwitcher({ tiers }: { tiers: SubscriptionTier[] }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const settings = useSettings();
  const list = tiers.filter((t) => t.period === period);
  const per = period === "weekly" ? "/ week" : "/ month";

  // "≈ X% less than weekly" — computed from the recommended tiers so it stays true when prices change
  const recW = tiers.find((t) => t.period === "weekly" && t.recommended);
  const recM = tiers.find((t) => t.period === "monthly" && t.recommended);
  const saving = recW && recM ? Math.round((1 - recM.price / ((recW.price * 52) / 12)) * 100) : 0;

  const rows = Array.from(new Set(list.flatMap((t) => Object.keys(t.compare))));
  const recIndex = list.findIndex((t) => t.recommended);

  return (
    <>
      <div className="head-row" style={{ marginTop: -22, marginBottom: 44 }}>
        <Reveal delay={0.16} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div className="toggle" role="tablist" aria-label="Billing period">
            {(["weekly", "monthly"] as const).map((p) => (
              <button key={p} role="tab" aria-selected={period === p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>
                {period === p && <motion.span layoutId="knob" className="knob" transition={{ duration: 0.35, ease: [0.6, 0, 0.2, 1] }} />}
                {p}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {period === "monthly" && saving > 0 && (
              <motion.span key="save" className="save" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                ≈ {saving}% LESS THAN WEEKLY
              </motion.span>
            )}
          </AnimatePresence>
        </Reveal>
        <Reveal delay={0.2}>
          <CurrencySwitch />
        </Reveal>
      </div>

      <div className="tiers">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((t, i) => (
            <motion.article
              key={t.id}
              className={`panel tier ${t.recommended ? "rec" : ""}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
            >
              {t.recommended && <span className="ribbon">MOST PICKED</span>}
              <div className="tname">Tier 0{i + 1}</div>
              <h3 className="h3">{t.name}</h3>
              <p className="tag">{t.tagline}</p>
              <div className="price">
                <b>
                  <Price amount={t.price} from={t.currency} />
                </b>
                <span>{per}</span>
              </div>
              <ShardList element="thunder" items={t.features} />
              <BuyButton
                className={`btn ${t.recommended ? "" : "ghost"}`}
                item={{
                  kind: "subscription",
                  id: t.id,
                  name: `${t.name} — ${period}`,
                  description: `${period === "weekly" ? "Renews weekly" : "Renews monthly"}. Cancel anytime from your account.`,
                  price: t.price,
                  currency: t.currency,
                  period,
                  whopPlanId: t.whop_plan_id,
                  patreonJoinUrl: settings.patreon_enabled && t.patreon_enabled ? t.patreon_join_url : null,
                }}
              >
                Subscribe
              </BuyButton>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <section className="sec" style={{ marginTop: 110 }} aria-labelledby="cmp-h">
        <div className="head">
          <Reveal>
            <h2 id="cmp-h" className="label">
              Compare plans · {period}
            </h2>
          </Reveal>
        </div>
        <Reveal className="cmpwrap">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Feature</span>
                </th>
                {list.map((t) => (
                  <th key={t.id} scope="col" className={t.recommended ? "hl" : ""}>
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Price</td>
                {list.map((t) => (
                  <td key={t.id} className={t.recommended ? "hl" : ""}>
                    <Price amount={t.price} from={t.currency} /> {per}
                  </td>
                ))}
              </tr>
              {rows.map((r) => (
                <tr key={r}>
                  <td>{r}</td>
                  {list.map((t, i) => (
                    <td key={t.id} className={i === recIndex ? "hl" : ""}>
                      {t.compare[r] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </section>
    </>
  );
}
