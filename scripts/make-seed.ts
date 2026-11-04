/** Generates supabase/seed.sql from data/content.ts (run: npx tsx scripts/make-seed.ts). */
import { writeFileSync } from "node:fs";
import * as c from "../data/content";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const rows = (table: string, data: Record<string, unknown>[], conflict = "id") => {
  if (!data.length) return "";
  const cols = Object.keys(data[0]);
  return `insert into public.${table} (${cols.join(", ")}) values\n${data.map((r) => `  (${cols.map((k) => q(r[k])).join(", ")})`).join(",\n")}\non conflict (${conflict}) do nothing;\n\n`;
};

// offers are written around MOCK_NOW; move them so they're live from today
const shift = Date.now() - Date.parse(c.MOCK_NOW);
const mv = (iso: string) => new Date(Date.parse(iso) + shift).toISOString();

const s = c.site_settings;
let sql = `-- Starter content (generated from data/content.ts). Safe to run more than once.\n\n`;
sql += `update public.site_settings set ${Object.entries(s)
  .map(([k, v]) => `${k} = ${q(v)}`)
  .join(",\n  ")}\nwhere id = 1;\n\n`;
sql += rows("service_categories", c.service_categories.map((x, i) => ({ ...x, sort_order: i + 1 })), "slug");
sql += rows("subscription_tiers", c.subscription_tiers);
sql += rows("services", c.services);
sql += rows("offers", c.offers.map((o) => ({ ...o, starts_at: mv(o.starts_at), ends_at: mv(o.ends_at), image_url: null })));
sql += rows("faqs", c.faqs);
writeFileSync("supabase/seed.sql", sql);
console.log("wrote supabase/seed.sql");
