import { NextResponse, type NextRequest } from "next/server";
import { sbServer } from "@/lib/supabase/server";

/** Discord / email-confirmation links land here, then go on to pick a trainer name or back to the site. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const db = await sbServer();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=link", url.origin));
    const { data: profile } = await db.from("profiles").select("username").eq("id", data.user.id).single();
    if (!profile?.username) return NextResponse.redirect(new URL("/signup?step=name", url.origin));
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
