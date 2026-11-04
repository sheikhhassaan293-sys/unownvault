"use client";

/**
 * MOCK SESSION (Phase 1). Stores a fake signed-in user in localStorage so the
 * sign-up → trainer name → welcome flow and the account page can be reviewed.
 * Phase 2 replaces this with Supabase auth (same `useSession()` shape).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CustomRequest } from "@/lib/types";

export type DemoUser = { username: string; email: string | null; provider: "email" | "discord" | "patreon" };

type Ctx = {
  user: DemoUser | null;
  ready: boolean;
  signIn: (u: DemoUser) => void;
  signOut: () => void;
  /** Requests submitted during this demo session (shown on /custom and /account). */
  myRequests: CustomRequest[];
  addRequest: (r: CustomRequest) => void;
};

const KEY = "uv-demo-session";
const REQ_KEY = "uv-demo-requests";
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [myRequests, setReqs] = useState<CustomRequest[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate mock session from storage */
    try {
      const u = localStorage.getItem(KEY);
      if (u) setUser(JSON.parse(u));
      const r = localStorage.getItem(REQ_KEY);
      if (r) setReqs(JSON.parse(r));
    } catch {}
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const signIn = useCallback((u: DemoUser) => {
    setUser(u);
    try {
      localStorage.setItem(KEY, JSON.stringify(u));
    } catch {}
  }, []);
  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);
  const addRequest = useCallback((r: CustomRequest) => {
    setReqs((prev) => {
      const next = [r, ...prev].slice(0, 20);
      try {
        localStorage.setItem(REQ_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut, myRequests, addRequest }), [user, ready, signIn, signOut, myRequests, addRequest]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const v = useContext(SessionCtx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
