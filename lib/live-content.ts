import { cacheLife, cacheTag } from "next/cache";
import * as mock from "@/data/content";
import { normalizeRows } from "@/lib/types";

/** Live: public content from Supabase, cached until the admin saves (tag "content"). */
export async function liveContent() {
  "use cache";
  cacheTag("content");
  cacheLife("hours");
  const { sbPublic } = await import("@/lib/supabase/server");
  const db = sbPublic();
  const [settings, tiers, categories, services, offers, faqs] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).single(),
    db.from("subscription_tiers").select("*").order("sort_order"),
    db.from("service_categories").select("slug,label").order("sort_order"),
    db.from("services").select("*").order("sort_order"),
    db.from("offers").select("*").order("starts_at", { ascending: false }),
    db.from("faqs").select("*").order("sort_order"),
  ]);
  const err = [settings, tiers, categories, services, offers, faqs].find((r) => r.error)?.error;
  if (err) throw new Error(`Couldn't load site content: ${err.message}`);
  const st = settings.data as typeof mock.site_settings;
  return {
    settings: { ...mock.site_settings, ...st, copy: { ...mock.site_settings.copy, ...(st.copy ?? {}) } },
    tiers: normalizeRows(tiers.data, ["price", "sort_order"]) as typeof mock.subscription_tiers,
    categories: (categories.data ?? []) as typeof mock.service_categories,
    services: normalizeRows(services.data, ["price", "sort_order"]) as typeof mock.services,
    offers: normalizeRows(offers.data, ["price"]) as typeof mock.offers,
    faqs: (faqs.data ?? []) as typeof mock.faqs,
  };
}

