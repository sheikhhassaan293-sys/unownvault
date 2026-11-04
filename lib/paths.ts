"use client";
/**
 * Static-preview support. When NEXT_PUBLIC_STATIC_EXPORT=1 the site is exported as flat
 * HTML files (index.html, services.html …) that can be hosted from any folder, so
 * links become relative file names and page changes are full loads.
 * The normal build (Vercel) ignores all of this.
 */
import { usePathname } from "next/navigation";

export const STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const KNOWN = ["subscriptions", "services", "custom", "updates", "signup", "login", "account", "offline"];

export function toHref(href: string) {
  if (!STATIC || /^(https?:|mailto:)/.test(href)) return href;
  const [p, h] = href.split("#");
  const name = p.replace(/^\/+|\/+$/g, "");
  return (name ? `${name}.html` : "index.html") + (h ? `#${h}` : "");
}

function pathFromLocation() {
  const last = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  return KNOWN.includes(last) ? `/${last}` : "/";
}

/** usePathname that also works for the static preview. */
export function useAppPath() {
  const p = usePathname();
  if (!STATIC || typeof window === "undefined") return p;
  return pathFromLocation();
}
