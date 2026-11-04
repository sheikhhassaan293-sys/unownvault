"use client";

import { parseList, parseSteps } from "@/lib/copy";
import { useCopy } from "../providers/Settings";
import { ShardList } from "../ShardBullet";
import { Reveal } from "../ui";

export function QuoteSteps() {
  const steps = parseSteps(useCopy("custom_steps"));
  return (
    <ol className="qsteps" aria-label="How quotes work" style={{ listStyle: "none", padding: 0, gridTemplateColumns: `repeat(${Math.min(steps.length, 4) || 1}, 1fr)` }}>
      {steps.map((s, i) => (
        <Reveal as="li" key={i} delay={i * 0.08}>
          <span className="mono acc">{String(i + 1).padStart(2, "0")}</span>
          <h2 className="h3">{s.title}</h2>
          <p>{s.text}</p>
        </Reveal>
      ))}
    </ol>
  );
}

export function CustomPoints() {
  return <ShardList element="forest" items={parseList(useCopy("custom_points"))} />;
}
