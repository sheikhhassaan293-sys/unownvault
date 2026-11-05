"use client";

import { useMemo, useState } from "react";
import { ELDORADO_PROFILE_URL, tagLabel, type Review, type ReviewData } from "@/lib/eldorado-reviews-source";
import { Link } from "../providers/Transition";
import { Arrow, Reveal } from "../ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Same text on server and browser (no locale/timezone differences). */
const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const pct = (s: ReviewData["stats"]) => Math.round(s.score ?? (s.count ? (s.positive / s.count) * 100 : 0));

export function ReviewStats({ data }: { data: ReviewData }) {
  return (
    <div className="rv-stats">
      <div className="rv-score">
        <b>{pct(data.stats)}%</b>
        <span>positive</span>
      </div>
      <div className="rv-meta">
        <span>
          <b>{data.stats.count}</b> reviews on Eldorado
        </span>
        <a className="linkish" href={ELDORADO_PROFILE_URL} target="_blank" rel="noopener noreferrer">
          Verified seller · see them on Eldorado ↗
        </a>
      </div>
    </div>
  );
}

export function ReviewCard({ r }: { r: Review }) {
  return (
    <article className="panel rv-card">
      <div className="rv-top">
        <span className={`rv-thumb ${r.positive ? "" : "neg"}`} aria-label={r.positive ? "Positive review" : "Negative review"}>
          {r.positive ? "👍" : "👎"}
        </span>
        <span className="mono dim rv-cat">{r.category}</span>
      </div>
      {r.text ? <p className="rv-text">“{r.text}”</p> : <p className="rv-text dim">Left a positive rating.</p>}
      {r.tags.length > 0 && (
        <div className="rv-tags">
          {r.tags.slice(0, 4).map((t) => (
            <span key={t}>{tagLabel(t)}</span>
          ))}
        </div>
      )}
      <div className="rv-foot mono dim">
        <span>{r.buyer}</span>
        <span>{day(r.date)}</span>
      </div>
    </article>
  );
}

/** Home page: the headline numbers and a handful of recent written reviews. */
export function ReviewsStrip({ data }: { data: ReviewData }) {
  const best = data.reviews.filter((r) => r.positive && r.text.length >= 15).slice(0, 6);
  if (!data.stats.count) return null;
  return (
    <section className="sec" aria-labelledby="reviews-h">
      <div className="head">
        <Reveal className="label">Reviews</Reveal>
        <div className="head-row">
          <Reveal delay={0.08}>
            <h2 id="reviews-h" className="h2">
              Trainers vouch for us.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <ReviewStats data={data} />
          </Reveal>
        </div>
      </div>
      <div className="rv-grid">
        {best.map((r, i) => (
          <Reveal key={r.id} delay={Math.min(i, 5) * 0.06}>
            <ReviewCard r={r} />
          </Reveal>
        ))}
      </div>
      <Reveal className="rv-more">
        <Link className="btn ghost" href="/reviews">
          Read all {data.stats.count} reviews <Arrow />
        </Link>
      </Reveal>
    </section>
  );
}

/** /reviews: every review, filterable by what was ordered. */
export function ReviewsList({ data }: { data: ReviewData }) {
  const [cat, setCat] = useState("all");
  const [withText, setWithText] = useState(true);
  const cats = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of data.reviews) n.set(r.category, (n.get(r.category) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.reviews]);
  const shown = data.reviews.filter((r) => (cat === "all" || r.category === cat) && (!withText || r.text));

  return (
    <>
      <div className="chips" role="group" aria-label="Filter reviews" style={{ marginBottom: 14 }}>
        <button className={`chip ${cat === "all" ? "on" : ""}`} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          All ({data.reviews.length})
        </button>
        {cats.map(([c, n]) => (
          <button key={c} className={`chip ${cat === c ? "on" : ""}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c} ({n})
          </button>
        ))}
      </div>
      <label className="switch" style={{ marginBottom: 22 }}>
        <input type="checkbox" checked={withText} onChange={(e) => setWithText(e.target.checked)} />
        <span />
        Only reviews with comments
      </label>
      <div className="rv-grid">
        {shown.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
      </div>
      {!shown.length && <p className="muted">No reviews here yet.</p>}
    </>
  );
}
