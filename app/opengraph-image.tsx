import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "UnownVault — Shundos, on order.";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ theme: "abyss", eyebrow: "Services for Pokémon GO", title: "Shundos, on order." });
}
