import type { Metadata } from "next";
import { OfferFeed } from "@/components/pages/OfferFeed";
import { CurrencySwitch } from "@/components/providers/Currency";
import { Reveal } from "@/components/ui";
import { getOffers, MOCK_NOW } from "@/lib/data";

export const metadata: Metadata = {
  title: "Updates & limited offers",
  description: "Limited drops. Clock's running. Event bundles, raid hour packages and stardust deals — each with a live countdown.",
  alternates: { canonical: "/updates" },
};

export default async function UpdatesPage() {
  const offers = await getOffers();
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">04 / Updates &amp; offers</Reveal>
        <div className="head-row">
          <Reveal delay={0.08}>
            <h1 className="h2">
              Limited drops.
              <br />
              <span className="acc">Clock&apos;s running.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <CurrencySwitch />
          </Reveal>
        </div>
      </div>
      <OfferFeed offers={offers} mockNow={MOCK_NOW} />
    </div>
  );
}
