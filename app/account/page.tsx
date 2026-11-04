import type { Metadata } from "next";
import { AccountView } from "@/components/pages/AccountView";
import { getDemoAccount } from "@/lib/data";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
  const a = await getDemoAccount();
  return <AccountView subs={a.subscriptions} />;
}
