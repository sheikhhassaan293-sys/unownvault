import { cacheLife, cacheTag } from "next/cache";

/**
 * Which Pokémon have their shiny released in Pokémon GO — from the community-maintained
 * pogoapi.net list, refreshed once a day. Returns null if the list can't be reached
 * (the picker then simply allows every Pokémon).
 */
export async function shinyReleasedIds(): Promise<number[] | null> {
  "use cache";
  cacheTag("pokedex");
  cacheLife("days");
  try {
    const res = await fetch("https://pogoapi.net/api/v1/shiny_pokemon.json", { headers: { "User-Agent": "UnownVault (+https://unownvault.vercel.app)" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { id?: number }> | { id?: number }[];
    const rows = Array.isArray(data) ? data : Object.values(data);
    const ids = Array.from(new Set(rows.map((r) => Number(r?.id)).filter((n) => Number.isInteger(n) && n > 0))).sort((a, b) => a - b);
    return ids.length > 50 ? ids : null;
  } catch {
    return null;
  }
}
