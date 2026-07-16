import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    timestamp: new Date().toISOString(),
  });
}
