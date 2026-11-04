/** Trainer-name rules — shared by the mock picker now and the real check in Phase 2. */

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

// Small starter list; Phase 2 can swap in a maintained package. Matches inside the name too.
const BLOCKED = ["fuck", "shit", "cunt", "bitch", "nigg", "fag", "slut", "whore", "rape", "nazi", "dick", "pussy", "cock", "retard"];

const deLeet = (s: string) =>
  s.toLowerCase().replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/_/g, "");

export function usernameProblem(v: string): string | null {
  if (!v) return null;
  if (v.length < 3) return "At least 3 characters";
  if (v.length > 20) return "20 characters max";
  if (!USERNAME_RE.test(v)) return "Letters, numbers and _ only";
  const plain = deLeet(v);
  if (BLOCKED.some((w) => plain.includes(w))) return "Pick something cleaner";
  return null;
}
