/**
 * Pluggable payment layer (Phase 2). Phase 1 only uses the shapes so the checkout UI
 * already speaks the right language; the providers are implemented in Milestone 7.
 *
 *  - whop    → primary: embedded checkout for subscriptions, services, offers, quotes
 *  - manual  → fallback: instructions + transaction id + screenshot, admin confirms
 */
import type { Currency } from "@/lib/types";

export type ProviderId = "whop" | "manual";

export type CheckoutItem = {
  kind: "subscription" | "service" | "offer" | "custom";
  id: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  priceIsFrom?: boolean;
  period?: "weekly" | "monthly";
  whopPlanId?: string | null;
  /** show the priority Pokémon picker at checkout, for these kinds */
  priorityKinds?: ("shiny" | "shundo" | "hundo")[];
  /** how many of each the plan includes (shown as a guide in the picker) */
  priorityIncludes?: Partial<Record<"shiny" | "shundo" | "hundo", number>>;
};

export type CheckoutSession =
  | { mode: "embedded"; sessionId: string; planId: string }
  | { mode: "redirect"; url: string };

export interface PaymentProvider {
  id: ProviderId;
  /** Whether this provider can take payment for the item. */
  supports(item: CheckoutItem): boolean;
  createCheckout(item: CheckoutItem, userId: string): Promise<CheckoutSession>;
  /** Verify + parse an incoming webhook; returns normalised events for the order/subscription service. */
  handleWebhook?(req: Request): Promise<{ ok: boolean }>;
}
