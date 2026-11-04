import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "UnownVault services — hunts, stardust, levelling and raids";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ theme: "magma", eyebrow: "02 / Services", title: "Forged to order." });
}
