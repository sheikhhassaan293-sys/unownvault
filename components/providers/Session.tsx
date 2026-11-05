"use client";

/**
 * Accounts, orders and custom requests.
 *
 * Demo mode (no Supabase keys): a fake user, orders and requests in localStorage.
 * Live mode: Supabase auth (email + Discord), data from the database; row-level security
 * means each person only ever loads their own rows (admins load everyone's).
 * Both modes expose the same functions, so pages don't care which one is running.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { syncAdminRole } from "@/app/actions";
import { sb } from "@/lib/supabase/browser";
import { LIVE } from "@/lib/supabase/env";
import { normalizeRows, type CustomRequest, type Order, type Priorities, type SubscriptionTier, type UserSubscription } from "@/lib/types";

export type DemoUser = {
  id?: string;
  username: string;
  email: string | null;
  provider: "email" | "discord";
  role?: "user" | "admin";
};
export type Sub = UserSubscription & { tier: SubscriptionTier | null };
export type NewRequest = Pick<CustomRequest, "request_type" | "target" | "details" | "budget" | "deadline" | "discord_username"> & { image?: File | null };
type Result = { error?: string; needsConfirm?: boolean };

type Ctx = {
  live: boolean;
  user: DemoUser | null;
  /** live: signed in but hasn't picked a trainer name yet */
  needsUsername: boolean;
  ready: boolean;
  isAdmin: boolean;
  signIn: (u: DemoUser) => void; // demo only
  signUpEmail: (email: string, password: string) => Promise<Result>;
  signInEmail: (email: string, password: string) => Promise<Result>;
  signInDiscord: (next?: string) => Promise<Result>;
  checkUsername: (name: string) => Promise<boolean>;
  claimUsername: (name: string) => Promise<Result>;
  signOut: () => Promise<void>;
  subscriptions: Sub[];
  orders: Order[];
  addOrder: (o: Order) => void; // demo checkout only — live orders come from payment webhooks
  updateOrder: (id: string, patch: Partial<Order>) => Promise<void>;
  markReceived: (id: string) => Promise<Result>;
  requests: CustomRequest[];
  sendRequest: (r: NewRequest) => Promise<CustomRequest>;
  updateRequest: (id: string, patch: Partial<CustomRequest>) => Promise<void>;
  reload: () => Promise<void>;
  /** the signed-in customer's priority Pokémon wishlist */
  priorities: Priorities;
  savePriorities: (p: Priorities) => Promise<Result>;
};

const KEY = "uv-demo-session";
const ORD_KEY = "uv-demo-orders-v1";
const REQ_KEY = "uv-demo-requests-v2";
const PRI_KEY = "uv-demo-priorities";
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
const callbackUrl = (next = "/") => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
const friendly = (msg: string) =>
  /invalid login/i.test(msg)
    ? "Wrong email or password"
    : /already registered/i.test(msg)
      ? "That email already has an account — log in instead"
      : /rate limit/i.test(msg)
        ? "Too many tries — wait a minute and try again"
        : msg;

export const newId = () => "UV-" + Math.random().toString(36).slice(2, 7).toUpperCase();

export function SessionProvider({ demoOrders, demoRequests, children }: { demoOrders: Order[]; demoRequests: CustomRequest[]; children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [orders, setOrders] = useState<Order[]>(LIVE ? [] : demoOrders);
  const [requests, setRequests] = useState<CustomRequest[]>(LIVE ? [] : demoRequests);
  const [subscriptions, setSubs] = useState<Sub[]>([]);
  const [ready, setReady] = useState(false);
  const [priorities, setPriorities] = useState<Priorities>({});

  /* ───────────── live: load profile + own data ───────────── */
  const loadLive = useCallback(async () => {
    const db = sb();
    const { data: auth } = await db.auth.getUser();
    const u = auth.user;
    if (!u) {
      setUser(null);
      setNeedsUsername(false);
      setOrders([]);
      setRequests([]);
      setSubs([]);
      return;
    }
    const role = (await syncAdminRole().catch(() => null)) ?? "user";
    const { data: profile } = await db.from("profiles").select("username, role, priorities").eq("id", u.id).single();
    setPriorities((profile?.priorities as Priorities) ?? {});
    const provider = (u.app_metadata?.provider as DemoUser["provider"]) ?? "email";
    setUser({ id: u.id, username: profile?.username ?? "", email: u.email ?? null, provider, role: (profile?.role as "admin" | "user") ?? role });
    setNeedsUsername(!profile?.username);
    const [o, r, s] = await Promise.all([
      db.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("custom_requests").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("subscriptions").select("*, tier:subscription_tiers(*)").eq("user_id", u.id).order("starts_at", { ascending: false }),
    ]);
    setOrders(normalizeRows(o.data, ["amount"]) as Order[]);
    setRequests(normalizeRows(r.data, [], ["budget", "quote_amount"]) as CustomRequest[]);
    setSubs(((s.data ?? []) as Sub[]).map((x) => ({ ...x, tier: x.tier ? { ...x.tier, price: Number(x.tier.price) } : null })));
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate session after mount */
    if (!LIVE) {
      setUser(load<DemoUser | null>(KEY, null));
      setOrders(load(ORD_KEY, demoOrders));
      setRequests(load(REQ_KEY, demoRequests));
      setPriorities(load<Priorities>(PRI_KEY, {}));
      setReady(true);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    loadLive().finally(() => setReady(true));
    const { data } = sb().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") loadLive();
    });
    return () => data.subscription.unsubscribe();
  }, [demoOrders, demoRequests, loadLive]);

  /* ───────────── auth ───────────── */
  const signIn = useCallback((u: DemoUser) => {
    setUser(u);
    store(KEY, u);
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string): Promise<Result> => {
    if (!LIVE) return {};
    const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl("/signup?step=name") } });
    if (error) return { error: friendly(error.message) };
    return { needsConfirm: !data.session };
  }, []);

  const signInEmail = useCallback(async (email: string, password: string): Promise<Result> => {
    if (!LIVE) return {};
    const { error } = await sb().auth.signInWithPassword({ email, password });
    if (error) return { error: friendly(error.message) };
    await loadLive();
    return {};
  }, [loadLive]);

  const signInDiscord = useCallback(async (next = "/"): Promise<Result> => {
    if (!LIVE) return {};
    const { error } = await sb().auth.signInWithOAuth({ provider: "discord", options: { redirectTo: callbackUrl(next), scopes: "identify email" } });
    return error ? { error: friendly(error.message) } : {};
  }, []);

  const checkUsername = useCallback(async (name: string) => {
    if (!LIVE) return true;
    const { data, error } = await sb().rpc("username_available", { name });
    return !error && data === true;
  }, []);

  const claimUsername = useCallback(
    async (name: string): Promise<Result> => {
      if (!LIVE) return {};
      const db = sb();
      const { data: auth } = await db.auth.getUser();
      if (!auth.user) return { error: "Please sign in again" };
      const { error } = await db.from("profiles").update({ username: name }).eq("id", auth.user.id);
      if (error) return { error: /duplicate|unique/i.test(error.message) ? "Someone just took that name — try another" : error.message };
      await loadLive();
      return {};
    },
    [loadLive],
  );

  const signOut = useCallback(async () => {
    if (LIVE) await sb().auth.signOut();
    setUser(null);
    setNeedsUsername(false);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  /* ───────────── orders ───────────── */
  const addOrder = useCallback((o: Order) => {
    setOrders((prev) => {
      const next = [o, ...prev];
      store(ORD_KEY, next);
      return next;
    });
  }, []);

  const updateOrder = useCallback(async (id: string, patch: Partial<Order>) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
      if (!LIVE) store(ORD_KEY, next);
      return next;
    });
    if (LIVE) {
      const { error } = await sb().from("orders").update(patch).eq("id", id);
      if (error) alert(`Couldn't update the order: ${error.message}`);
    }
  }, []);

  const markReceived = useCallback(
    async (id: string): Promise<Result> => {
      if (LIVE) {
        const { error } = await sb().rpc("mark_order_received", { order_id: id });
        if (error) return { error: error.message };
      }
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === id ? { ...o, status: "completed" as const } : o));
        if (!LIVE) store(ORD_KEY, next);
        return next;
      });
      return {};
    },
    [],
  );

  /* ───────────── custom requests ───────────── */
  const sendRequest = useCallback(async (r: NewRequest): Promise<CustomRequest> => {
    const base: CustomRequest = {
      id: newId(),
      user_id: null,
      request_type: r.request_type,
      target: r.target,
      details: r.details,
      budget: r.budget,
      deadline: r.deadline,
      discord_username: r.discord_username,
      image_url: null,
      status: "new",
      quote_amount: null,
      admin_reply: null,
      created_at: new Date().toISOString(),
    };
    if (!LIVE) {
      await new Promise((res) => setTimeout(res, 500));
      setRequests((prev) => {
        const next = [base, ...prev];
        store(REQ_KEY, next);
        return next;
      });
      return base;
    }
    const db = sb();
    let image_url: string | null = null;
    if (r.image) {
      const path = `${crypto.randomUUID()}.${(r.image.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const up = await db.storage.from("request-images").upload(path, r.image, { contentType: r.image.type });
      if (!up.error) image_url = path;
    }
    const { data, error } = await db.rpc("submit_custom_request", {
      p_type: r.request_type,
      p_target: r.target,
      p_details: r.details,
      p_budget: r.budget,
      p_deadline: r.deadline,
      p_discord: r.discord_username,
      p_image_url: image_url,
    });
    if (error) throw new Error(error.message);
    const saved = { ...base, id: data as string, image_url };
    setRequests((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const updateRequest = useCallback(async (id: string, patch: Partial<CustomRequest>) => {
    setRequests((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      if (!LIVE) store(REQ_KEY, next);
      return next;
    });
    if (LIVE) {
      const { error } = await sb().from("custom_requests").update(patch).eq("id", id);
      if (error) alert(`Couldn't update the request: ${error.message}`);
    }
  }, []);

  const savePriorities = useCallback(async (p: Priorities): Promise<Result> => {
    const clean: Priorities = {};
    for (const [k, v] of Object.entries(p)) if (Array.isArray(v) && v.length) clean[k as keyof Priorities] = Array.from(new Set(v)).slice(0, 40);
    if (!LIVE) {
      setPriorities(clean);
      store(PRI_KEY, clean);
      return {};
    }
    const db = sb();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return { error: "Please log in to save your priorities" };
    const { error } = await db.from("profiles").update({ priorities: clean }).eq("id", auth.user.id);
    if (error) return { error: error.message };
    setPriorities(clean);
    return {};
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      live: LIVE,
      user,
      needsUsername,
      ready,
      isAdmin: LIVE ? user?.role === "admin" : true,
      signIn,
      signUpEmail,
      signInEmail,
      signInDiscord,
      checkUsername,
      claimUsername,
      signOut,
      subscriptions,
      orders,
      addOrder,
      updateOrder,
      markReceived,
      requests,
      sendRequest,
      updateRequest,
      reload: LIVE ? loadLive : async () => {},
      priorities,
      savePriorities,
    }),
    [user, needsUsername, ready, signIn, signUpEmail, signInEmail, signInDiscord, checkUsername, claimUsername, signOut, subscriptions, orders, addOrder, updateOrder, markReceived, requests, sendRequest, updateRequest, loadLive, priorities, savePriorities],
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
