// Used only by scripts/build-preview.sh (static preview = always demo mode, no "use cache").
export async function liveContent(): Promise<never> {
  throw new Error("live content is not available in the static preview");
}
