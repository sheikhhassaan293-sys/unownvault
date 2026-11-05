"use client";

import { parseSteps } from "@/lib/copy";
import { Price } from "../providers/Currency";
import { CopyText, useContent, useCopy, visible } from "../providers/Settings";
import { Link } from "../providers/Transition";
import { Arrow, DiscordLink, Reveal } from "../ui";
import type { ReviewData } from "@/lib/eldorado-reviews-source";
import { ReviewsStrip } from "./Reviews";

export function HomeView({ reviews }: { reviews?: ReviewData }) {
  const { content } = useContent();
  const s = content.settings;
  const popular = visible(content.services)
    .filter((x) => x.popular)
    .slice(0, 3);
  const faqs = [...content.faqs].sort((a, b) => a.sort_order - b.sort_order);
  const steps = parseSteps(useCopy("home_steps"));

  return (
    <div className="page">
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
            <dd className={s.queue_open ? "live" : "closed"}>{s.queue_open ? "OPEN" : "PAUSED — BACK SOON"}</dd>
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

      {popular.length > 0 && (
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
                    {s.queue_open ? (
                      <>
                        {svc.price_is_from ? "FROM " : ""}
                        <Price amount={svc.price} from={svc.currency} />
                      </>
                    ) : (
                      <span className="dim">PAUSED</span>
                    )}
                  </span>
                  <span className="ar" aria-hidden="true">
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {reviews && <ReviewsStrip data={reviews} />}

      <section className="sec" aria-labelledby="how-h">
        <div className="head">
          <Reveal className="label">How it works</Reveal>
          <Reveal delay={0.08}>
            <h2 id="how-h" className="h2">
              <CopyText k="how_title" />
            </h2>
          </Reveal>
        </div>
        <div className="steps" style={{ gridTemplateColumns: `repeat(${Math.min(steps.length, 4) || 1}, 1fr)` }}>
          {steps.map((st, i) => (
            <Reveal key={i} className="step" delay={i * 0.1}>
              <div className="big">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="h3">{st.title}</h3>
              <p>{st.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec faq" id="faq" aria-labelledby="faq-h">
        <div className="head">
          <Reveal className="label">FAQ</Reveal>
          <Reveal delay={0.08}>
            <h2 id="faq-h" className="h2">
              <CopyText k="faq_title" />
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
            <CopyText k="discord_title" />
          </h2>
          <p>
            <CopyText k="discord_text" />
          </p>
        </div>
        <DiscordLink className="btn" />
      </Reveal>
    </div>
  );
}
