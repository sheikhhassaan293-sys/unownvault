import { cacheLife, cacheTag } from "next/cache";
import { fetchGameEvents, type GameEvent } from "./game-events-source";

export type { GameEvent };

/** Cached for an hour, so the Updates page picks up newly announced events by itself. */
export async function getGameEvents(): Promise<GameEvent[]> {
  "use cache";
  cacheTag("game-events");
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return fetchGameEvents();
}
