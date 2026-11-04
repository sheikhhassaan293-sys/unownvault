"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navRoutes, themeForPath, themes } from "@/lib/themes";
import { LogoMark, Wordmark } from "./Logo";
import { CurrencySwitch } from "./providers/Currency";
import { useSession } from "./providers/Session";
import { useSettings } from "./providers/Settings";
import { Link } from "./providers/Transition";
import { ShardBullet } from "./ShardBullet";
import { DiscordLink } from "./ui";

const isOn = (href: string, path: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

export function Navbar() {
  const path = usePathname();
  const { user, ready } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const theme = themes[themeForPath(path)];

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <Link className="brand" href="/" aria-label="UnownVault home">
        <LogoMark />
        <Wordmark />
      </Link>
      <span className="demo-pill hide-m">DEMO</span>
      <nav className="links" aria-label="Main">
        {navRoutes.map((r) => (
          <Link key={r.href} href={r.href} className={isOn(r.href, path) ? "on" : ""} aria-current={isOn(r.href, path) ? "page" : undefined}>
            <ShardBullet element={theme.element} />
            {r.label}
          </Link>
        ))}
      </nav>
      <div className="nav-r">
        <DiscordLink className="btn ghost sm hide-m">Discord</DiscordLink>
        {ready && user ? (
          <Link className="userchip" href="/account">
            {user.username}
          </Link>
        ) : (
          <Link className="btn sm" href="/signup" style={{ visibility: ready ? "visible" : "hidden" }}>
            Sign up
          </Link>
        )}
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Pages">
      {navRoutes.map((r) => {
        const t = themes[r.theme];
        const on = isOn(r.href, path);
        return (
          <Link key={r.href} href={r.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
            <ShardBullet element={t.element} style={{ color: t.accent }} />
            {r.short}
          </Link>
        );
      })}
    </nav>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void> };

export function Footer() {
  const { contact_email } = useSettings();
  const [install, setInstall] = useState<BIPEvent | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setInstall(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  return (
    <footer className="footer">
      <div>
        <Link className="brand" href="/">
          <LogoMark />
          <Wordmark />
        </Link>
        <p>Hunts, dust and raids for Pokémon GO trainers who&apos;d rather not grind.</p>
        <div style={{ marginTop: 18 }}>
          <CurrencySwitch />
        </div>
      </div>
      <div>
        <h4>Pages</h4>
        {navRoutes.map((r) => (
          <Link key={r.href} href={r.href}>
            {r.label === "Custom" ? "Custom requests" : r.label}
          </Link>
        ))}
      </div>
      <div>
        <h4>Help</h4>
        <Link href="/#faq">FAQ</Link>
        <DiscordLink className="">Discord</DiscordLink>
        <a href={`mailto:${contact_email}`}>{contact_email}</a>
        <Link href="/account">Your account</Link>
        {install && (
          <button
            className="fbtn"
            onClick={async () => {
              await install.prompt();
              setInstall(null);
            }}
          >
            Install UnownVault ↓
          </button>
        )}
      </div>
      <div className="disc">
        <span>Not affiliated with, endorsed by, or connected to Niantic, Nintendo or The Pokémon Company.</span>
        <span className="mono">DEMO BUILD · PLACEHOLDER PRICES &amp; CONTENT</span>
      </div>
    </footer>
  );
}
