import type { Metadata } from "next";
import { HomeView } from "@/components/pages/HomeView";
import { getFaqs } from "@/lib/data";
import { getEldoradoReviews } from "@/lib/eldorado-reviews";

export const metadata: Metadata = {
  title: { absolute: "UnownVault — Pokémon GO hunts, dust & raid services" },
  description:
    "Shundos, on order. Shiny, hundo and shundo hunts, stardust runs and raid packs for Pokémon GO — weekly and monthly plans or one-off orders.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [faqs, reviews] = await Promise.all([getFaqs(), getEldoradoReviews()]);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <HomeView reviews={reviews} />
    </>
  );
}
