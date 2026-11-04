"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { FieldRow, type Field } from "./fields";

type Row = { id: string; sort_order?: number };

/**
 * Edit a list of rows (plans, services, offers, FAQs): open a row to edit its fields,
 * move it up/down, duplicate, delete, or add a new one.
 */
export function ListEditor<T extends Row>({
  rows,
  onChange,
  fields,
  titleOf,
  metaOf,
  makeNew,
  groupOf,
  sortable = true,
  addLabel = "Add new",
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  fields: Field<T>[];
  titleOf: (r: T) => string;
  metaOf?: (r: T) => string;
  makeNew: () => T;
  /** rows only move within their own group (e.g. weekly vs monthly) */
  groupOf?: (r: T) => string;
  sortable?: boolean;
  addLabel?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const g = (r: T) => (groupOf ? groupOf(r) : "");
  const sorted = sortable
    ? [...rows].sort((a, b) => g(a).localeCompare(g(b)) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : rows;

  const patch = (id: string, p: Partial<T>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sorted.length || g(sorted[i]) !== g(sorted[j])) return;
    const next = [...sorted];
    [next[i], next[j]] = [next[j], next[i]];
    const counters: Record<string, number> = {};
    onChange(next.map((r) => ({ ...r, sort_order: (counters[g(r)] = (counters[g(r)] ?? 0) + 1) })));
  };

  const add = () => {
    const r = makeNew();
    const max = Math.max(0, ...rows.filter((x) => g(x) === g(r)).map((x) => x.sort_order ?? 0));
    onChange([...rows, { ...r, sort_order: max + 1 }]);
    setOpen(r.id);
  };

  return (
    <div className="ledit">
      {sorted.map((r, i) => {
        const isOpen = open === r.id;
        const hidden = (r as { active?: boolean; published?: boolean }).active === false || (r as { published?: boolean }).published === false;
        return (
          <div key={r.id} className={`lrow panel ${isOpen ? "open" : ""} ${hidden ? "is-hidden" : ""}`}>
            <div className="lhead">
              <button className="ltitle" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                <span className="chev" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
                <span>
                  <b>{titleOf(r) || "Untitled"}</b>
                  {metaOf && <small>{metaOf(r)}</small>}
                </span>
                {hidden && <span className="badge quiet">Hidden</span>}
              </button>
              <div className="lacts">
                {sortable && (
                  <>
                    <button onClick={() => move(i, -1)} aria-label="Move up" title="Move up">
                      ↑
                    </button>
                    <button onClick={() => move(i, 1)} aria-label="Move down" title="Move down">
                      ↓
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    const copy = { ...structuredClone(r), id: `${r.id.split("_copy")[0]}_copy${Date.now().toString(36)}` } as T;
                    onChange([...rows, copy]);
                    setOpen(copy.id);
                  }}
                  title="Duplicate"
                >
                  Copy
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (confirm(`Delete “${titleOf(r) || "this item"}”? This can't be undone.`)) onChange(rows.filter((x) => x.id !== r.id));
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                  <div className="form lbody">
                    {fields.map((f) => (
                      <FieldRow key={f.key} id={`${r.id}-${f.key}`} field={f} value={r[f.key]} onChange={(v) => patch(r.id, { [f.key]: v } as Partial<T>)} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <button className="btn ghost sm" onClick={add} style={{ marginTop: 6 }}>
        + {addLabel}
      </button>
    </div>
  );
}
