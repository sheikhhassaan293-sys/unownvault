import type { Metadata } from "next";
import { Price } from "@/components/providers/Currency";
import { Link } from "@/components/providers/Transition";
import { Arrow, DiscordLink, Reveal } from "@/components/ui";
import { getFaqs, getPopularServices, getSiteSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: { absolute: "UnownVault — Pokémon GO hunts, dust & raid services" },
  description:
    "Shundos, on order. Shiny, hundo and shundo hunts, stardust runs and raid packs for Pokémon GO — weekly and monthly plans or one-off orders.",
  alternates: { canonical: "/" },
};

const STEPS = [
  { n: "01", t: "Choose", d: "Pick a weekly or monthly plan, or order a one-off hunt from the services page." },
  { n: "02", t: "Pay", d: "Card, Apple Pay, Google Pay, PayPal or crypto through secure checkout. Takes a minute." },
  { n: "03", t: "We hunt", d: "Your order joins the queue and progress lands in your Discord DMs until it's done." },
];

export default async function Home() {
  const [s, popular, faqs] = await Promise.all([getSiteSettings(), getPopularServices(3), getFaqs()]);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <section className="hero">
        <div>
          <div className="label rise">00 / {s.hero_eyebrow}</div>
          <h1 className="h1 rise" style={{ ["--d" as string]: ".08s" }}>
            {s.hero_headline}
            <br />
            <em>{s.hero_headline_accent}</em>
          </h1>
          <p className="lead rise" style={{ ["--d" as string]: ".16s" }}>
            {s.hero_tagline}
          </p>
          <div className="ctas rise" style={{ ["--d" as string]: ".24s" }}>
            <Link className="btn" href="/subscriptions">
              View subscriptions <Arrow />
            </Link>
            <DiscordLink className="btn ghost">Join the Discord</DiscordLink>
          </div>
        </div>
        <dl className="status rise" style={{ ["--d" as string]: ".3s" }} aria-label="Status">
          <div>
            <dt>QUEUE</dt>
            <dd className={s.queue_open ? "live" : "closed"}>{s.queue_open ? "OPEN" : "FULL — BACK SOON"}</dd>
          </div>
          <div>
            <dt>PAY WITH</dt>
            <dd>{s.status_payments}</dd>
          </div>
          <div>
            <dt>PLANS</dt>
            <dd>{s.status_plans}</dd>
          </div>
          <div>
            <dt>UPDATES</dt>
            <dd>{s.status_updates}</dd>
          </div>
        </dl>
      </section>

      <section className="sec" aria-labelledby="popular-h">
        <div className="head-row head">
          <Reveal>
            <h2 id="popular-h" className="label">
              Most ordered
            </h2>
          </Reveal>
          <Reveal>
            <Link className="mono acc" href="/services" style={{ fontSize: 13, letterSpacing: ".1em" }}>
              ALL SERVICES →
            </Link>
          </Reveal>
        </div>
        <div className="rows">
          {popular.map((svc, i) => (
            <Reveal key={svc.id} delay={i * 0.08}>
              <Link className="row" href="/services">
                <span className="n">0{i + 1}</span>
                <div>
                  <h3 className="h3">{svc.name}</h3>
                  <p>{svc.description.split(".")[0]}.</p>
                </div>
                <span className="p">
                  {svc.price_is_from ? "FROM " : ""}
                  <Price amount={svc.price} from={svc.currency} />
                </span>
                <span className="ar" aria-hidden="true">
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec" aria-labelledby="how-h">
        <div className="head">
          <Reveal className="label">How it works</Reveal>
          <Reveal delay={0.08}>
            <h2 id="how-h" className="h2">
              Three steps.
              <br />
              Zero grinding.
            </h2>
          </Reveal>
        </div>
        <div className="steps">
          {STEPS.map((st, i) => (
            <Reveal key={st.n} className="step" delay={i * 0.1}>
              <div className="big">{st.n}</div>
              <h3 className="h3">{st.t}</h3>
              <p>{st.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec faq" id="faq" aria-labelledby="faq-h">
        <div className="head">
          <Reveal className="label">FAQ</Reveal>
          <Reveal delay={0.08}>
            <h2 id="faq-h" className="h2">
              Before
              <br />
              you order.
            </h2>
          </Reveal>
        </div>
        <Reveal>
          {faqs.map((f) => (
            <details key={f.id}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </Reveal>
      </section>

      <Reveal className="sec panel discord-block">
        <div style={{ position: "relative" }}>
          <div className="label">Community</div>
          <h2 className="h2" style={{ marginTop: 18 }}>
            The vault&apos;s front door
            <br />
            is on Discord.
          </h2>
          <p>Order updates, event drops and first dibs on limited slots — all in one server.</p>
        </div>
        <DiscordLink className="btn" />
      </Reveal>
    </div>
  );
}
