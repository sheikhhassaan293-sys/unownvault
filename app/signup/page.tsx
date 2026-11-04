import type { Metadata } from "next";
import { SignupFlow } from "@/components/pages/AuthFlows";
import { getTakenUsernames } from "@/lib/data";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignupPage() {
  const taken = await getTakenUsernames();
  return (
    <div className="auth-wrap">
      <SignupFlow taken={taken} />
    </div>
  );
}
