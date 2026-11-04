import type { CSSProperties, ReactNode } from "react";
import type { ShardElement } from "@/lib/themes";

/** Engraved glyph cut into each shard — wave, bolt, flame, leaf, sun-disc. */
const GLYPH: Record<ShardElement, ReactNode> = {
  ocean: (
    <path d="M3.6 6.6q1.2-1.3 2.4 0t2.4 0 2.4 0M3.6 9.6q1.2-1.3 2.4 0t2.4 0 2.4 0" fill="none" stroke="rgba(0,0,0,.6)" strokeWidth="1.2" />
  ),
  thunder: <path d="M8.1 3.2 5 8.6h2.3L6.3 12.2l3.7-5.5H7.6L8.9 3.2z" fill="rgba(0,0,0,.6)" />,
  lava: (
    <path d="M7.1 3.2c1.7 1.8 2.9 3.3 2.9 5.4a2.9 2.9 0 0 1-5.8 0c0-1 .5-1.9 1.1-2.5.1.9.5 1.5 1.1 1.7-.3-1.6 0-3.1.7-4.6z" fill="rgba(0,0,0,.6)" />
  ),
  forest: <path d="M3.6 11.4C3.7 7 6.4 4.2 10.6 3.6c-.1 4.3-2.8 7.4-7 7.8z" fill="rgba(0,0,0,.6)" />,
  temple: (
    <g fill="none" stroke="rgba(0,0,0,.62)" strokeWidth="1.1">
      <circle cx="7" cy="7.8" r="2" />
      <path d="M7 3.4v1.3M7 10.9v1.3M2.8 7.8h1.3M9.9 7.8h1.3" />
    </g>
  ),
};

/**
 * Element shard — an angled, slightly irregular crystal tablet filled with the page accent.
 * Hover tilt/brighten is handled in CSS (`.sl li:hover .shard`).
 */
export function ShardBullet({
  element,
  className = "",
  style,
}: {
  element: ShardElement;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg className={`shard ${className}`} style={style} viewBox="0 0 14 15" aria-hidden="true" focusable="false">
      <path d="M2 4.4 7.6.6 13.2 3.1l-.8 8.3-5.9 3.1-5.3-3.7z" fill="currentColor" />
      {GLYPH[element]}
    </svg>
  );
}

/** A list whose bullets are element shards. */
export function ShardList({ element, items }: { element: ShardElement; items: ReactNode[] }) {
  return (
    <ul className="sl">
      {items.map((it, i) => (
        <li key={i}>
          <ShardBullet element={element} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
