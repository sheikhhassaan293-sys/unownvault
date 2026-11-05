// Used only by scripts/build-preview.sh: the static preview reads reviews once at build time.
import { fetchEldoradoReviews, type ReviewData } from "@/lib/eldorado-reviews-source";
export async function getEldoradoReviews(): Promise<ReviewData> {
  return fetchEldoradoReviews();
}
