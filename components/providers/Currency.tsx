"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Currency } from "@/lib/types";
import { useSettings } from "./Settings";

export const DISPLAY_CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "JPY", "CZK", "CAD", "AUD", "CHF", "PLN", "SEK"];
const KEY = "uv-currency";

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Format an amount stored in `from` (default USD) in the visitor's display currency. */
  money: (amount: number, from?: Currency) => string;
  /** Format without conversion. */
  exact: (amount: number, cur: Currency) => string;
};
const CurrencyCtx = createContext<Ctx | null>(null);

function fmt(n: number, cur: Currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    // CAD / AUD keep their prefix (CA$, A$) so they can't be mistaken for USD
    currencyDisplay: cur === "CAD" || cur === "AUD" ? "symbol" : "narrowSymbol",
    minimumFractionDigits: Number.isInteger(n) || cur === "JPY" ? 0 : 2,
    maximumFractionDigits: cur === "JPY" ? 0 : 2,
  }).format(n);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { fx_rates } = useSettings();
  const [currency, setCur] = useState<Currency>("USD");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Currency | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved preference after hydration
      if (saved && DISPLAY_CURRENCIES.includes(saved)) setCur(saved);
    } catch {}
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCur(c);
    try {
      localStorage.setItem(KEY, c);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => {
    const money = (amount: number, from: Currency = "USD") => {
      if (from === currency) return fmt(amount, currency);
      const usd = amount / (fx_rates[from] || 1);
      const v = usd * (fx_rates[currency] || 1);
      return fmt(currency === "USD" ? v : Math.round(v), currency);
    };
    return { currency, setCurrency, money, exact: fmt };
  }, [currency, setCurrency, fx_rates]);

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export function useMoney() {
  const v = useContext(CurrencyCtx);
  if (!v) throw new Error("useMoney outside CurrencyProvider");
  return v;
}

/** Display-only switcher. Charges always happen in the item's own currency (USD). */
export function CurrencySwitch({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useMoney();
  return (
    <label className={`cur ${className}`}>
      <span className="sr-only">Display currency</span>
      <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
        {DISPLAY_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Inline price that follows the switcher. */
export function Price({ amount, from = "USD" }: { amount: number; from?: Currency }) {
  const { money } = useMoney();
  return <>{money(amount, from)}</>;
}
