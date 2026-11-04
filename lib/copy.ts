/**
 * Editable page copy. Format rules (kept simple for the admin panel):
 *   - a new line in the box = a line break on the page
 *   - *stars around words* = accent colour
 *   - "steps" and "list" boxes: one item per line; steps use "Title | description"
 */
export type CopyField = { key: string; label: string; page: string; kind: "line" | "text" | "steps" | "list" };

export const COPY_FIELDS: CopyField[] = [
  { page: "Home", key: "how_title", label: "“How it works” heading", kind: "text" },
  { page: "Home", key: "home_steps", label: "How it works — steps", kind: "steps" },
  { page: "Home", key: "faq_title", label: "FAQ heading", kind: "text" },
  { page: "Home", key: "discord_title", label: "Discord block heading", kind: "text" },
  { page: "Home", key: "discord_text", label: "Discord block text", kind: "text" },
  { page: "Subscriptions", key: "subs_title", label: "Page heading", kind: "text" },
  { page: "Services", key: "services_title", label: "Page heading", kind: "text" },
  { page: "Services", key: "services_banner", label: "Bottom banner text", kind: "line" },
  { page: "Custom", key: "custom_title", label: "Page heading", kind: "text" },
  { page: "Custom", key: "custom_lead", label: "Intro text", kind: "text" },
  { page: "Custom", key: "custom_steps", label: "How quotes work — steps", kind: "steps" },
  { page: "Custom", key: "custom_form_title", label: "Form heading", kind: "text" },
  { page: "Custom", key: "custom_points", label: "Form bullet points", kind: "list" },
  { page: "Updates", key: "updates_title", label: "Page heading", kind: "text" },
  { page: "Footer", key: "footer_tagline", label: "Footer tagline", kind: "text" },
];

export const DEFAULT_COPY: Record<string, string> = {
  how_title: "Three steps.\nZero grinding.",
  home_steps:
    "Choose | Pick a weekly or monthly plan, or order a one-off hunt from the services page.\nPay | Card, Apple Pay, Google Pay, PayPal or crypto through secure checkout. Takes a minute.\nWe hunt | Your order joins the queue and progress lands in your Discord DMs until it's done.",
  faq_title: "Before\nyou order.",
  discord_title: "The vault's front door\nis on Discord.",
  discord_text: "Order updates, event drops and first dibs on limited slots — all in one server.",
  subs_title: "Weekly grind.\nYou sleep, *we hunt.*",
  services_title: "One-off hunts,\n*forged to order.*",
  services_banner: "Not on the list? Ask for it.",
  custom_title: "Not on the list?\n*We'll hunt it down.*",
  custom_lead: "Tell us the target, the deadline and your budget. You'll get a quote within a day — and you only pay once you accept it.",
  custom_steps:
    "Send | Fill in the form with what you're after.\nGet a quote | We reply on Discord within 24 hours with a price and timeline.\nPay & we start | Accept and a pay button appears in your account. Work starts right after.",
  custom_form_title: "Your target,\nyour terms.",
  custom_points: "Quotes in USD, no surprises later\nPay only after you accept the quote\nProgress updates on Discord\nAnything that's in the game right now",
  updates_title: "Limited drops.\n*Clock's running.*",
  footer_tagline: "Hunts, dust and raids for Pokémon GO trainers who'd rather not grind.",
};

export const parseSteps = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [t, ...d] = l.split("|");
      return { title: t.trim(), text: d.join("|").trim() };
    });

export const parseList = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
