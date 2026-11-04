"use client";

import { MotionConfig } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import type { SiteSettings } from "@/lib/types";
import { themeForPath, themeVars } from "@/lib/themes";
import { Background } from "./background/Background";
import { Footer, Navbar, TabBar } from "./Chrome";
import { CheckoutProvider } from "./providers/Checkout";
import { CurrencyProvider } from "./providers/Currency";
import { SessionProvider } from "./providers/Session";
import { SettingsProvider } from "./providers/Settings";
import { ToastProvider } from "./providers/Toast";
import { TransitionProvider } from "./providers/Transition";

/** App frame: theme tokens from the URL, animated background, nav, footer, global providers. */
export function Shell({ settings, children }: { settings: SiteSettings; children: React.ReactNode }) {
  const path = usePathname();
  const theme = themeForPath(path);
  const main = useRef<HTMLElement>(null);

  // keep <body> + browser UI colour in sync (overscroll, iOS status bar)
  useEffect(() => {
    const vars = themeVars(theme);
    // also on <html> so portals (dialogs, toasts) outside .theme-root get the tokens
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
    document.body.style.background = vars["--bg"];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", vars["--bg"]);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Magma: brief micro screen-shake when the page loads
  useEffect(() => {
    if (theme !== "magma" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const m = main.current;
    if (!m) return;
    m.classList.remove("shake");
    void m.offsetWidth;
    m.classList.add("shake");
  }, [theme]);

  // PWA: service worker (production only so dev never serves stale files)
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <SettingsProvider value={settings}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <SessionProvider>
            <CurrencyProvider>
              <TransitionProvider>
                <CheckoutProvider>
                  <div className="theme-root" data-theme={theme} style={themeVars(theme) as CSSProperties}>
                    <Background theme={theme} />
                    <div className="grain" aria-hidden="true" />
                    <div className="frame" aria-hidden="true" />
                    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] btn sm">
                      Skip to content
                    </a>
                    <Navbar />
                    <main id="main" ref={main} style={{ position: "relative", zIndex: 5 }}>
                      {children}
                    </main>
                    <Footer />
                    <TabBar />
                  </div>
                </CheckoutProvider>
              </TransitionProvider>
            </CurrencyProvider>
          </SessionProvider>
        </ToastProvider>
      </MotionConfig>
    </SettingsProvider>
  );
}
