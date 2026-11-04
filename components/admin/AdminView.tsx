"use client";

import { useEffect, useRef, useState } from "react";
import { COPY_FIELDS } from "@/lib/copy";
import type { Currency, CustomRequest, Faq, Offer, Order, Service, SiteSettings, SubscriptionTier } from "@/lib/types";
import { DISPLAY_CURRENCIES } from "../providers/Currency";
import { ORDER_STATUS, useSession } from "../providers/Session";
import { useContent, type SiteContent } from "../providers/Settings";
import { useToast } from "../providers/Toast";
import { Link } from "../providers/Transition";
import { FieldRow, type Field } from "./fields";
import { ListEditor } from "./ListEditor";

const TABS = ["Site & text", "Plans", "Services", "Offers", "FAQ", "Orders", "Requests", "Backup"] as const;
type Tab = (typeof TABS)[number];

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* ───────────── field lists (labels are what the owner sees) ───────────── */

const SITE_GROUPS: { title: string; fields: Field<SiteSettings>[] }[] = [
  {
    title: "Homepage",
    fields: [
      { key: "hero_eyebrow", label: "Small label above headline", type: "text" },
      { key: "hero_headline", label: "Headline (white line)", type: "text" },
      { key: "hero_headline_accent", label: "Headline (coloured line)", type: "text" },
      { key: "hero_tagline", label: "Tagline", type: "textarea" },
    ],
  },
  {
    title: "Status block (homepage)",
    fields: [
      { key: "queue_open", label: "Queue open", type: "bool", help: "Off shows “FULL — BACK SOON”." },
      { key: "status_payments", label: "Pay with", type: "text" },
      { key: "status_plans", label: "Plans", type: "text" },
      { key: "status_updates", label: "Updates", type: "text" },
    ],
  },
  {
    title: "Links & contact",
    fields: [
      { key: "discord_url", label: "Discord invite link", type: "text", help: "e.g. https://discord.gg/abc123" },
      { key: "contact_email", label: "Contact email", type: "text" },
    ],
  },
  {
    title: "Subscriptions",
    fields: [{ key: "availability_note", label: "Availability note under plans (shiny / shundo *)", type: "textarea" }],
  },
  {
    title: "Payments",
    fields: [
      { key: "patreon_enabled", label: "Show “Pay with Patreon” on monthly plans", type: "bool" },
      { key: "manual_payments_enabled", label: "Show “Other payment methods” (manual)", type: "bool" },
      { key: "payment_instructions", label: "Manual payment instructions", type: "textarea", help: "Shown to buyers who pick “Other payment methods”." },
    ],
  },
  {
    title: "Site status",
    fields: [{ key: "maintenance", label: "Maintenance mode", type: "bool", help: "Shows a banner on every page and pauses checkout." }],
  },
];

const tierFields: Field<SubscriptionTier>[] = [
    { key: "name", label: "Name", type: "text" },
    {
      key: "period",
      label: "Billing",
      type: "select",
      options: [
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
      ],
    },
    { key: "price", label: "Price (USD)", type: "number" },
    { key: "tagline", label: "One-line pitch", type: "text" },
    { key: "features", label: "Features — one per line", type: "lines", help: "Lines mentioning shiny or shundo get a * automatically." },
    { key: "compare", label: "Comparison table — “Row: value” per line", type: "kv", help: "e.g. Raids: 25. Use the same row names on every plan." },
    { key: "recommended", label: "Recommended (big card)", type: "bool" },
    { key: "active", label: "Visible on site", type: "bool" },
    { key: "whop_plan_id", label: "Whop plan ID", type: "text", help: "From your Whop dashboard, e.g. plan_XXXXXXXX. Needed to take payments." },
    { key: "patreon_enabled", label: "Allow Patreon", type: "bool", help: "Monthly plans only." },
    { key: "patreon_join_url", label: "Patreon join link", type: "text" },
];

const serviceFields = (cats: { slug: string; label: string }[]): Field<Service>[] => [
  { key: "name", label: "Name", type: "text" },
  { key: "category", label: "Category", type: "select", options: cats.map((c) => ({ value: c.slug, label: c.label })) },
  { key: "price", label: "Price (USD)", type: "number" },
  { key: "price_is_from", label: "Show as “from” price", type: "bool" },
  { key: "delivery_time", label: "Delivery time", type: "text", help: "e.g. 2–5 days" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "featured", label: "Featured (big card)", type: "bool" },
  { key: "popular", label: "Show in “Most ordered” on Home", type: "bool" },
  { key: "active", label: "Visible on site", type: "bool" },
  { key: "whop_plan_id", label: "Whop plan ID", type: "text" },
];

const offerFields: Field<Offer>[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "price", label: "Price (USD)", type: "number" },
  { key: "body", label: "Text", type: "textarea" },
  { key: "image_url", label: "Event image", type: "image" },
  { key: "starts_at", label: "Starts", type: "datetime" },
  { key: "ends_at", label: "Ends (countdown target — hides after this)", type: "datetime" },
  { key: "pinned", label: "Pinned (big card at top)", type: "bool" },
  { key: "published", label: "Published", type: "bool" },
  { key: "whop_plan_id", label: "Whop plan ID", type: "text" },
];

const faqFields: Field<Faq>[] = [
  { key: "question", label: "Question", type: "text", wide: true },
  { key: "answer", label: "Answer", type: "textarea" },
];

/* ───────────── view ───────────── */

export function AdminView() {
  const { content, save, reset, edited, ready } = useContent();
  const { orders, updateOrder, requests, updateRequest } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("Site & text");
  const [savedAt, setSavedAt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const t = sessionStorage.getItem("uv-admin-tab") as Tab | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- remember the open tab
      if (t && TABS.includes(t)) setTab(t);
    } catch {}
  }, []);
  const pick = (t: Tab) => {
    setTab(t);
    try {
      sessionStorage.setItem("uv-admin-tab", t);
    } catch {}
  };

  const commit = (next: SiteContent) => {
    save(next);
    setSavedAt(true);
  };
  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => commit({ ...content, [k]: v });
  const setSetting = (k: keyof SiteSettings, v: unknown) => set("settings", { ...content.settings, [k]: v } as SiteSettings);

  if (!ready) return <div style={{ minHeight: "70vh" }} />;

  return (
    <div className="page admin">
      <div className="head">
        <div className="label">Admin</div>
        <div className="head-row">
          <h1 className="h2">Run the vault.</h1>
          <span className="mono dim" style={{ fontSize: 12 }} aria-live="polite">
            {savedAt ? "✓ Saved — live on the site" : "Changes save as you type"}
          </span>
        </div>
        <p className="demo-note">
          <b>Demo:</b> edits are saved in this browser only, so other people won&apos;t see them yet. Once the database is connected (Phase 2), this page is locked to
          your admin login and every change goes live for all visitors.
        </p>
      </div>

      <nav className="atabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "on" : ""} aria-pressed={tab === t} onClick={() => pick(t)}>
            {t}
            {t === "Orders" && orders.some((o) => o.status === "pending" || o.status === "awaiting_confirmation") && <i className="dot" />}
            {t === "Requests" && requests.some((r) => r.status === "new") && <i className="dot" />}
          </button>
        ))}
      </nav>

      {tab === "Site & text" && (
        <div className="agrid">
          {SITE_GROUPS.map((g) => (
            <section key={g.title} className="panel asec">
              <h2 className="label bare">{g.title}</h2>
              <div className="form">
                {g.fields.map((f) => (
                  <FieldRow key={f.key} id={`s-${f.key}`} field={f} value={content.settings[f.key]} onChange={(v) => setSetting(f.key, v)} />
                ))}
              </div>
            </section>
          ))}

          {Array.from(new Set(COPY_FIELDS.map((c) => c.page))).map((page) => (
            <section key={page} className="panel asec">
              <h2 className="label bare">Text — {page}</h2>
              <p className="help" style={{ marginBottom: 14 }}>
                New line = line break. Put *stars* around words to colour them. Steps: one per line as “Title | description”.
              </p>
              <div className="form">
                {COPY_FIELDS.filter((c) => c.page === page).map((c) => (
                  <div key={c.key} className="f full">
                    <label htmlFor={`c-${c.key}`}>{c.label}</label>
                    {c.kind === "line" ? (
                      <input id={`c-${c.key}`} value={content.settings.copy[c.key] ?? ""} onChange={(e) => setSetting("copy", { ...content.settings.copy, [c.key]: e.target.value })} />
                    ) : (
                      <textarea
                        id={`c-${c.key}`}
                        rows={c.kind === "steps" || c.kind === "list" ? 4 : 2}
                        value={content.settings.copy[c.key] ?? ""}
                        onChange={(e) => setSetting("copy", { ...content.settings.copy, [c.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="panel asec">
            <h2 className="label bare">Currency estimates (per 1 USD)</h2>
            <p className="help" style={{ marginBottom: 14 }}>
              Display only — buyers are always charged in USD.
            </p>
            <div className="form fx">
              {DISPLAY_CURRENCIES.filter((c) => c !== "USD").map((c) => (
                <div key={c} className="f">
                  <label htmlFor={`fx-${c}`}>{c}</label>
                  <input
                    id={`fx-${c}`}
                    type="number"
                    step="any"
                    value={content.settings.fx_rates[c as Currency] ?? ""}
                    onChange={(e) => setSetting("fx_rates", { ...content.settings.fx_rates, [c]: Number(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "Plans" && (
        <ListEditor<SubscriptionTier>
          rows={content.tiers}
          onChange={(v) => set("tiers", v)}
          fields={tierFields}
          groupOf={(r) => (r.period === "weekly" ? "1" : "2")}
          titleOf={(r) => r.name}
          metaOf={(r) => `${r.period} · $${r.price}${r.recommended ? " · recommended" : ""}`}
          addLabel="Add plan"
          makeNew={() => ({
            id: uid("tier"),
            name: "New plan",
            tagline: "",
            period: "weekly",
            price: 10,
            currency: "USD",
            features: [],
            compare: {},
            recommended: false,
            sort_order: 99,
            active: false,
            whop_plan_id: null,
            patreon_enabled: false,
            patreon_tier_id: null,
            patreon_join_url: null,
          })}
        />
      )}

      {tab === "Services" && (
        <>
          <CategoryEditor value={content.categories} onChange={(v) => set("categories", v)} inUse={(slug) => content.services.some((s) => s.category === slug)} />
          <ListEditor<Service>
            rows={content.services}
            onChange={(v) => set("services", v)}
            fields={serviceFields(content.categories)}
            titleOf={(r) => r.name}
            metaOf={(r) => `${content.categories.find((c) => c.slug === r.category)?.label ?? r.category} · ${r.price_is_from ? "from " : ""}$${r.price}`}
            addLabel="Add service"
            makeNew={() => ({
              id: uid("svc"),
              name: "New service",
              category: content.categories[0]?.slug ?? "shiny",
              description: "",
              price: 10,
              currency: "USD",
              price_is_from: false,
              delivery_time: "2–5 days",
              image_url: null,
              sort_order: 99,
              active: false,
              featured: false,
              popular: false,
              whop_plan_id: null,
            })}
          />
        </>
      )}

      {tab === "Offers" && (
        <ListEditor<Offer>
          rows={[...content.offers].sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))}
          onChange={(v) => set("offers", v)}
          fields={offerFields}
          sortable={false}
          titleOf={(r) => r.title}
          metaOf={(r) => {
            const now = Date.now();
            const st = Date.parse(r.ends_at) < now ? "ended" : Date.parse(r.starts_at) > now ? "scheduled" : "live";
            return `${st} · ends ${fmtDate(r.ends_at)} · $${r.price}${r.pinned ? " · pinned" : ""}`;
          }}
          addLabel="Add offer"
          makeNew={() => ({
            id: uid("off"),
            title: "New offer",
            body: "",
            image_url: null,
            price: 10,
            currency: "USD",
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
            pinned: false,
            published: false,
            whop_plan_id: null,
          })}
        />
      )}

      {tab === "FAQ" && (
        <ListEditor<Faq>
          rows={content.faqs}
          onChange={(v) => set("faqs", v)}
          fields={faqFields}
          titleOf={(r) => r.question}
          addLabel="Add question"
          makeNew={() => ({ id: uid("faq"), question: "New question?", answer: "", sort_order: 99 })}
        />
      )}

      {tab === "Orders" && <OrdersAdmin orders={orders} onStatus={(id, s) => updateOrder(id, { status: s })} />}

      {tab === "Requests" && <RequestsAdmin requests={requests} onUpdate={updateRequest} />}

      {tab === "Backup" && (
        <section className="panel asec" style={{ maxWidth: 680 }}>
          <h2 className="label bare">Backup</h2>
          <p className="muted" style={{ margin: "12px 0 20px" }}>
            Download everything you&apos;ve edited as one file. Keep it safe — it&apos;s also what we&apos;ll load into the real database in Phase 2.
          </p>
          <div className="stack">
            <button
              className="btn"
              onClick={() => {
                const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `unownvault-content-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Download my content
            </button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>
              Load a backup file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const data = JSON.parse(await f.text()) as SiteContent;
                  if (!data.settings || !Array.isArray(data.tiers)) throw new Error();
                  commit({ ...content, ...data });
                  toast("Backup loaded");
                } catch {
                  toast("That file isn't an UnownVault backup");
                }
                e.target.value = "";
              }}
            />
            <button
              className="btn ghost"
              disabled={!edited}
              onClick={() => {
                if (confirm("Undo ALL your edits and go back to the original demo content?")) {
                  reset();
                  setSavedAt(false);
                  toast("Back to the original content");
                }
              }}
            >
              Reset to original content
            </button>
          </div>
        </section>
      )}

      <p className="mono dim" style={{ fontSize: 12, marginTop: 40 }}>
        Check your changes:{" "}
        <Link className="linkish" href="/">
          Home
        </Link>{" "}
        ·{" "}
        <Link className="linkish" href="/subscriptions">
          Plans
        </Link>{" "}
        ·{" "}
        <Link className="linkish" href="/services">
          Services
        </Link>{" "}
        ·{" "}
        <Link className="linkish" href="/updates">
          Offers
        </Link>
      </p>
    </div>
  );
}

function CategoryEditor({
  value,
  onChange,
  inUse,
}: {
  value: { slug: string; label: string }[];
  onChange: (v: { slug: string; label: string }[]) => void;
  inUse: (slug: string) => boolean;
}) {
  return (
    <section className="panel asec" style={{ marginBottom: 20 }}>
      <h2 className="label bare">Categories (filter buttons)</h2>
      <div className="cats">
        {value.map((c, i) => (
          <div key={c.slug} className="cat-row">
            <input aria-label="Category name" value={c.label} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <button
              className="linkish"
              onClick={() => {
                if (inUse(c.slug)) return alert("Move the services in this category first.");
                onChange(value.filter((_, j) => j !== i));
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={() => onChange([...value, { slug: uid("cat"), label: "New category" }])}>
        + Add category
      </button>
    </section>
  );
}

function OrdersAdmin({ orders, onStatus }: { orders: Order[]; onStatus: (id: string, s: Order["status"]) => void }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const open = (o: Order) => !["completed", "refunded"].includes(o.status);
  const list = orders.filter((o) => filter === "all" || open(o));
  return (
    <section className="panel asec">
      <div className="head-row" style={{ marginBottom: 12 }}>
        <h2 className="label bare">Orders</h2>
        <div className="chips">
          <button className={`chip ${filter === "open" ? "on" : ""}`} onClick={() => setFilter("open")}>
            Open
          </button>
          <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>
            All
          </button>
        </div>
      </div>
      <p className="help" style={{ marginBottom: 12 }}>
        Paid orders arrive as “Pending delivery”. Move them to “In progress” while you work and “Completed” when delivered — or the buyer can mark them
        received from their account.
      </p>
      {list.length === 0 ? (
        <p className="empty">Nothing open. Nice.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="otable">
            <thead>
              <tr>
                <th>Order</th>
                <th>Item</th>
                <th className="hide-m">Buyer</th>
                <th className="hide-m">Paid via</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="m dim">
                    {o.id}
                    <br />
                    <small>{fmtDate(o.created_at)}</small>
                  </td>
                  <td>
                    {o.item_name}
                    {o.transaction_ref && (
                      <>
                        <br />
                        <small className="mono dim">Txn: {o.transaction_ref}</small>
                      </>
                    )}
                  </td>
                  <td className="m hide-m">{o.user_id}</td>
                  <td className="m hide-m">{o.provider}</td>
                  <td className="m">${o.amount}</td>
                  <td>
                    <div className="f">
                      <select aria-label={`Status of ${o.id}`} value={o.status} onChange={(e) => onStatus(o.id, e.target.value as Order["status"])}>
                        {Object.entries(ORDER_STATUS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RequestsAdmin({ requests, onUpdate }: { requests: CustomRequest[]; onUpdate: (id: string, p: Partial<CustomRequest>) => void }) {
  const toast = useToast();
  return (
    <div className="stack" style={{ gap: 14 }}>
      {requests.length === 0 && <p className="empty">No custom requests yet.</p>}
      {requests.map((r) => (
        <RequestCard key={r.id} r={r} onUpdate={onUpdate} toast={toast} />
      ))}
    </div>
  );
}

function RequestCard({ r, onUpdate, toast }: { r: CustomRequest; onUpdate: (id: string, p: Partial<CustomRequest>) => void; toast: (m: string) => void }) {
  const [amount, setAmount] = useState(r.quote_amount?.toString() ?? "");
  const [reply, setReply] = useState(r.admin_reply ?? "");
  return (
    <section className="panel asec">
      <div className="head-row" style={{ marginBottom: 10 }}>
        <div>
          <span className="mono dim" style={{ fontSize: 12 }}>
            #{r.id} · {fmtDate(r.created_at)} · Discord: {r.discord_username}
          </span>
          <h2 className="h3" style={{ fontSize: 20, marginTop: 6 }}>
            {r.request_type} · {r.target}
          </h2>
        </div>
        <span className={`badge ${r.status === "new" ? "solid" : ""}`}>{r.status.replace("_", " ")}</span>
      </div>
      <p className="muted">{r.details}</p>
      <p className="mono dim" style={{ fontSize: 12, margin: "8px 0 16px" }}>
        Budget: {r.budget != null ? `$${r.budget}` : "—"} · Deadline: {r.deadline ? new Date(r.deadline).toLocaleDateString("en-GB") : "—"}
      </p>
      <div className="form">
        <div className="f">
          <label htmlFor={`q-${r.id}`}>Your quote (USD)</label>
          <input id={`q-${r.id}`} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="f">
          <label htmlFor={`st-${r.id}`}>Status</label>
          <select id={`st-${r.id}`} value={r.status} onChange={(e) => onUpdate(r.id, { status: e.target.value as CustomRequest["status"] })}>
            {["new", "quoted", "accepted", "in_progress", "completed", "declined"].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="f full">
          <label htmlFor={`rp-${r.id}`}>Reply to the buyer</label>
          <textarea id={`rp-${r.id}`} rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="e.g. Doable in 4 days." />
        </div>
        <div className="f full">
          <button
            className="btn sm"
            disabled={!amount}
            onClick={() => {
              onUpdate(r.id, { quote_amount: Number(amount), admin_reply: reply || null, status: "quoted" });
              toast(`Quote sent — ${r.discord_username} now sees a Pay button`);
            }}
          >
            Send quote
          </button>
        </div>
      </div>
    </section>
  );
}
