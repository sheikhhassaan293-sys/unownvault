import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "UnownVault",
    short_name: "UnownVault",
    description: "Hunts, dust and raid packs for Pokémon GO — plans, services and limited offers.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#03080C",
    theme_color: "#03080C",
    categories: ["games", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Plans", url: "/subscriptions" },
      { name: "Services", url: "/services" },
      { name: "Offers", url: "/updates" },
    ],
  };
}
