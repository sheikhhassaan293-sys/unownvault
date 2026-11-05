"use client";

import { COOLDOWN_OPTIONS, type Cooldown } from "@/lib/types";

/** What a cooldown timer is, in one line, for buyers who don't know. */
export const COOLDOWN_NOTE =
  "Not sure? Pokémon GO adds a cooldown (up to 2 hours) based on the last time you caught a Pokémon or spun a PokéStop. If you haven't played recently, pick “No”.";

/** "Do you have a cooldown timer, and how much is left?" — asked on every non-subscription order. */
export function CooldownQuestion({ value, onChange, idPrefix = "cd" }: { value: Cooldown | null; onChange: (c: Cooldown) => void; idPrefix?: string }) {
  return (
    <fieldset className="cd-box">
      <legend className="mono dim cd-legend">DO YOU HAVE A COOLDOWN TIMER?</legend>
      <div className="cd-row" role="radiogroup" aria-label="Cooldown timer">
        <button type="button" role="radio" aria-checked={value?.has === false} className={`cd-opt ${value?.has === false ? "on" : ""}`} onClick={() => onChange({ has: false, minutes_left: null })}>
          No
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value?.has === true}
          className={`cd-opt ${value?.has === true ? "on" : ""}`}
          onClick={() => onChange({ has: true, minutes_left: value?.minutes_left ?? 120 })}
        >
          Yes
        </button>
      </div>
      {value?.has && (
        <div className="f" style={{ marginTop: 10 }}>
          <label htmlFor={`${idPrefix}-left`}>How much is left?</label>
          <select id={`${idPrefix}-left`} value={value.minutes_left ?? 120} onChange={(e) => onChange({ has: true, minutes_left: Number(e.target.value) })}>
            {COOLDOWN_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="help cd-note">{COOLDOWN_NOTE}</p>
    </fieldset>
  );
}

/** − 3 + */
export function QuantityStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="qty" role="group" aria-label="Quantity">
      <button type="button" className="qty-b" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="One fewer">
        −
      </button>
      <output className="qty-n" aria-live="polite">
        {value}
      </output>
      <button type="button" className="qty-b" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="One more">
        +
      </button>
    </div>
  );
}
