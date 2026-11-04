// Used only by scripts/build-preview.sh: a static preview has no server, so server actions
// are replaced with these no-ops (the preview always runs in demo mode).
export async function refreshContent() {
  return { ok: true };
}
export async function syncAdminRole(): Promise<"admin" | "user" | null> {
  return null;
}
export type CheckoutResult = { ok: true; sessionId: string; purchaseUrl: string | null } | { ok: false; error: string };
export async function createCheckout(..._a: unknown[]): Promise<CheckoutResult> {
  void _a;
  return { ok: false, error: "demo" };
}
export async function confirmCheckout(..._a: unknown[]) {
  void _a;
  return { orderId: null, status: "unknown" };
}
