"use client";

/**
 * SITE CONTENT STORE — everything the owner can edit from /admin.
 *
 * Demo mode: starts from data/content.ts; edits made in /admin are saved in this
 * browser (localStorage) and show up on every page instantly.
 * Live mode: edits are written to Supabase (only what changed, ~1s after you stop typing)
 * and the public pages are refreshed for every visitor.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { refreshContent } from "@/app/actions";
import { sb } from "@/lib/supabase/browser";
import { LIVE } from "@/lib/supabase/env";
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

type SaveState = "idle" | "saving" | "saved" | "error";
type Ctx = {
  content: SiteContent;
  /** true once saved edits (if any) have been loaded */
  ready: boolean;
  edited: boolean;
  save: (next: SiteContent) => void;
  reset: () => void;
  /** live: admin loads every row (incl. hidden ones) without saving */
  hydrate: (full: SiteContent) => void;
  saveState: SaveState;
  saveError: string | null;
};

const KEY = "uv-demo-content-v1";
const DEMO = !LIVE && process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
const ContentCtx = createContext<Ctx | null>(null);

/** Demo: mock offer dates are written around MOCK_NOW; move them so countdowns are live today. */
function rebaseOffers(offers: Offer[], mockNow: string): Offer[] {
  const shift = Date.now() - Date.parse(mockNow);
  const mv = (iso: string) => new Date(Date.parse(iso) + shift).toISOString();
  return offers.map((o) => ({ ...o, starts_at: mv(o.starts_at), ends_at: mv(o.ends_at) }));
}

/* ───────────── live persistence: write only what changed ───────────── */
const TABLES = [
  ["categories", "service_categories", "slug"],
  ["tiers", "subscription_tiers", "id"],
  ["services", "services", "id"],
  ["offers", "offers", "id"],
  ["faqs", "faqs", "id"],
] as const;
const strip = <T extends object>(r: T) => {
  const { updated_at, tier, ...rest } = r as T & { updated_at?: unknown; tier?: unknown };
  void updated_at;
  void tier;
  return rest;
};

async function persist(prev: SiteContent, next: SiteContent) {
  const db = sb();
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    const { error } = await db.from("site_settings").update(strip(next.settings)).eq("id", 1);
    if (error) throw error;
  }
  for (const [key, table, pk] of TABLES) {
    const a = prev[key] as unknown as Record<string, unknown>[];
    const b = next[key] as unknown as Record<string, unknown>[];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const before = new Map(a.map((r) => [r[pk], JSON.stringify(r)]));
    const changed = b.filter((r) => before.get(r[pk]) !== JSON.stringify(r)).map((r) => strip(r));
    if (changed.length) {
      const { error } = await db.from(table).upsert(changed, { onConflict: pk });
      if (error) throw error;
    }
    const keep = new Set(b.map((r) => r[pk]));
    const gone = a.filter((r) => !keep.has(r[pk])).map((r) => r[pk]);
    if (gone.length) {
      const { error } = await db.from(table).delete().in(pk, gone as string[]);
      if (error) throw error;
    }
  }
}

export function SettingsProvider({ value, mockNow, children }: { value: SiteContent; mockNow: string; children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(value);
  const [ready, setReady] = useState(false);
  const [edited, setEdited] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const persisted = useRef<SiteContent>(value);
  const pending = useRef<SiteContent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- load saved demo edits after hydration */
    if (LIVE) {
      setContent(value);
      persisted.current = value;
      setReady(true);
      return;
    }
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

  const flush = useCallback(async () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setSaveState("saving");
    try {
      await persist(persisted.current, next);
      persisted.current = next;
      await refreshContent();
      setSaveError(null);
      setSaveState(pending.current ? "saving" : "saved");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
      setSaveState("error");
    }
  }, []);

  const save = useCallback(
    (next: SiteContent) => {
      setContent(next);
      setEdited(true);
      if (LIVE) {
        pending.current = next;
        setSaveState("saving");
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 800);
        return;
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        setSaveState("saved");
      } catch {
        setSaveState("error");
        setSaveError("Your browser storage is full (large images?). Try a smaller image.");
      }
    },
    [flush],
  );

  const hydrate = useCallback((full: SiteContent) => {
    persisted.current = full;
    setContent(full);
  }, []);

  const reset = useCallback(() => {
    if (LIVE) return; // live content is only changed by editing
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setEdited(false);
    setContent(DEMO ? { ...value, offers: rebaseOffers(value.offers, mockNow) } : value);
  }, [value, mockNow]);

  // don't lose a pending save when the tab closes
  useEffect(() => {
    if (!LIVE) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      if (pending.current) {
        e.preventDefault();
        flush();
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [flush]);

  const ctx = useMemo(
    () => ({ content, ready, edited, save, reset, hydrate, saveState, saveError }),
    [content, ready, edited, save, reset, hydrate, saveState, saveError],
  );
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
