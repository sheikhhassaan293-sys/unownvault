"use client";

import { createContext, useContext } from "react";
import type { SiteSettings } from "@/lib/types";

const Ctx = createContext<SiteSettings | null>(null);

export function SettingsProvider({ value, children }: { value: SiteSettings; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings outside SettingsProvider");
  return v;
}
