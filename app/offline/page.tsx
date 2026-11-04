import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Served by the service worker when there's no connection. Kept dependency-free. */
export default function OfflinePage() {
  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <div className="label">No signal</div>
        <h1 className="h2">You&apos;re offline.</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          The vault needs a connection. Check your signal and try again — your orders are safe.
        </p>
        {/* plain <a> on purpose: a full reload is the right retry when offline */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="btn block" href="/">
          Try again
        </a>
      </div>
    </div>
  );
}
