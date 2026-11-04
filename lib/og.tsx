import { ImageResponse } from "next/og";
import { themes, type ThemeKey } from "@/lib/themes";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/** Pulls one weight of Unbounded from Google Fonts for the share card (falls back to the default font). */
async function unbounded(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Unbounded:wght@900&text=${encodeURIComponent(text)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; og-image)" },
      })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Discord / X / iMessage preview card in the page's own theme. */
export async function renderOg({ theme, eyebrow, title }: { theme: ThemeKey; eyebrow: string; title: string }) {
  const t = themes[theme];
  const font = await unbounded(title + eyebrow + "UNOWNVAULT");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `radial-gradient(circle at 80% 10%, ${t.accent}33, transparent 55%), linear-gradient(180deg, ${t.bg2}, ${t.bg})`,
          color: t.text,
          fontFamily: font ? "Unbounded" : undefined,
          border: `2px solid ${t.accent}44`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: t.accent }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="10.2" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.6 2.4" />
            <path d="M11.6 9.8v7.6a4.4 4.4 0 0 0 8.8 0V9.8" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M16 21.8v3.4" stroke="currentColor" strokeWidth="2.4" />
          </svg>
          <div style={{ display: "flex", fontSize: 34, color: t.text }}>
            UNOWN<span style={{ color: t.accent }}>VAULT</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: t.accent }}>{eyebrow.toUpperCase()}</div>
          <div style={{ fontSize: 96, lineHeight: 0.95, letterSpacing: -3, display: "flex", flexWrap: "wrap" }}>{title}</div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: font ? [{ name: "Unbounded", data: font, weight: 900, style: "normal" }] : undefined },
  );
}
