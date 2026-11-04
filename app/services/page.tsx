import type { Metadata } from "next";
import { ServiceGrid } from "@/components/pages/ServiceGrid";
import { CurrencySwitch } from "@/components/providers/Currency";
import { Link } from "@/components/providers/Transition";
import { Arrow, Reveal } from "@/components/ui";
import { getServiceCategories, getServices } from "@/lib/data";

export const metadata: Metadata = {
  title: "Services — shundo, shiny, stardust, levelling & raids",
  description: "One-off hunts, forged to order: shundo and shiny hunting, stardust orders, XP and levelling, raid and event packages. Clear prices and delivery times.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const [services, categories] = await Promise.all([getServices(), getServiceCategories()]);
  return (
    <div className="page">
      <div className="head">
        <Reveal className="label">02 / Services</Reveal>
        <div className="head-row">
          <Reveal delay={0.08}>
            <h1 className="h2">
              One-off hunts,
              <br />
              <span className="acc">forged to order.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <CurrencySwitch />
          </Reveal>
        </div>
      </div>

      <ServiceGrid services={services} categories={categories} />

      <Reveal className="sec">
        <Link className="panel cta-banner" href="/custom">
          <div>
            <div className="label">Custom requests</div>
            <h2 className="h3">Not on the list? Ask for it.</h2>
          </div>
          <span className="btn">
            Send a request <Arrow />
          </span>
        </Link>
      </Reveal>
    </div>
  );
}
