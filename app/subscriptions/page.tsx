import type { Metadata } from "next";
import { TierSwitcher } from "@/components/pages/TierSwitcher";
import { CopyText } from "@/components/providers/Settings";
import { Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "Subscriptions — weekly & monthly plans",
  description: "Weekly grind. You sleep, we hunt. Three weekly and three monthly plans for raids, shiny hunts and hundo hunts — cancel anytime.",
  alternates: { canonical: "/subscriptions" },
};

export default function SubscriptionsPage() {
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">01 / Subscriptions</Reveal>
        <Reveal delay={0.08}>
          <h1 className="h2">
            <CopyText k="subs_title" />
          </h1>
        </Reveal>
      </div>
      <TierSwitcher />
    </div>
  );
}
