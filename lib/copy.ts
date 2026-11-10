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
  // what buyers pay — shown on the services/plans pages, at checkout and with quotes (empty = hidden)
  { page: "Prices & tax", key: "price_note", label: "Price note (services, plans, quotes)", kind: "text" },
  { page: "Prices & tax", key: "pay_whop_note", label: "Checkout: card / PayPal / crypto via Whop", kind: "text" },
  { page: "Prices & tax", key: "pay_manual_note", label: "Checkout: other payment methods", kind: "text" },
  // the /terms page (one section each)
  { page: "Policies", key: "terms_text", label: "Terms of service", kind: "text" },
  { page: "Policies", key: "refund_text", label: "Refund policy", kind: "text" },
  { page: "Policies", key: "privacy_text", label: "Privacy", kind: "text" },
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
  custom_lead: "Just tell us what you need. Your quote shows up right here, and you only pay once you accept it.",
  custom_steps:
    "Send | Log in and tell us what you need — that's the only thing required.\nGet a quote | Your price and how long it'll take show up right here on the site.\nPay & we start | Hit Pay on your quote. Work starts right after.",
  custom_form_title: "Your target,\nyour terms.",
  custom_points: "Quotes in USD, no surprises later\nPay only after you accept the quote\nProgress updates on Discord\nAnything that's in the game right now",
  updates_title: "Limited drops.\n*Clock's running.*",
  footer_tagline: "Hunts, dust and raids for Pokémon GO trainers who'd rather not grind.",
  price_note:
    "Prices are in USD. Depending on your country, sales tax or VAT may be added at checkout. You always see the exact total before you pay, and we never add any other fees.",
  pay_whop_note:
    "Card, Apple Pay, Google Pay, PayPal or crypto (secure checkout by Whop): the price above, plus sales tax or VAT only if your country charges it. Whop shows the final total before you confirm.",
  pay_manual_note: "Other payment methods: you pay exactly the price above. No tax or fees added.",
  // "Website off" switch: "on" = visitors see the not-available screen
  site_offline: "",
  offline_message: "We're offline for a little while. Please check back soon.",
  terms_text:
    "UnownVault is an independent service. We are not affiliated with, endorsed by, or connected to Niantic, Nintendo or The Pokémon Company.\n\nWhen you order, you get the service described on the item, plan or quote you paid for. Delivery times are estimates and can change with in-game events, availability and your cooldown timer.\n\nUsing third-party services can be against a game's own rules and carries a risk to your game account. By ordering you accept that risk. We can't be responsible for actions a game publisher takes on an account.\n\nPlease give accurate details for your order and reply in your order chat when we need something from you. We may decline or cancel an order and refund it if we can't complete it.\n\nPlans renew automatically each week or month at the price shown until you cancel. You can cancel any time from your account.",
  refund_text:
    "Not started yet: if we haven't begun your order, ask in your order chat or on Discord and we'll refund it in full.\n\nWe can't deliver: if we can't complete an order, we refund the part that wasn't delivered.\n\nDelivered orders: once an order is delivered it can't be refunded. If something is wrong with it, tell us within 48 hours and we'll put it right.\n\nPlans: you can cancel any time and keep your benefits until the end of the period you paid for. We don't refund part of a period.\n\nRefunds go back to the payment method you used. Please talk to us before opening a payment dispute; we answer fast and it's usually the quicker fix.",
  privacy_text:
    "We keep only what we need to run your order: your trainer name, your Discord name or email, your orders and requests, and the messages in your order chat.\n\nPayments are handled by Whop. We never see or store your card details.\n\nWe don't sell your data or share it with anyone except the services that run this site (hosting, database and payments).\n\nWant your account or data deleted? Message us on Discord or email us and we'll remove it.",
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
