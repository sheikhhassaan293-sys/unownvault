/**
 * The owner's buyer reviews on Eldorado (eldorado.gg/users/LetMeDoItForYou), read from the same
 * public endpoints Eldorado's own profile page uses. Eldorado already masks buyer names ("Plu***").
 * If Eldorado can't be reached, the copy saved in data/eldorado-reviews.json is used instead.
 */
import saved from "@/data/eldorado-reviews.json";

export const ELDORADO_USERNAME = "LetMeDoItForYou";
export const ELDORADO_PROFILE_URL = `https://www.eldorado.gg/users/${ELDORADO_USERNAME}/reviews`;

export type Review = { id: string; date: string; category: string; positive: boolean; text: string; tags: string[]; buyer: string };
export type ReviewData = {
  username: string;
  fetched_at: string;
  stats: { count: number; positive: number; negative: number; score: number | null };
  reviews: Review[];
};

const API = "https://www.eldorado.gg/api";

type RawReview = {
  orderReview: {
    id: string;
    date: string;
    gameCategoryTitle?: string;
    review: { reviewRating?: string; reviewMessage?: string | null; isReviewMessageVisible?: boolean; reviewTags?: string[] | null };
  };
  buyer?: { maskedUsername?: string };
};
type RawPage = {
  userOrderInfo: { ratingCount: number; positiveCount: number; negativeCount: number; feedbackScore: number | null };
  reviews: { nextPageCursor?: string | null; results: RawReview[] };
};

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Eldorado ${r.status}`);
  return (await r.json()) as T;
}

const clean = (x: RawReview): Review => ({
  id: x.orderReview.id,
  date: x.orderReview.date,
  category: x.orderReview.gameCategoryTitle ?? "Order",
  positive: x.orderReview.review.reviewRating === "Positive",
  text: x.orderReview.review.isReviewMessageVisible === false ? "" : (x.orderReview.review.reviewMessage ?? "").trim().slice(0, 600),
  tags: x.orderReview.review.reviewTags ?? [],
  buyer: x.buyer?.maskedUsername ?? "Buyer",
});

export async function fetchEldoradoReviews(): Promise<ReviewData> {
  try {
    const user = await getJson<{ id: string }>(`${API}/users/${ELDORADO_USERNAME}/publicByUsername`);
    const reviews: Review[] = [];
    const seen = new Set<string>();
    let cursor: string | null | undefined = null;
    let stats: RawPage["userOrderInfo"] | null = null;
    for (let page = 0; page < 20; page++) {
      const q = new URLSearchParams({ pageSize: "50" });
      if (cursor) {
        q.set("cursorValue", cursor);
        q.set("pageDirection", "Next");
      }
      const j: RawPage = await getJson<RawPage>(`${API}/orders/reviews/${user.id}?${q}`);
      stats ??= j.userOrderInfo;
      const fresh = j.reviews.results.filter((x) => !seen.has(x.orderReview.id));
      for (const x of fresh) {
        seen.add(x.orderReview.id);
        reviews.push(clean(x));
      }
      cursor = j.reviews.nextPageCursor;
      if (!cursor || !fresh.length) break;
    }
    if (!stats || !reviews.length) throw new Error("no reviews returned");
    return {
      username: ELDORADO_USERNAME,
      fetched_at: new Date().toISOString(),
      stats: { count: stats.ratingCount, positive: stats.positiveCount, negative: stats.negativeCount, score: stats.feedbackScore },
      reviews: reviews.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    };
  } catch (e) {
    console.warn("[reviews] Eldorado unreachable, using the saved copy:", e instanceof Error ? e.message : e);
    return saved as ReviewData;
  }
}

/** "HelpfulAndResponsive" → "Helpful & responsive" */
const TAGS: Record<string, string> = {
  GoodPrice: "Good price",
  FastDelivery: "Fast delivery",
  GOAT: "GOAT",
  ExtraMile: "Went the extra mile",
  HelpfulAndResponsive: "Helpful & responsive",
  GoodComms: "Great communication",
};
export const tagLabel = (t: string) =>
  TAGS[t] ?? t.replace(/And/g, " & ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
