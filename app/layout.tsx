import type { Metadata, Viewport } from "next";
import { Barlow, JetBrains_Mono, Unbounded } from "next/font/google";
import { Shell } from "@/components/Shell";
import { getSiteSettings } from "@/lib/data";
import { SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin"], weight: ["500", "700", "900"], variable: "--font-unbounded", display: "swap" });
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-barlow", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Pokémon GO hunts, dust & raid services`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: "/" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#03080C",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icons/icon-512.png`,
        email: settings.contact_email,
        sameAs: settings.discord_url.includes("your-invite") ? [] : [settings.discord_url],
        description: SITE_DESC,
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } },
    ],
  };
  return (
    <html lang="en" className={`${unbounded.variable} ${barlow.variable} ${jetbrains.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <Shell settings={settings}>{children}</Shell>
      </body>
    </html>
  );
}
