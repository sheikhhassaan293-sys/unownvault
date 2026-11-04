import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "UnownVault subscriptions — weekly and monthly plans";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({ theme: "storm", eyebrow: "01 / Subscriptions", title: "You sleep, we hunt." });
}
