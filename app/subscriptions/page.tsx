import type { Metadata } from "next";
import { TierSwitcher } from "@/components/pages/TierSwitcher";
import { Reveal } from "@/components/ui";
import { getTiers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Subscriptions — weekly & monthly plans",
  description: "Weekly grind. You sleep, we hunt. Three weekly and three monthly plans for raids, shiny hunts and hundo hunts — cancel anytime.",
  alternates: { canonical: "/subscriptions" },
};

export default async function SubscriptionsPage() {
  const tiers = await getTiers();
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">01 / Subscriptions</Reveal>
        <Reveal delay={0.08}>
          <h1 className="h2">
            Weekly grind.
            <br />
            You sleep, <span className="acc">we hunt.</span>
          </h1>
        </Reveal>
      </div>
      <TierSwitcher tiers={tiers} />
    </div>
  );
}
