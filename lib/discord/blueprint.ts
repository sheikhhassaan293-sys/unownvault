/**
 * The UnownVault Discord server layout: roles, categories, channels, permissions and the
 * pinned info posts. Text comes from the live site content, so plans / services / FAQ in
 * Discord match the website at the moment you press "Build server".
 */
import { parseSteps } from "@/lib/copy";
import type { Faq, Offer, Service, SiteSettings, SubscriptionTier } from "@/lib/types";

type Content = {
  settings: SiteSettings;
  tiers: SubscriptionTier[];
  services: Service[];
  categories: { slug: string; label: string }[];
  offers: Offer[];
  faqs: Faq[];
};

// Discord permission bits (BigInt: some flags are above 2^31)
const B = BigInt;
const P = {
  KICK: B(1) << B(1),
  ADD_REACTIONS: B(1) << B(6),
  VIEW: B(1) << B(10),
  SEND: B(1) << B(11),
  MANAGE_MESSAGES: B(1) << B(13),
  EMBED_LINKS: B(1) << B(14),
  ATTACH: B(1) << B(15),
  HISTORY: B(1) << B(16),
  MENTION_EVERYONE: B(1) << B(17),
  MANAGE_THREADS: B(1) << B(34),
  CREATE_PUBLIC_THREADS: B(1) << B(35),
  CREATE_PRIVATE_THREADS: B(1) << B(36),
  SEND_IN_THREADS: B(1) << B(38),
  MODERATE: B(1) << B(40),
};
const bits = (...xs: bigint[]) => xs.reduce((a, b) => a | b, B(0)).toString();
const NO_POSTING = [P.SEND, P.SEND_IN_THREADS, P.CREATE_PUBLIC_THREADS, P.CREATE_PRIVATE_THREADS];

export type RoleSpec = { key: string; name: string; color: number; hoist: boolean; permissions: string };
export type Access = "info" | "open" | "staff" | "customers-post";
export type Embed = { title?: string; description?: string; color?: number; url?: string; fields?: { name: string; value: string; inline?: boolean }[]; footer?: { text: string } };
export type ChannelSpec = { name: string; topic: string; access: Access; posts: Embed[] };
export type CategorySpec = { name: string; access: Access; channels: ChannelSpec[] };

export const ROLES: RoleSpec[] = [
  { key: "owner", name: "Owner", color: 0xe3b341, hoist: true, permissions: "0" },
  { key: "staff", name: "Staff", color: 0xff6a1a, hoist: true, permissions: bits(P.MANAGE_MESSAGES, P.MODERATE, P.MANAGE_THREADS, P.KICK) },
  { key: "apex", name: "Apex Subscriber", color: 0xc4b5ff, hoist: true, permissions: "0" },
  { key: "hunter", name: "Hunter Subscriber", color: 0x3cf2c4, hoist: true, permissions: "0" },
  { key: "scout", name: "Scout Subscriber", color: 0xc8f56a, hoist: true, permissions: "0" },
  { key: "customer", name: "Customer", color: 0xdde5ee, hoist: false, permissions: "0" },
  { key: "member", name: "Member", color: 0x8a96a3, hoist: false, permissions: "0" },
];

/** Permission overwrites for a channel/category, given the created role ids. */
export function overwrites(access: Access, everyoneId: string, roles: Record<string, string>) {
  const staffAllow = { id: roles.staff, type: 0, allow: bits(P.VIEW, P.SEND, P.HISTORY, P.ATTACH, P.EMBED_LINKS, P.MANAGE_MESSAGES, P.MENTION_EVERYONE), deny: "0" };
  if (access === "open") return [];
  if (access === "staff") return [{ id: everyoneId, type: 0, allow: "0", deny: bits(P.VIEW) }, staffAllow, ...(roles.owner ? [{ ...staffAllow, id: roles.owner }] : [])];
  const readOnly = { id: everyoneId, type: 0, allow: bits(P.VIEW, P.HISTORY, P.ADD_REACTIONS), deny: bits(...NO_POSTING) };
  if (access === "info") return [readOnly, staffAllow];
  // customers-post: read-only for everyone, customers & subscribers can post (with images)
  const poster = (id: string) => ({ id, type: 0, allow: bits(P.SEND, P.ATTACH, P.EMBED_LINKS), deny: "0" });
  return [readOnly, staffAllow, ...["customer", "apex", "hunter", "scout"].filter((k) => roles[k]).map((k) => poster(roles[k]))];
}

const money = (n: number) => `$${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2)}`;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const AQUA = 0x3cf2c4, VIOLET = 0xc4b5ff, ORANGE = 0xff6a1a, LIME = 0xc8f56a, GOLD = 0xe3b341, GREY = 0xdde5ee;

export function blueprint(c: Content, site: string): CategorySpec[] {
  const s = c.settings;
  const tiers = c.tiers.filter((t) => t.active !== false).sort((a, b) => a.sort_order - b.sort_order);
  const services = c.services.filter((x) => x.active !== false).sort((a, b) => a.sort_order - b.sort_order);
  const steps = parseSteps(s.copy?.home_steps ?? "");
  const quoteSteps = parseSteps(s.copy?.custom_steps ?? "");
  const now = Date.now();
  const offers = c.offers.filter((o) => o.published && Date.parse(o.starts_at) <= now && Date.parse(o.ends_at) > now);

  const planEmbed = (period: "weekly" | "monthly"): Embed => ({
    title: period === "weekly" ? "Weekly plans" : "Monthly plans",
    color: VIOLET,
    url: `${site}/subscriptions`,
    fields: tiers
      .filter((t) => t.period === period)
      .slice(0, 25)
      .map((t) => ({
        name: `${t.recommended ? "★ " : ""}${t.name} — ${money(t.price)} / ${period === "weekly" ? "week" : "month"}`,
        value: clip([t.tagline, ...t.features.map((f) => `• ${f}${/shiny|shundo/i.test(f) ? "*" : ""}`)].filter(Boolean).join("\n"), 1000),
      })),
    footer: { text: clip(`* ${s.availability_note}`, 2000) },
  });

  const serviceEmbeds: Embed[] = c.categories
    .map((cat) => {
      const list = services.filter((x) => x.category === cat.slug);
      if (!list.length) return null;
      return {
        title: cat.label,
        color: ORANGE,
        url: `${site}/services`,
        fields: list.slice(0, 25).map((x) => ({
          name: `${x.name} — ${x.quote_only ? "quoted" : `${x.price_is_from ? "from " : ""}${money(x.price)}${x.allow_quantity ? " each" : ""}`}`,
          value: clip(`${x.description}\n${x.quote_only ? "Ask for a quote on the website" : `Delivery: ${x.delivery_time}`}`, 1000),
        })),
      } as Embed;
    })
    .filter(Boolean) as Embed[];
  if (serviceEmbeds.length) {
    serviceEmbeds[serviceEmbeds.length - 1].footer = {
      text: "⏱ Delivery times are subject to your cooldown timer (based on your last catch or PokéStop spin).",
    };
  }

  return [
    {
      name: "START HERE",
      access: "info",
      channels: [
        {
          name: "welcome",
          topic: `Welcome to UnownVault — ${site}`,
          access: "info",
          posts: [
            {
              title: "Welcome to UnownVault",
              color: AQUA,
              url: site,
              description: [
                `**${s.hero_headline} ${s.hero_headline_accent}**`,
                s.hero_tagline,
                "",
                `🛒 Order on the website: ${site}`,
                "📌 Read #rules and #how-to-order first",
                "🎫 Need help with an order? Open a ticket in #open-a-ticket",
              ].join("\n"),
              footer: { text: "Not affiliated with, endorsed by, or connected to Niantic, Nintendo or The Pokémon Company." },
            },
          ],
        },
        {
          name: "rules",
          topic: "Read before posting",
          access: "info",
          posts: [
            {
              title: "Server rules",
              color: GREY,
              description: [
                "**1.** Be respectful. No harassment, hate speech or slurs.",
                "**2.** No scams, no advertising, no selling — only UnownVault staff sell here.",
                "**3.** Never share your account login in public channels. Account details go only in your private ticket.",
                "**4.** Orders and payments happen on the website only. Staff will never ask you to pay in DMs.",
                "**5.** Keep each channel on topic. Spam or repeated pings = timeout.",
                "**6.** Follow Discord's Terms of Service and Community Guidelines.",
                "",
                "Staff decisions are final. Breaking the rules can mean a timeout or a ban.",
              ].join("\n"),
            },
          ],
        },
        {
          name: "how-to-order",
          topic: `Three steps — ${site}`,
          access: "info",
          posts: [
            {
              title: "How to order",
              color: AQUA,
              url: `${site}/services`,
              description: steps.map((st, i) => `**${String(i + 1).padStart(2, "0")} · ${st.title}**\n${st.text}`).join("\n\n"),
              fields: [
                { name: "Plans", value: `${site}/subscriptions`, inline: true },
                { name: "One-off services", value: `${site}/services`, inline: true },
                { name: "Custom requests", value: `${site}/custom`, inline: true },
                { name: "Pay with", value: s.status_payments || "Card · PayPal · Crypto", inline: true },
                { name: "Queue", value: s.queue_open ? "🟢 Open" : "🔴 Full — back soon", inline: true },
              ],
            },
          ],
        },
        {
          name: "faq",
          topic: "Answers before you order",
          access: "info",
          posts: [
            {
              title: "FAQ",
              color: AQUA,
              url: `${site}/#faq`,
              fields: [...c.faqs]
                .sort((a, b) => a.sort_order - b.sort_order)
                .slice(0, 25)
                .map((f) => ({ name: clip(f.question, 256), value: clip(f.answer, 1000) })),
            },
          ],
        },
      ],
    },
    {
      name: "VAULT NEWS",
      access: "info",
      channels: [
        { name: "announcements", topic: "News from the vault", access: "info", posts: [] },
        {
          name: "limited-offers",
          topic: `Limited drops — ${site}/updates`,
          access: "info",
          posts: offers.length
            ? offers.slice(0, 5).map((o) => ({
                title: `${o.pinned ? "📌 " : ""}${o.title} — ${money(o.price)}`,
                color: GOLD,
                url: `${site}/updates`,
                description: clip(`${o.body}\n\nEnds <t:${Math.floor(Date.parse(o.ends_at) / 1000)}:R>`, 4000),
              }))
            : [{ title: "Limited offers", color: GOLD, url: `${site}/updates`, description: `New drops land here and on ${site}/updates.` }],
        },
        {
          name: "queue-status",
          topic: "Is the queue open?",
          access: "info",
          posts: [{ title: s.queue_open ? "🟢 Queue is OPEN" : "🔴 Queue is FULL — back soon", color: s.queue_open ? LIME : ORANGE, description: `Order any time at ${site}` }],
        },
      ],
    },
    {
      name: "SHOP",
      access: "info",
      channels: [
        { name: "plans", topic: `Weekly & monthly plans — ${site}/subscriptions`, access: "info", posts: [planEmbed("weekly"), planEmbed("monthly")].filter((e) => e.fields?.length) },
        { name: "services", topic: `One-off orders — ${site}/services`, access: "info", posts: serviceEmbeds.slice(0, 10) },
        {
          name: "custom-requests",
          topic: `Not on the list? ${site}/custom`,
          access: "info",
          posts: [
            {
              title: "Custom requests",
              color: LIME,
              url: `${site}/custom`,
              description: [
                "Not on the list? Tell us what you need on the website — your quote shows up there and you only pay once you accept it.",
                "",
                ...quoteSteps.map((st, i) => `**${String(i + 1).padStart(2, "0")} · ${st.title}** — ${st.text}`),
                "",
                `Send a request: ${site}/custom`,
              ].join("\n"),
            },
          ],
        },
      ],
    },
    {
      name: "PROOF",
      access: "info",
      channels: [
        { name: "recent-orders", topic: "Live feed of new orders 🛒", access: "info", posts: [] },
        { name: "completed-orders", topic: "Delivered hunts, posted by staff", access: "info", posts: [] },
        {
          name: "reviews",
          topic: "Customers only — tell us how it went",
          access: "customers-post",
          posts: [{ title: "Reviews", color: GREY, description: "Got an order from us? Leave an honest review here. Only customers can post." }],
        },
      ],
    },
    {
      name: "COMMUNITY",
      access: "open",
      channels: [
        { name: "general", topic: "Hang out", access: "open", posts: [] },
        { name: "shiny-showcase", topic: "Show off your best catches", access: "open", posts: [] },
        { name: "events-chat", topic: "Talk about the current in-game events", access: "open", posts: [] },
      ],
    },
    {
      name: "SUPPORT",
      access: "info",
      channels: [
        {
          name: "open-a-ticket",
          topic: "Private help with an order",
          access: "info",
          posts: [
            {
              title: "Need help with an order?",
              color: AQUA,
              description:
                "Press the **Open ticket** button below to open a private channel with staff. Include your order number (it starts with UV-) — you'll find it in your account on the website.",
            },
          ],
        },
        { name: "order-log", topic: "Staff only", access: "staff", posts: [] },
        { name: "staff-chat", topic: "Staff only", access: "staff", posts: [] },
      ],
    },
  ];
}
