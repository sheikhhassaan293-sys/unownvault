import type { Metadata } from "next";
import { PastRequests, RequestForm } from "@/components/pages/RequestForm";
import { ShardList } from "@/components/ShardBullet";
import { Reveal } from "@/components/ui";
import { getDemoAccount } from "@/lib/data";

export const metadata: Metadata = {
  title: "Custom requests — get a quote",
  description: "Not on the list? Tell us the target, deadline and budget. You'll get a quote within a day and only pay once you accept it.",
  alternates: { canonical: "/custom" },
};

const STEPS = [
  { n: "01", t: "Send", d: "Fill in the form with what you're after." },
  { n: "02", t: "Get a quote", d: "We reply on Discord within 24 hours with a price and timeline." },
  { n: "03", t: "Pay & we start", d: "Accept and a pay button appears in your account. Work starts right after." },
];

export default async function CustomPage() {
  const { custom_requests } = await getDemoAccount();
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">03 / Custom requests</Reveal>
        <div className="head-row">
          <Reveal delay={0.08}>
            <h1 className="h2">
              Not on the list?
              <br />
              <span className="acc">We&apos;ll hunt it down.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lead" style={{ maxWidth: "40ch" }}>
              Tell us the target, the deadline and your budget. You&apos;ll get a quote within a day — and you only pay once you accept it.
            </p>
          </Reveal>
        </div>
      </div>

      <ol className="qsteps" aria-label="How quotes work" style={{ listStyle: "none", padding: 0 }}>
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.n} delay={i * 0.08}>
            <span className="mono acc">{s.n}</span>
            <h2 className="h3">{s.t}</h2>
            <p>{s.d}</p>
          </Reveal>
        ))}
      </ol>

      <Reveal className="panel custom" style={{ marginTop: 56 }}>
        <div>
          <div className="label">The request</div>
          <h2 className="h2">
            Your target,
            <br />
            your terms.
          </h2>
          <ShardList
            element="forest"
            items={["Quotes in USD, no surprises later", "Pay only after you accept the quote", "Progress updates on Discord", "Anything that's in the game right now"]}
          />
        </div>
        <RequestForm />
      </Reveal>

      <PastRequests demo={custom_requests} />
    </div>
  );
}
