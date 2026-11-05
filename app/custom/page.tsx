import type { Metadata } from "next";
import { CustomPoints, QuoteSteps } from "@/components/pages/CopyBlocks";
import { PastRequests, RequestForm } from "@/components/pages/RequestForm";
import { CopyText } from "@/components/providers/Settings";
import { Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "Custom requests — get a quote",
  description: "Not on the list? Tell us what you need. You'll get a quote right on the site and only pay once you accept it.",
  alternates: { canonical: "/custom" },
};

export default function CustomPage() {
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">03 / Custom requests</Reveal>
        <div className="head-row">
          <Reveal delay={0.08}>
            <h1 className="h2">
              <CopyText k="custom_title" />
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lead" style={{ maxWidth: "40ch" }}>
              <CopyText k="custom_lead" />
            </p>
          </Reveal>
        </div>
      </div>

      <QuoteSteps />

      <Reveal className="panel custom" style={{ marginTop: 56 }}>
        <div>
          <div className="label">The request</div>
          <h2 className="h2">
            <CopyText k="custom_form_title" />
          </h2>
          <CustomPoints />
        </div>
        <RequestForm />
      </Reveal>

      <PastRequests />
    </div>
  );
}
