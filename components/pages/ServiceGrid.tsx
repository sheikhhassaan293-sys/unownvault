"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useState } from "react";
import type { ServiceCategory } from "@/lib/types";
import { useContent, useOrdersOpen, visible } from "../providers/Settings";
import { BuyButton } from "../providers/Checkout";
import { Price } from "../providers/Currency";
import { ShardBullet } from "../ShardBullet";

/** Which priority tabs a service's checkout shows (shiny / shundo / hundo hunts). */
function priorityKindsFor(category: string, name: string): ("shiny" | "shundo" | "hundo")[] | undefined {
  const n = name.toLowerCase();
  if (category === "shundo" || n.includes("shundo")) return ["shundo"];
  if (n.includes("hundo")) return ["hundo"];
  if (category === "shiny" || n.includes("shiny")) return ["shiny"];
  return undefined;
}

export function ServiceGrid() {
  const { content } = useContent();
  const ordersOpen = useOrdersOpen();
  const services = visible(content.services);
  const categories = content.categories;
  const [cat, setCat] = useState<ServiceCategory | "all">("all");
  const used = categories.filter((c) => services.some((s) => s.category === c.slug));
  const label = (slug: ServiceCategory) => categories.find((c) => c.slug === slug)?.label ?? slug;
  const shown = services.filter((s) => cat === "all" || s.category === cat);

  return (
    <LayoutGroup>
      <div className="chips" role="group" aria-label="Filter by category" style={{ marginBottom: 28 }}>
        <button className={`chip ${cat === "all" ? "on" : ""}`} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          All
        </button>
        {used.map((c) => (
          <button key={c.slug} className={`chip ${cat === c.slug ? "on" : ""}`} aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)}>
            {c.label}
          </button>
        ))}
      </div>

      <motion.div layout className="sgrid">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((s, i) => {
            const feat = s.featured && cat === "all";
            return (
              <motion.article
                layout
                key={s.id}
                className={`panel svc ${feat ? "feat" : ""}`}
                style={{ position: "relative" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
                whileHover={{ y: -4 }}
              >
                {feat && (
                  <svg className="feat-mark" viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M16 2 29 9.5v13L16 30 3 22.5v-13z" fill="none" stroke="currentColor" strokeWidth="1" />
                    <path d="M16 8 23.5 12.3v7.4L16 24l-7.5-4.3v-7.4z" fill="currentColor" />
                  </svg>
                )}
                <div className="cat">
                  <ShardBullet element="lava" />
                  {feat ? `Featured · ${label(s.category)}` : label(s.category)}
                </div>
                <h3 className="h3">{s.name}</h3>
                <p>{s.description}</p>
                <div className="meta">
                  {ordersOpen ? (
                    <div className="pp">
                      <small>
                        {s.price_is_from ? "From" : "Price"} · {s.delivery_time}
                      </small>
                      <b>
                        <Price amount={s.price} from={s.currency} />
                      </b>
                    </div>
                  ) : (
                    <div className="pp">
                      <small>Delivery</small>
                      <span className="mono" style={{ fontSize: 13, whiteSpace: "nowrap", display: "block" }}>{s.delivery_time}</span>
                    </div>
                  )}
                  <BuyButton
                    className={`btn sm ${feat ? "" : "ghost"}`}
                    item={{
                      kind: "service",
                      id: s.id,
                      name: s.name,
                      description: `One-off order · delivery ${s.delivery_time}.${s.price_is_from ? " Final price confirmed before we start." : ""}`,
                      price: s.price,
                      currency: s.currency,
                      priceIsFrom: s.price_is_from,
                      whopPlanId: s.whop_plan_id,
                      priorityKinds: priorityKindsFor(s.category, s.name),
                    }}
                  >
                    Order
                  </BuyButton>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
