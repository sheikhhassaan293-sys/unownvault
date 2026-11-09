"use client";

/**
 * Order chat: one conversation per order. It opens with the order (or custom request) and closes
 * when the order is completed. A custom request and the order that pays for it share one thread.
 *
 * Signed-in buyers and admins get messages pushed live; guests (private link) re-check every few
 * seconds. All access checks happen in the database (see migration 0012).
 */
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { notifyStaffChat } from "@/app/actions";
import { sb } from "@/lib/supabase/browser";
import { LIVE } from "@/lib/supabase/env";
import type { Order } from "@/lib/types";

export type ChatMessage = { id: string; sender: "buyer" | "staff"; body: string; created_at: string };
type ChatState = { role: "buyer" | "staff"; open: boolean; messages: ChatMessage[] };

/** The chat thread an order belongs to (a paid custom request keeps its request's thread). */
export const threadOfOrder = (o: Pick<Order, "id" | "type" | "item_id">) => (o.type === "custom" ? o.item_id : o.id);

const time = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function OrderChat({ threadId, guestKey = null }: { threadId: string; guestKey?: string | null }) {
  const [chat, setChat] = useState<ChatState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!LIVE) return setChat((c) => c ?? { role: "buyer", open: true, messages: [] });
    const { data, error } = await sb().rpc("chat_fetch", { p_thread: threadId, p_key: guestKey });
    if (error) return setError(error.message);
    setError(null);
    setChat(data as ChatState);
  }, [threadId, guestKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
    if (!LIVE) return;
    const db = sb();
    const channel = db
      .channel(`chat-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `thread_id=eq.${threadId}` }, () => load())
      .subscribe();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 8000);
    return () => {
      clearInterval(timer);
      db.removeChannel(channel);
    };
  }, [threadId, load]);

  const count = chat?.messages.length ?? 0;
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [count]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    if (!LIVE) {
      setChat((c) => (c ? { ...c, messages: [...c.messages, { id: String(Date.now()), sender: "buyer", body, created_at: new Date().toISOString() }] } : c));
    } else {
      const { error } = await sb().rpc("chat_send", { p_thread: threadId, p_body: body, p_key: guestKey });
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      // let staff know on Discord (the server checks there really is a new buyer message)
      if (chat?.role === "buyer") notifyStaffChat(threadId).catch(() => null);
      await load();
    }
    setText("");
    setBusy(false);
  }

  if (!chat) return <p className="help">{error ?? "Loading chat…"}</p>;
  const mine = chat.role;
  const canWrite = chat.open || mine === "staff";

  return (
    <div className="chat">
      <div className="chat-list" ref={list} aria-live="polite">
        {chat.messages.length === 0 && (
          <p className="help" style={{ textAlign: "center", margin: "auto" }}>
            {mine === "staff" ? "No messages yet." : "No messages yet. Ask us anything about this order."}
          </p>
        )}
        {chat.messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.sender === mine ? "me" : ""}`}>
            <span className="chat-who mono">
              {m.sender === mine ? "You" : m.sender === "staff" ? "UnownVault" : "Buyer"} · {time(m.created_at)}
            </span>
            <p>{m.body}</p>
          </div>
        ))}
      </div>
      {error && <span className="err">{error}</span>}
      {canWrite ? (
        <form className="chat-form" onSubmit={send}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a message…" aria-label="Message" />
          <button className="btn sm" type="submit" disabled={busy || !text.trim()}>
            Send
          </button>
        </form>
      ) : (
        <p className="help" style={{ textAlign: "center" }}>
          This order is finished, so the chat is closed. Need help? Message us on Discord.
        </p>
      )}
      {!chat.open && mine === "staff" && <p className="help">The order is finished: the buyer can read this chat but can&apos;t reply.</p>}
    </div>
  );
}

/** "Chat" button with an unread dot; opens the chat in a popup. */
export function ChatButton({
  threadId,
  guestKey = null,
  title,
  unread = 0,
  className = "linkish",
  onOpened,
}: {
  threadId: string;
  guestKey?: string | null;
  title: string;
  unread?: number;
  className?: string;
  onOpened?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`${className} chat-btn`}
        onClick={() => {
          setOpen(true);
          onOpened?.();
        }}
      >
        💬 Chat
        {unread > 0 && <i className="chat-dot" aria-label={`${unread} unread`} />}
      </button>
      {/* drawn at the top of the page (a portal), so nothing on the page can show through it */}
      {typeof document !== "undefined" &&
        createPortal(
      <AnimatePresence>
        {open && (
          <motion.div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="dialog" aria-modal="true" aria-label={`Chat: ${title}`} className="dlg" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
              <div className="label">Chat</div>
              <h3 className="h3" style={{ margin: "8px 0 14px" }}>
                {title}
              </h3>
              <OrderChat threadId={threadId} guestKey={guestKey} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

/** Buyer: unread staff messages per thread → { threadId: count }. Re-checked every 20s. */
export function useBuyerUnread(threads: { id: string; key?: string | null }[]) {
  const [unread, setUnread] = useState<Record<string, number>>({});
  const sig = JSON.stringify(threads);
  const refresh = useCallback(async () => {
    const items = JSON.parse(sig) as { id: string; key?: string | null }[];
    if (!LIVE || !items.length) return;
    const { data } = await sb().rpc("chat_unread", { p_threads: items.map((t) => ({ id: t.id, key: t.key ?? null })) });
    if (data) setUnread(data as Record<string, number>);
  }, [sig]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 20_000);
    return () => clearInterval(t);
  }, [refresh]);
  return { unread, refresh };
}

/** Admin: buyer messages nobody on staff has read yet → { threadId: count }. Live. */
export function useStaffUnread(enabled: boolean) {
  const [unread, setUnread] = useState<Record<string, number>>({});
  const refresh = useCallback(async () => {
    if (!LIVE || !enabled) return;
    const { data } = await sb().from("order_messages").select("thread_id").eq("sender", "buyer").eq("seen_by_staff", false).limit(500);
    const n: Record<string, number> = {};
    for (const r of (data ?? []) as { thread_id: string }[]) n[r.thread_id] = (n[r.thread_id] ?? 0) + 1;
    setUnread(n);
  }, [enabled]);
  useEffect(() => {
    if (!LIVE || !enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    refresh();
    const db = sb();
    const channel = db.channel("chat-staff-unread").on("postgres_changes", { event: "*", schema: "public", table: "order_messages" }, () => refresh()).subscribe();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 20_000);
    return () => {
      clearInterval(t);
      db.removeChannel(channel);
    };
  }, [enabled, refresh]);
  return { unread, refresh };
}
