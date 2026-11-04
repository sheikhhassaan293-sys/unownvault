"use client";

import { MotionConfig } from "framer-motion";
import { useAppPath as usePathname } from "@/lib/paths";
import { useEffect, useRef, type CSSProperties } from "react";
import { themeForPath, themeVars } from "@/lib/themes";
import type { CustomRequest, Order } from "@/lib/types";
import { Background } from "./background/Background";
import { Footer, Navbar, TabBar } from "./Chrome";
import { CheckoutProvider } from "./providers/Checkout";
import { CurrencyProvider } from "./providers/Currency";
import { SessionProvider, useSession } from "./providers/Session";
import { SettingsProvider, useSettings, type SiteContent } from "./providers/Settings";
import { ToastProvider } from "./providers/Toast";
import { TransitionProvider, useThemedNavigate } from "./providers/Transition";

/** App frame: theme tokens from the URL, animated background, nav, footer, global providers. */
export function Shell({
  content,
  mockNow,
  demoOrders,
  demoRequests,
  children,
}: {
  content: SiteContent;
  mockNow: string;
  demoOrders: Order[];
  demoRequests: CustomRequest[];
  children: React.ReactNode;
}) {
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
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <SettingsProvider value={content} mockNow={mockNow}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <SessionProvider demoOrders={demoOrders} demoRequests={demoRequests}>
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
                    <MaintenanceBar />
                    <UsernameGate />
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

function MaintenanceBar() {
  const { maintenance } = useSettings();
  if (!maintenance) return null;
  return (
    <div className="maint" role="status">
      Maintenance in progress — checkout is paused for a bit. Browse away, we&apos;ll be right back.
    </div>
  );
}

/** Live: someone signed in (e.g. with Discord) but hasn't picked a trainer name → send them to pick one. */
function UsernameGate() {
  const { live, ready, user, needsUsername } = useSession();
  const navigate = useThemedNavigate();
  const path = usePathname();
  useEffect(() => {
    if (live && ready && user && needsUsername && path !== "/signup") navigate("/signup?step=name");
  }, [live, ready, user, needsUsername, path, navigate]);
  return null;
}
