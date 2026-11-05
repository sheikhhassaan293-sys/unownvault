import { shinyReleasedIds } from "@/lib/pokedex-live";

/** GET → { ids: number[] | null } — Pokémon whose shiny is out in the game. */
export async function GET() {
  const ids = await shinyReleasedIds();
  return Response.json({ ids }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
