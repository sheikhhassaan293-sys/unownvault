import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LIVE, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Keeps the Supabase login fresh on every page load (no-op in demo mode). */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!LIVE) return response;
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/webhooks|icons|mock|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|svg|jpg|jpeg|webp|ico|woff2)$).*)"],
};
