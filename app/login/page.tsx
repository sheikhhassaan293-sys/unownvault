import type { Metadata } from "next";
import { LoginForm } from "@/components/pages/AuthFlows";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <LoginForm />
    </div>
  );
}
