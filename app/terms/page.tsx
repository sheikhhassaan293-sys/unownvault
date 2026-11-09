import type { Metadata } from "next";
import { CopyText } from "@/components/providers/Settings";
import { Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms, refunds & privacy",
  description: "How UnownVault orders work: our terms of service, refund policy and how we handle your data.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">The small print</Reveal>
        <Reveal delay={0.08}>
          <h1 className="h2">Terms, refunds &amp; privacy.</h1>
        </Reveal>
      </div>
      <div className="legal">
        <h2 id="terms" className="h3">
          Terms of service
        </h2>
        <p>
          <CopyText k="terms_text" />
        </p>
        <h2 id="refunds" className="h3">
          Refund policy
        </h2>
        <p>
          <CopyText k="refund_text" />
        </p>
        <h2 id="privacy" className="h3">
          Privacy
        </h2>
        <p>
          <CopyText k="privacy_text" />
        </p>
      </div>
    </div>
  );
}
