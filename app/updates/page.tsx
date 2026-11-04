import type { Metadata } from "next";
import { OfferFeed } from "@/components/pages/OfferFeed";
import { CurrencySwitch } from "@/components/providers/Currency";
import { CopyText } from "@/components/providers/Settings";
import { Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "Updates & limited offers",
  description: "Limited drops. Clock's running. Event bundles, raid hour packages and stardust deals — each with a live countdown.",
  alternates: { canonical: "/updates" },
};

export default function UpdatesPage() {
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
    </div>
  );
}
