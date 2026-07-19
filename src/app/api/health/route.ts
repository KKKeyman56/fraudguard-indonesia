import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    authConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    timestamp: new Date().toISOString(),
  });
}
