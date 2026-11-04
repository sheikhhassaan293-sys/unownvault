import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "weekly"],
    ["/subscriptions", 0.9, "weekly"],
    ["/services", 0.9, "weekly"],
    ["/updates", 0.8, "daily"],
    ["/custom", 0.7, "monthly"],
  ];
  return pages.map(([p, priority, changeFrequency]) => ({ url: `${SITE_URL}${p}`, changeFrequency, priority }));
}
