"use client";

import { useMemo, useState } from "react";
import type { GameEvent } from "@/lib/game-events-source";
import { Link } from "../providers/Transition";
import { Reveal, useNow } from "../ui";

const GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: "raids", label: "Raids", types: ["raid-battles", "raid-hour", "raid-day", "raid-weekend", "max-battles", "max-mondays", "elite-raids"] },
  { key: "cd", label: "Community Day & Spotlight", types: ["community-day", "pokemon-spotlight-hour", "spotlight-hour"] },
  { key: "events", label: "Events", types: ["event", "pokemon-go-tour", "pokemon-go-fest", "wild-area", "season", "city-safari", "live-event", "global-challenge", "safari-zone"] },
];
const groupOf = (type: string) => GROUPS.find((g) => g.types.includes(type))?.key ?? "other";

/** Naive times are the player's local time — the browser reads them that way automatically. */
const at = (s: string) => new Date(s).getTime();
const pad = (n: number) => String(n).padStart(2, "0");
function until(ms: number) {
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return d ? `${d}d ${pad(h)}h` : h ? `${h}h ${pad(m)}m` : `${m}m`;
}
const when = (s: string) =>
  new Date(s).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function EventsFeed({ events }: { events: GameEvent[] }) {
  const now = useNow(30_000);
  const [group, setGroup] = useState("all");

  const { live, soon } = useMemo(() => {
    if (now == null) return { live: [], soon: [] };
    const list = events.filter((e) => at(e.end) > now && (group === "all" || groupOf(e.type) === group));
    return {
      live: list.filter((e) => at(e.start) <= now).sort((a, b) => at(a.end) - at(b.end)),
      soon: list.filter((e) => at(e.start) > now).slice(0, 24),
    };
  }, [events, now, group]);

  if (!events.length) return null;

  const row = (e: GameEvent, isLive: boolean) => (
    <article key={e.id} className="ev">
      <span className="badge quiet">{e.heading || e.type.replace(/-/g, " ")}</span>
      <div className="ev-main">
        <h3 className="h3">{e.name}</h3>
        <p className="mono dim">
          {isLive ? `Ends in ${until(at(e.end) - (now ?? 0))}` : `Starts ${when(e.start)}`}
          {!isLive && <span> · in {until(at(e.start) - (now ?? 0))}</span>}
        </p>
      </div>
      <div className="ev-act">
        {e.link && (
          <a className="linkish" href={e.link} target="_blank" rel="noopener noreferrer">
            Details ↗
          </a>
        )}
        <Link className="btn sm ghost" href="/services">
          Get it done
        </Link>
      </div>
    </article>
  );

  return (
    <section className="sec" aria-labelledby="ev-h">
      <div className="head-row head">
        <div>
          <Reveal className="label">In the game</Reveal>
          <Reveal delay={0.06}>
            <h2 id="ev-h" className="h2" style={{ marginTop: 16 }}>
              What&apos;s on <span className="acc">right now.</span>
            </h2>
          </Reveal>
        </div>
        <div className="chips" role="group" aria-label="Filter events">
          {[{ key: "all", label: "All" }, ...GROUPS, { key: "other", label: "Other" }].map((g) => (
            <button key={g.key} className={`chip ${group === g.key ? "on" : ""}`} aria-pressed={group === g.key} onClick={() => setGroup(g.key)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {now == null ? (
        <div style={{ minHeight: 200 }} aria-busy="true" />
      ) : (
        <>
          <h3 className="mono dim ev-sub">LIVE NOW · {live.length}</h3>
          <div className="ev-list">{live.length ? live.map((e) => row(e, true)) : <p className="empty">Nothing in this category right now.</p>}</div>
          <h3 className="mono dim ev-sub">COMING UP · {soon.length}</h3>
          <div className="ev-list">{soon.length ? soon.map((e) => row(e, false)) : <p className="empty">Nothing announced yet.</p>}</div>
        </>
      )}
      <p className="help" style={{ marginTop: 14 }}>
        Event info from LeekDuck, updated automatically every hour. Times are shown in your own time zone.
      </p>
    </section>
  );
}
