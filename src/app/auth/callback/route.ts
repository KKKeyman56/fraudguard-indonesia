import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") || "/dashboard";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const origin = process.env.NODE_ENV === "development" || !forwardedHost
        ? url.origin
        : `https://${forwardedHost}`;
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${url.origin}/login?auth_error=confirmation_failed`);
}
