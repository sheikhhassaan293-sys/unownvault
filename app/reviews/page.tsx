import type { Metadata } from "next";
import { ReviewStats, ReviewsList } from "@/components/pages/Reviews";
import { getEldoradoReviews } from "@/lib/eldorado-reviews";
import { Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reviews",
  description: "What trainers say about our Pokémon GO hunts, stardust, raids and custom orders: every review from our verified Eldorado shop.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const data = await getEldoradoReviews();
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">Reviews</Reveal>
        <div className="head-row">
          <Reveal delay={0.08}>
            <h1 className="h2">Every review, straight from Eldorado.</h1>
          </Reveal>
          <Reveal delay={0.16}>
            <ReviewStats data={data} />
          </Reveal>
        </div>
        <Reveal delay={0.2}>
          <p className="muted" style={{ maxWidth: 640, marginTop: 14 }}>
            These come from real orders in our verified Eldorado shop and update automatically. Buyer names are shortened by Eldorado for privacy.
          </p>
        </Reveal>
      </div>
      <ReviewsList data={data} />
    </div>
  );
}
