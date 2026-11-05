import { cacheLife, cacheTag } from "next/cache";
import { fetchEldoradoReviews, type ReviewData } from "./eldorado-reviews-source";

/** Re-read from Eldorado every few hours, so new reviews appear on the site by themselves. */
export async function getEldoradoReviews(): Promise<ReviewData> {
  "use cache";
  cacheTag("eldorado-reviews");
  cacheLife({ stale: 300, revalidate: 3 * 3600, expire: 86400 });
  return fetchEldoradoReviews();
}
