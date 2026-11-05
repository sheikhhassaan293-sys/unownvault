/**
 * Pokémon GO events — from LeekDuck's event calendar, published as JSON by the community
 * ScrapedDuck project. Times without a "Z" are the player's LOCAL time (e.g. Community Day
 * 14:00 everywhere); times with "Z" are one global moment.
 */
export type GameEvent = { id: string; name: string; type: string; heading: string; start: string; end: string; link: string };

const SOURCE = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.min.json";
const DAY = 86_400_000;

export async function fetchGameEvents(): Promise<GameEvent[]> {
  try {
    const res = await fetch(SOURCE, { headers: { "User-Agent": "UnownVault (+https://unownvault.vercel.app)" } });
    if (!res.ok) return [];
    const raw = (await res.json()) as Record<string, unknown>[];
    const now = Date.now();
    // local-time events can end up to ~14h later than UTC somewhere in the world
    const endOf = (s: string) => Date.parse(s.endsWith("Z") ? s : s + "Z") + (s.endsWith("Z") ? 0 : 14 * 3_600_000);
    return raw
      .map((e) => ({
        id: String(e.eventID ?? ""),
        name: String(e.name ?? ""),
        type: String(e.eventType ?? "event"),
        heading: String(e.heading ?? ""),
        start: String(e.start ?? ""),
        end: String(e.end ?? e.start ?? ""),
        link: String(e.link ?? ""),
      }))
      .filter((e) => e.id && e.name && e.start && !Number.isNaN(Date.parse(e.start)))
      .filter((e) => endOf(e.end) > now && Date.parse(e.start) < now + 45 * DAY)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
      .slice(0, 60);
  } catch {
    return [];
  }
}
