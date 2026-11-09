import type { Metadata } from "next";
import { ResetPassword } from "@/components/pages/ResetPassword";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ResetPage() {
  return (
    <div className="auth-wrap">
      <ResetPassword />
    </div>
  );
}
