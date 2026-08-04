import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const origin = process.env.NODE_ENV === "development" || !forwardedHost
        ? url.origin
        : `https://${forwardedHost}`;
      const response = NextResponse.redirect(`${origin}/reset-password`);
      response.cookies.set("fraudguard_password_recovery", "active", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      return response;
    }
  }

  // Jangan biarkan sesi lama menyamarkan link recovery yang gagal dan
  // mengalihkan pengguna langsung ke dashboard dari halaman login.
  await supabase.auth.signOut();
  return NextResponse.redirect(`${url.origin}/login?auth_error=recovery_link_invalid`);
}
