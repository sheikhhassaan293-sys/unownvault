import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "UnownVault limited offers";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ theme: "temple", eyebrow: "04 / Updates & offers", title: "Clock's running." });
}
