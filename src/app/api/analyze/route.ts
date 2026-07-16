import { NextRequest, NextResponse } from "next/server";
import { analyzeWithGroq } from "@/lib/groq";
import { analyzeRequestSchema } from "@/lib/schemas";
import type { AnalysisResult, BatchAnalysis } from "@/types/transaction";

export const runtime = "nodejs";
export const maxDuration = 60;

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

function isRateLimited(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 256_000) {
    return NextResponse.json(
      { error: "Ukuran data terlalu besar. Kurangi jumlah atau panjang catatan transaksi.", code: "PAYLOAD_TOO_LARGE" },
      { status: 413 },
    );
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  try {
    const raw = await request.json();
    const parsed = analyzeRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data transaksi tidak valid atau melebihi 50 baris.", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    const { data, model } = await analyzeWithGroq(parsed.data.transactions);
    const transactionMap = new Map(parsed.data.transactions.map((item) => [item.id, item]));
    const results: AnalysisResult[] = data.results.map((item) => ({
      transaction: transactionMap.get(item.id)!,
      riskScore: item.riskScore,
      label: item.label,
      reasoning: item.reasoning,
      recommendation: item.recommendation,
    }));

    const response: BatchAnalysis = {
      results,
      summary: {
        total: results.length,
        aman: results.filter((item) => item.label === "AMAN").length,
        waspada: results.filter((item) => item.label === "WASPADA").length,
        terdeteksi: results.filter((item) => item.label === "TERDETEKSI").length,
        overallRisk: data.summary.overallRisk,
        aiInsight: data.summary.aiInsight,
      },
      meta: { model, analyzedAt: new Date().toISOString() },
    };

    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "GROQ_API_KEY_MISSING") {
      return NextResponse.json(
        { error: "Layanan AI belum diaktifkan oleh administrator.", code: "AI_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    console.error("FraudGuard analyze error", error);
    return NextResponse.json(
      { error: "AI sedang tidak dapat dihubungi. Data Anda belum dianalisis; silakan coba lagi.", code: "AI_UNAVAILABLE" },
      { status: 502 },
    );
  }
}
