"use client";

/**
 * MOCK SESSION (Phase 1). Stores a fake signed-in user, their orders and custom requests
 * in localStorage so the whole flow can be clicked through:
 *   sign up → pay → "pending delivery" → mark as received; request → admin quote → pay.
 * Phase 2 replaces this with Supabase auth + the orders / custom_requests tables
 * (same function names, so pages don't change).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CustomRequest, Order } from "@/lib/types";

export type DemoUser = { username: string; email: string | null; provider: "email" | "discord" | "patreon" };

type Ctx = {
  user: DemoUser | null;
  ready: boolean;
  signIn: (u: DemoUser) => void;
  signOut: () => void;
  orders: Order[];
  addOrder: (o: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  requests: CustomRequest[];
  addRequest: (r: CustomRequest) => void;
  updateRequest: (id: string, patch: Partial<CustomRequest>) => void;
};

const KEY = "uv-demo-session";
const ORD_KEY = "uv-demo-orders-v1";
const REQ_KEY = "uv-demo-requests-v2";
const SessionCtx = createContext<Ctx | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export function SessionProvider({
  demoOrders,
  demoRequests,
  children,
}: {
  demoOrders: Order[];
  demoRequests: CustomRequest[];
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [requests, setRequests] = useState<CustomRequest[]>(demoRequests);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate mock session from storage */
    setUser(load<DemoUser | null>(KEY, null));
    setOrders(load(ORD_KEY, demoOrders));
    setRequests(load(REQ_KEY, demoRequests));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [demoOrders, demoRequests]);

  const signIn = useCallback((u: DemoUser) => {
    setUser(u);
    store(KEY, u);
  }, []);
  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const addOrder = useCallback((o: Order) => {
    setOrders((prev) => {
      const next = [o, ...prev];
      store(ORD_KEY, next);
      return next;
    });
  }, []);
  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
      store(ORD_KEY, next);
      return next;
    });
  }, []);
  const addRequest = useCallback((r: CustomRequest) => {
    setRequests((prev) => {
      const next = [r, ...prev];
      store(REQ_KEY, next);
      return next;
    });
  }, []);
  const updateRequest = useCallback((id: string, patch: Partial<CustomRequest>) => {
    setRequests((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      store(REQ_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, orders, addOrder, updateOrder, requests, addRequest, updateRequest }),
    [user, ready, signIn, signOut, orders, addOrder, updateOrder, requests, addRequest, updateRequest],
  );
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const v = useContext(SessionCtx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

export const ORDER_STATUS: Record<Order["status"], string> = {
  awaiting_payment: "Awaiting payment",
  awaiting_confirmation: "Awaiting confirmation",
  pending: "Pending delivery",
  in_progress: "In progress",
  completed: "Completed",
  refunded: "Refunded",
  disputed: "Disputed",
};

export const newId = () => "UV-" + Math.random().toString(36).slice(2, 7).toUpperCase();
