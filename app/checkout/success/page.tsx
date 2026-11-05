import type { Metadata } from "next";
import { CheckoutSuccess } from "@/components/pages/CheckoutSuccess";

export const metadata: Metadata = { title: "Payment successful", robots: { index: false, follow: false } };

export default function CheckoutSuccessPage() {
  return <CheckoutSuccess />;
}
