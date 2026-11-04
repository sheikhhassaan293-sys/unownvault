/** Original UnownVault glyph: a vault dial with a U-shaped bolt. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10.2" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.6 2.4" />
      <path d="M11.6 9.8v7.6a4.4 4.4 0 0 0 8.8 0V9.8" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M16 21.8v3.4" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <b>
      UNOWN<span>VAULT</span>
    </b>
  );
}
