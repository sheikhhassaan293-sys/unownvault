// Used only by scripts/build-preview.sh: the static preview fetches events once at build time.
import { fetchGameEvents, type GameEvent } from "@/lib/game-events-source";
export type { GameEvent };
export async function getGameEvents(): Promise<GameEvent[]> {
  return fetchGameEvents();
}
