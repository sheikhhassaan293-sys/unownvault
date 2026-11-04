"use client";

/**
 * Theme-transition wipe (~600ms): the next page's colour sweeps across the screen,
 * the route changes underneath, then the wipe clears to reveal the new theme.
 */
import { motion } from "framer-motion";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { STATIC, toHref, useAppPath as usePathname } from "@/lib/paths";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps } from "react";
import { themeForPath, themes, type ThemeKey } from "@/lib/themes";

type Phase = "in" | "hold" | "out";
const NavCtx = createContext<(href: string) => void>(() => {});
const EASE = [0.7, 0, 0.3, 1] as const;

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [wipe, setWipe] = useState<{ href: string; path: string; theme: ThemeKey; phase: Phase } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const navigate = useCallback(
    (href: string) => {
      const path = href.split("#")[0].split("?")[0] || "/";
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (STATIC) {
        if (reduce || path === pathname) {
          window.location.href = toHref(href);
          return;
        }
        setWipe({ href, path, theme: themeForPath(path), phase: "in" });
        return;
      }
      if (reduce || path === pathname || wipe) {
        router.push(href);
        return;
      }
      setWipe({ href, path, theme: themeForPath(path), phase: "in" });
    },
    [pathname, router, wipe],
  );

  useEffect(() => {
    if (!STATIC) return;
    try {
      const th = sessionStorage.getItem("uv-wipe") as ThemeKey | null;
      sessionStorage.removeItem("uv-wipe");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- finishing the wipe started on the previous page
      if (th && themes[th]) setWipe({ href: "", path: "", theme: th, phase: "out" });
    } catch {}
  }, []);

  // once the new route is on screen, clear the wipe
  useEffect(() => {
    if (wipe?.phase === "hold" && pathname === wipe.path) {
      clearTimeout(holdTimer.current);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- advancing the wipe once the route has changed
      setWipe((w) => (w ? { ...w, phase: "out" } : w));
    }
  }, [pathname, wipe]);

  const onDone = () => {
    if (!wipe) return;
    if (wipe.phase === "in" && STATIC) {
      try {
        sessionStorage.setItem("uv-wipe", wipe.theme);
      } catch {}
      window.location.href = toHref(wipe.href);
      return;
    }
    if (wipe.phase === "in") {
      setWipe({ ...wipe, phase: "hold" });
      router.push(wipe.href);
      // never get stuck behind the wipe
      holdTimer.current = setTimeout(() => setWipe((w) => (w ? { ...w, phase: "out" } : w)), 2500);
    } else if (wipe.phase === "out") {
      setWipe(null);
    }
  };

  const t = wipe ? themes[wipe.theme] : null;
  return (
    <NavCtx.Provider value={navigate}>
      {children}
      {wipe && t && (
        <motion.div
          className="wipe"
          aria-hidden="true"
          style={{ background: t.bg, ["--wacc" as string]: t.accent }}
          initial={{ x: STATIC && wipe.phase === "out" ? "0%" : "-101%" }}
          animate={{ x: wipe.phase === "out" ? "101%" : "0%" }}
          transition={{ duration: wipe.phase === "out" ? 0.32 : 0.27, ease: EASE }}
          onAnimationComplete={onDone}
        />
      )}
    </NavCtx.Provider>
  );
}

export const useThemedNavigate = () => useContext(NavCtx);

/** Drop-in for next/link that plays the wipe between themed pages. */
export function Link({ href, onClick, ...rest }: ComponentProps<typeof NextLink> & { href: string }) {
  const navigate = useThemedNavigate();
  if (STATIC) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { prefetch, replace, scroll, ...a } = rest as typeof rest & { prefetch?: unknown; replace?: unknown; scroll?: unknown };
    return (
      <a
        href={toHref(href)}
        {...(a as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        onClick={(e) => {
          onClick?.(e as never);
          if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          navigate(href);
        }}
      />
    );
  }
  return (
    <NextLink
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || rest.target === "_blank") return;
        e.preventDefault();
        navigate(href);
      }}
    />
  );
}
