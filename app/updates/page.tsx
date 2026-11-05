import type { Metadata } from "next";
import { EventsFeed } from "@/components/pages/EventsFeed";
import { OfferFeed } from "@/components/pages/OfferFeed";
import { getGameEvents } from "@/lib/game-events";
import { CurrencySwitch } from "@/components/providers/Currency";
import { CopyText } from "@/components/providers/Settings";
import { Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "Updates & limited offers",
  description: "Limited drops and what's on in Pokémon GO right now — event bundles, raid hours, Community Days and Spotlight Hours, updated automatically.",
  alternates: { canonical: "/updates" },
};

export default async function UpdatesPage() {
  const events = await getGameEvents();
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">04 / Updates &amp; offers</Reveal>
        <div className="head-row">
          <Reveal delay={0.08}>
            <h1 className="h2">
              <CopyText k="updates_title" />
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <CurrencySwitch />
          </Reveal>
        </div>
      </div>
      <OfferFeed />
      <EventsFeed events={events} />
    </div>
  );
}
