import { NextResponse } from "next/server";
import { getPaymentProvider, isManualBankConfigured, isPaymentProduction } from "@/lib/payment-provider";
import { RISK_ENGINE_VERSION } from "@/lib/risk-engine";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const paymentProvider = getPaymentProvider();
  let engineVersion = RISK_ENGINE_VERSION;
  let databaseReady = false;
  try {
    const { data, error } = await createAdminClient()
      .from("risk_engine_settings")
      .select("active_version")
      .eq("singleton", true)
      .single();
    if (!error && typeof data?.active_version === "string") {
      engineVersion = data.active_version;
      databaseReady = true;
    }
  } catch {
    databaseReady = false;
  }
  return NextResponse.json({
    status: databaseReady ? "ok" : "degraded",
    engineReady: true,
    engineVersion,
    databaseReady,
    explanationConfigured: Boolean(process.env.GROQ_API_KEY),
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    authConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    paymentConfigured: paymentProvider === "manual_bank"
      ? isManualBankConfigured()
      : paymentProvider === "doku"
        ? Boolean(process.env.DOKU_CLIENT_ID && process.env.DOKU_SECRET_KEY)
        : Boolean(process.env.MIDTRANS_SERVER_KEY),
    paymentProvider,
    paymentMode: isPaymentProduction() ? "production" : "sandbox",
    timestamp: new Date().toISOString(),
  });
}
