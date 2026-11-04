import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "UnownVault custom requests";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ theme: "forest", eyebrow: "03 / Custom requests", title: "We'll hunt it down." });
}
