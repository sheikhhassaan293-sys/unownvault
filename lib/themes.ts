/**
 * THEME TOKENS — one place to tweak every page's colours.
 * These are written onto the page as CSS variables (--bg, --bg2, --acc, --rgb, --text …)
 * by components/Shell.tsx, so changing a hex here changes the whole page.
 */

export type ThemeKey = "abyss" | "storm" | "magma" | "forest" | "temple" | "neutral";
export type ShardElement = "ocean" | "thunder" | "lava" | "forest" | "temple";

export type Theme = {
  key: ThemeKey;
  label: string;
  element: ShardElement;
  bg: string; // page base
  bg2: string; // panels / cards
  accent: string; // the one accent colour for the page
  accent2?: string; // optional secondary (Magma only)
  text: string;
  /** Text colour used ON TOP of the accent (buttons, chips). */
  onAccent: string;
};

export const themes: Record<ThemeKey, Theme> = {
  abyss: {
    key: "abyss",
    label: "Abyss",
    element: "ocean",
    bg: "#03080C",
    bg2: "#0A1E26",
    accent: "#3CF2C4",
    text: "#E8EDF2",
    onAccent: "#03080C",
  },
  storm: {
    key: "storm",
    label: "Thunderstorm",
    element: "thunder",
    bg: "#08070F",
    bg2: "#15131F",
    accent: "#C4B5FF",
    text: "#ECEAF4",
    onAccent: "#08070F",
  },
  magma: {
    key: "magma",
    label: "Magma",
    element: "lava",
    bg: "#0B0807",
    bg2: "#1A1210",
    accent: "#FF6A1A",
    accent2: "#B8231A",
    text: "#F2EAE6",
    onAccent: "#0B0807",
  },
  forest: {
    key: "forest",
    label: "Dark Forest",
    element: "forest",
    bg: "#050A07",
    bg2: "#0E1A12",
    accent: "#C8F56A",
    text: "#E6EEE8",
    onAccent: "#050A07",
  },
  temple: {
    key: "temple",
    label: "Temple",
    element: "temple",
    bg: "#0A0906",
    bg2: "#17130C",
    accent: "#E3B341",
    text: "#F0EBE0",
    onAccent: "#0A0906",
  },
  // Auth, account and admin — calm, fast, no heavy animation.
  neutral: {
    key: "neutral",
    label: "Neutral",
    element: "ocean",
    bg: "#0A0C0F",
    bg2: "#14181D",
    accent: "#DDE5EE",
    text: "#E8EDF2",
    onAccent: "#0A0C0F",
  },
};

export type NavRoute = {
  href: string;
  label: string;
  short: string; // mobile tab bar
  index: string; // "01 / SUBSCRIPTIONS"
  theme: ThemeKey;
};

export const navRoutes: NavRoute[] = [
  { href: "/", label: "Home", short: "Home", index: "00", theme: "abyss" },
  { href: "/subscriptions", label: "Subscriptions", short: "Plans", index: "01", theme: "storm" },
  { href: "/services", label: "Services", short: "Services", index: "02", theme: "magma" },
  { href: "/custom", label: "Custom", short: "Custom", index: "03", theme: "forest" },
  { href: "/updates", label: "Updates", short: "Updates", index: "04", theme: "temple" },
];

export function themeForPath(pathname: string): ThemeKey {
  const p = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (p === "/") return "abyss";
  const hit = navRoutes.find((r) => r.href !== "/" && (p === r.href || p.startsWith(r.href + "/")));
  return hit ? hit.theme : "neutral";
}

export function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** CSS custom properties for a theme — applied inline on the theme root. */
export function themeVars(key: ThemeKey): Record<string, string> {
  const t = themes[key];
  return {
    "--bg": t.bg,
    "--bg2": t.bg2,
    "--acc": t.accent,
    "--acc2": t.accent2 ?? t.accent,
    "--rgb": hexToRgb(t.accent),
    "--text": t.text,
    "--text-rgb": hexToRgb(t.text),
    "--on-acc": t.onAccent,
  };
}
