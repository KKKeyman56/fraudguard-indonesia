import { NextResponse } from "next/server";
import { RISK_ENGINE_VERSION } from "@/lib/risk-engine";

export function GET() {
  return NextResponse.json({
    status: "ok",
    engineReady: true,
    engineVersion: RISK_ENGINE_VERSION,
    explanationConfigured: Boolean(process.env.GROQ_API_KEY),
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    authConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    timestamp: new Date().toISOString(),
  });
}
