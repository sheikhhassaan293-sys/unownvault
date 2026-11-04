"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useSettings } from "./providers/Settings";
import { useToast } from "./providers/Toast";

/** Scroll reveal: fast, eased, once. Disabled automatically for reduced motion (MotionConfig). */
export function Reveal({
  children,
  delay = 0,
  className,
  style,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li";
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      style={style}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </M>
  );
}

export function Arrow() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h9M8 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Discord invite link. While the invite is still the placeholder, it shows a toast instead. */
export function DiscordLink({ className = "btn", children = "Join the Discord" }: { className?: string; children?: ReactNode }) {
  const { discord_url } = useSettings();
  const toast = useToast();
  const placeholder = discord_url.includes("your-invite");
  return (
    <a
      className={className}
      href={discord_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (placeholder) {
          e.preventDefault();
          toast("Your Discord invite link goes here");
        }
      }}
    >
      {children}
    </a>
  );
}

/** Ticks once per second after mount (null during SSR so markup is stable). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Plain-language "renews / expires" helper. */
export function daysUntil(iso: string, now: number) {
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / 86_400_000));
}
