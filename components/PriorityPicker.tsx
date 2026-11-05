"use client";

/**
 * Priority Pokémon picker: the buyer builds an ordered wishlist for shinies, shundos and
 * hundos. Names come from a built-in National Dex list; for shiny/shundo targets only
 * Pokémon whose shiny is out in the game are offered (live community list, refreshed daily).
 */
import { useEffect, useMemo, useState } from "react";
import { LIVE } from "@/lib/supabase/env";
import { PRIORITY_KINDS, PRIORITY_MAX, type Priorities, type PriorityKind } from "@/lib/types";

type Mon = { id: number; name: string };
let namesCache: Mon[] | null = null;
let shinyCache: Set<number> | null | undefined;

/** Loads the Pokémon list once per visit (and the shiny list when live). */
export function usePokedex() {
  const [names, setNames] = useState<Mon[] | null>(namesCache);
  const [shiny, setShiny] = useState<Set<number> | null | undefined>(shinyCache);
  useEffect(() => {
    if (!namesCache)
      import("@/data/pokemon-names.json").then((m) => {
        namesCache = (m.default ?? m) as Mon[];
        setNames(namesCache);
      });
    if (shinyCache === undefined) {
      if (!LIVE) {
        shinyCache = null;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- demo has no live shiny list
        setShiny(null);
      } else
        fetch("/api/pokedex/shiny")
          .then((r) => r.json())
          .then((j: { ids: number[] | null }) => {
            shinyCache = j.ids ? new Set(j.ids) : null;
            setShiny(shinyCache);
          })
          .catch(() => {
            shinyCache = null;
            setShiny(null);
          });
    }
  }, []);
  const byId = useMemo(() => new Map((names ?? []).map((m) => [m.id, m.name])), [names]);
  return { names, shiny, nameOf: (id: number) => byId.get(id) ?? `#${id}` };
}

const dex = (id: number) => `#${String(id).padStart(4, "0")}`;

export function PrioritySummary({ value, nameOf }: { value: Priorities; nameOf: (id: number) => string }) {
  const parts = PRIORITY_KINDS.filter((k) => value[k.key]?.length).map((k) => ({ label: k.label, list: value[k.key]! }));
  if (!parts.length) return <p className="muted" style={{ fontSize: 15 }}>No priorities set yet — we&apos;ll pick for you.</p>;
  return (
    <div className="pri-summary">
      {parts.map((p) => (
        <p key={p.label}>
          <span className="mono dim">{p.label.toUpperCase()}</span> {p.list.slice(0, 8).map(nameOf).join(", ")}
          {p.list.length > 8 ? ` +${p.list.length - 8} more` : ""}
        </p>
      ))}
    </div>
  );
}

export function PriorityPicker({
  value,
  onSave,
  onCancel,
  includes,
  focus,
}: {
  value: Priorities;
  onSave: (p: Priorities) => Promise<{ error?: string }>;
  onCancel: () => void;
  /** e.g. { shiny: 5, shundo: 2, hundo: 5 } from the plan, shown as a guide */
  includes?: Partial<Record<PriorityKind, number>>;
  focus?: PriorityKind[];
}) {
  const { names, shiny, nameOf } = usePokedex();
  const kinds = PRIORITY_KINDS.filter((k) => !focus || focus.includes(k.key));
  const [tab, setTab] = useState<PriorityKind>(kinds[0].key);
  const [draft, setDraft] = useState<Priorities>(value);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const list = draft[tab] ?? [];
  const needsShiny = tab !== "hundo";
  const results = useMemo(() => {
    if (!names) return [];
    const s = q.trim().toLowerCase().replace(/^#0*/, "");
    return names
      .filter((m) => !needsShiny || !shiny || shiny.has(m.id))
      .filter((m) => !s || m.name.toLowerCase().includes(s) || String(m.id) === s)
      .slice(0, 40);
  }, [names, shiny, q, needsShiny]);

  const set = (next: number[]) => setDraft((d) => ({ ...d, [tab]: next }));
  const add = (id: number) => !list.includes(id) && list.length < PRIORITY_MAX && set([...list, id]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    set(n);
  };

  return (
    <div className="picker">
      <div className="chips" role="tablist" aria-label="Priority type">
        {kinds.map((k) => (
          <button key={k.key} role="tab" aria-selected={tab === k.key} className={`chip ${tab === k.key ? "on" : ""}`} onClick={() => setTab(k.key)}>
            {k.label}
            {draft[k.key]?.length ? ` · ${draft[k.key]!.length}` : ""}
          </button>
        ))}
      </div>
      <p className="help" style={{ margin: "10px 0 12px" }}>
        {PRIORITY_KINDS.find((k) => k.key === tab)?.hint}.{" "}
        {includes?.[tab] != null ? `Your plan includes ${includes[tab]}. ` : ""}List them in the order you want them — we work from the top. Extras are kept as backups.
      </p>

      <div className="picker-cols">
        <div>
          <div className="f">
            <label htmlFor="pk-q">Search Pokémon</label>
            <input id="pk-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or Pokédex number" autoComplete="off" />
          </div>
          <ul className="pick-results" aria-label="Search results">
            {!names && <li className="dim">Loading Pokémon…</li>}
            {names && results.length === 0 && <li className="dim">No match{needsShiny && shiny ? " with a released shiny" : ""}.</li>}
            {results.map((m) => {
              const picked = list.includes(m.id);
              return (
                <li key={m.id}>
                  <button type="button" disabled={picked} onClick={() => add(m.id)}>
                    <span className="mono dim">{dex(m.id)}</span> {m.name}
                    <span className="acc">{picked ? "✓" : "+"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {needsShiny && shiny && <p className="help">Only Pokémon whose shiny is out in the game are listed.</p>}
        </div>

        <div>
          <span className="flabel mono dim" style={{ fontSize: 11, letterSpacing: ".14em" }}>
            YOUR {PRIORITY_KINDS.find((k) => k.key === tab)?.label.toUpperCase()} ({list.length})
          </span>
          {list.length === 0 ? (
            <p className="muted" style={{ fontSize: 15, marginTop: 8 }}>Nothing yet — tap Pokémon on the left.</p>
          ) : (
            <ol className="pick-list">
              {list.map((id, i) => (
                <li key={id}>
                  <span className="mono dim">{i + 1}.</span>
                  <span className="nm">{nameOf(id)}</span>
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === list.length - 1}>
                    ↓
                  </button>
                  <button type="button" onClick={() => set(list.filter((x) => x !== id))} aria-label={`Remove ${nameOf(id)}`}>
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
      <div className="stack" style={{ marginTop: 18 }}>
        <button
          className="btn btn-block"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            const r = await onSave(draft);
            setBusy(false);
            if (r.error) setErr(r.error);
          }}
        >
          {busy ? "Saving…" : "Save priorities"}
        </button>
        <button type="button" className="linkish" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
