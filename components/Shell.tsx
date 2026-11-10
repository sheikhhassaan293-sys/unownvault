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
                    <OfflineGate path={path}>
                      <MaintenanceBar />
                      <UsernameGate />
                      <Navbar />
                      <main id="main" ref={main} style={{ position: "relative", zIndex: 5 }}>
                        {children}
                      </main>
                      <Footer />
                      <TabBar />
                    </OfflineGate>
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

/**
 * The owner's "Website off" switch (Admin → Site & text). While it's on, visitors see a
 * "not available" screen instead of the site. The admin still sees everything (with a reminder
 * bar), and the login page stays reachable so the owner can sign in and switch it back.
 */
function OfflineGate({ path, children }: { path: string; children: React.ReactNode }) {
  const { copy } = useSettings();
  const { isAdmin, live, user, ready } = useSession();
  const off = copy.site_offline === "on";
  if (!off) return <>{children}</>;
  const ownerPage = /^\/(login|admin|reset|auth)(\/|$)/.test(path);
  const admin = live ? ready && !!user && isAdmin : false;
  if (admin || ownerPage) {
    return (
      <>
        <div className="maint" role="status">
          The website is switched OFF: visitors see “not available”. Turn it back on in Admin → Site &amp; text.
        </div>
        {children}
      </>
    );
  }
  return (
    <main id="main" className="auth-wrap" style={{ position: "relative", zIndex: 5, minHeight: "100svh" }}>
      <div className="panel auth-card" style={{ textAlign: "center" }} role="status">
        <div className="label bare" style={{ justifyContent: "center" }}>
          UnownVault
        </div>
        <h1 className="h2" style={{ margin: "14px 0 12px" }}>
          Unavailable
        </h1>
        {/* optional extra line from Admin; the old default wording is no longer shown */}
        {copy.offline_message && !/offline for a little while/i.test(copy.offline_message) && (
          <p className="muted" style={{ whiteSpace: "pre-line" }}>
            {copy.offline_message}
          </p>
        )}
        <p style={{ marginTop: 26 }}>
          <a className="linkish" href="/login">
            Owner log in
          </a>
        </p>
      </div>
    </main>
  );
}

function MaintenanceBar() {
  const { maintenance, queue_open } = useSettings();
  if (!maintenance && queue_open !== false) return null;
  if (!maintenance) {
    return (
      <div className="maint" role="status">
        Orders are paused right now — we&apos;ll reopen soon. Join our Discord to hear first.
      </div>
    );
  }
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
