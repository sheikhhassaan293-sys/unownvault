"use client";

/**
 * SITE CONTENT STORE — everything the owner can edit from /admin.
 *
 * Phase 1 (demo): starts from data/content.ts; edits made in /admin are saved in this
 * browser (localStorage) and show up on every page instantly.
 * Phase 2: the same `update*` calls write to Supabase instead, and every visitor sees them.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Rich } from "../ui";
import type { Faq, Offer, Service, ServiceCategory, SiteSettings, SubscriptionTier } from "@/lib/types";

export type SiteContent = {
  settings: SiteSettings;
  tiers: SubscriptionTier[];
  services: Service[];
  categories: { slug: ServiceCategory; label: string }[];
  offers: Offer[];
  faqs: Faq[];
};

type Ctx = {
  content: SiteContent;
  /** true once saved edits (if any) have been loaded */
  ready: boolean;
  edited: boolean;
  save: (next: SiteContent) => void;
  reset: () => void;
};

const KEY = "uv-demo-content-v1";
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
const ContentCtx = createContext<Ctx | null>(null);

/** Demo: mock offer dates are written around MOCK_NOW; move them so countdowns are live today. */
function rebaseOffers(offers: Offer[], mockNow: string): Offer[] {
  const shift = Date.now() - Date.parse(mockNow);
  const mv = (iso: string) => new Date(Date.parse(iso) + shift).toISOString();
  return offers.map((o) => ({ ...o, starts_at: mv(o.starts_at), ends_at: mv(o.ends_at) }));
}

export function SettingsProvider({ value, mockNow, children }: { value: SiteContent; mockNow: string; children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(value);
  const [ready, setReady] = useState(false);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- load saved demo edits after hydration */
    let saved: SiteContent | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    if (saved?.settings) {
      // new fields added to the site later still get their defaults
      setContent({
        ...value,
        ...saved,
        settings: { ...value.settings, ...saved.settings, copy: { ...value.settings.copy, ...(saved.settings.copy ?? {}) } },
      });
      setEdited(true);
    } else if (DEMO) {
      setContent({ ...value, offers: rebaseOffers(value.offers, mockNow) });
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [value, mockNow]);

  const save = useCallback((next: SiteContent) => {
    setContent(next);
    setEdited(true);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      alert("Couldn't save — your browser storage is full (large images?). Try a smaller image or an image link.");
    }
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setEdited(false);
    setContent(DEMO ? { ...value, offers: rebaseOffers(value.offers, mockNow) } : value);
  }, [value, mockNow]);

  const ctx = useMemo(() => ({ content, ready, edited, save, reset }), [content, ready, edited, save, reset]);
  return <ContentCtx.Provider value={ctx}>{children}</ContentCtx.Provider>;
}

export function useContent() {
  const v = useContext(ContentCtx);
  if (!v) throw new Error("useContent outside SettingsProvider");
  return v;
}

/** A piece of editable page copy (see lib/copy.ts). */
export function useCopy(key: string) {
  return useContent().content.settings.copy[key] ?? "";
}

export function useSettings() {
  return useContent().content.settings;
}

/** Visible rows only, in the owner's order. */
export const visible = <T extends { active?: boolean; sort_order?: number }>(rows: T[]) =>
  rows.filter((r) => r.active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

/** Drop-in editable text for server pages: <CopyText k="subs_title" /> */
export function CopyText({ k }: { k: string }) {
  const text = useCopy(k);
  return <Rich text={text} />;
}
