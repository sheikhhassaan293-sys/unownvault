# UnownVault — Phase 1 demo review

Front-end only. Nothing is charged, stored on a server, or emailed. Everything below the line "Mocked" becomes real in Phase 2 without a redesign.

## Run it
```bash
npm install
npm run dev        # http://localhost:3000
```
`npm run build && npm start` for a production run (this also turns on the service worker / install prompt).

## Real (already production-grade)
- Five themed pages with their own colours and animated backgrounds: Home/Abyss, Subscriptions/Thunderstorm, Services/Magma, Custom/Dark Forest, Updates/Temple.
- Theme wipe between pages (~600ms), magma screen-shake, storm lightning that lights the page border.
- Backgrounds: one canvas, DPR capped at 1.5, paused when the tab is hidden, a single static frame when the device asks for reduced motion, and a CSS gradient if canvas isn't available.
- Weekly/monthly toggle, featured tier with animated edge, comparison table built from the data.
- Service grid with category filter; featured service is the big card.
- Offer feed with live countdowns; expired and not-yet-started offers hide themselves.
- Display currency switcher (USD / EUR / GBP / PKR), remembered per visitor.
- Custom request form with validation, image preview and a success state with a request ID.
- Trainer-name rules: 3–20 chars, letters/numbers/_, profanity filter (`lib/username.ts`).
- Mobile bottom tab bar, ShardBullet bullets, fonts self-hosted via `next/font`.
- SEO: per-page titles/descriptions/canonicals, themed Open Graph + Twitter share images, `sitemap.xml`, `robots.txt`, Organization + WebSite + FAQPage structured data.
- PWA: manifest, icons (incl. maskable + Apple), service worker with offline page, "Install UnownVault" link in the footer when Chrome offers it.

## Mocked
| Feature | Phase 1 | Phase 2 |
|---|---|---|
| Content | `data/content.ts` | Supabase tables (same shape, `lib/types.ts`) |
| Sign up / log in | Any details work; stored in your browser only | Supabase email + Discord (+ Patreon) |
| Username "taken" check | `taken_usernames` list in content.ts | Live DB lookup |
| Checkout | Dialog shows where Whop's embedded checkout goes | Whop embedded checkout + webhooks |
| Pay with Patreon | Toast | Patreon join link per tier |
| Other payment methods | Built, but off (`manual_payments_enabled: false`) | Same UI, saved to orders for admin confirmation |
| Account page | Sample plan, orders, requests | Your real data |
| Custom requests | Saved in your browser | Saved to DB, quotes from admin |
| Discord button | Toast until you set a real invite | Your invite link |
| Offer dates | Shifted so countdowns are always live | Real start/end times |

## Easy knobs
- **Colours**: `lib/themes.ts` — one block per page (`bg`, `bg2`, `accent`, `text`).
- **Fonts**: `app/layout.tsx` (Unbounded / Barlow / JetBrains Mono). Type scale lives at the top of `app/globals.css`.
- **Prices, tiers, features, services, offers, FAQ, homepage headline, Discord link, payment instructions**: `data/content.ts`. Prices are stored in USD.
- **Currency estimates**: `site_settings.fx_rates` in `data/content.ts`.
- **Show manual payments**: set `manual_payments_enabled: true`. **Hide Patreon**: set `patreon_enabled: false`.
- **Site URL for SEO**: `NEXT_PUBLIC_SITE_URL` (see `.env.example`).
- **Background animation**: `components/background/scenes.ts` (one function per theme; counts and speeds are at the top of each).
- **Page copy**: each page lives in `app/<page>/page.tsx`.

## Columns added to the spec's data model
Needed by the design, worth confirming before Phase 2:
- `subscription_tiers`: `tagline`, `compare` (jsonb for the comparison table), `patreon_enabled`.
- `services`: `featured`, `popular`, `currency`.
- `offers`: `currency`.
- `custom_requests`: `request_type`, `target`, `discord_username`, `image_url`, `quote_amount`, `created_at`.
- `site_settings`: hero eyebrow/accent line, status-block labels, `queue_open`, `patreon_enabled`, `manual_payments_enabled`, `fx_rates`, `contact_email`.
- Also a `faqs` table so the FAQ is editable from admin.

## Known gaps (planned for later milestones)
- No admin panel yet (Milestone 8).
- Cross-browser testing so far is Chromium only. Safari/Firefox/Edge pass comes with the Milestone 9 polish, along with a Lighthouse run on a deployed URL.
- Share images fetch the Unbounded font from Google when rendered. If that fetch fails they fall back to a default font.
