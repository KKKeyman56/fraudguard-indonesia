import { NextRequest, NextResponse } from "next/server";
import { explainRiskWithGroq } from "@/lib/groq";
import { createFallbackExplanation } from "@/lib/fallback-explanation";
import { scoreTransactions } from "@/lib/risk-engine";
import { analyzeRequestSchema } from "@/lib/schemas";
import type { AnalysisResult, BatchAnalysis } from "@/types/transaction";
import { getAccountStatus, getVerifiedClaims } from "@/lib/auth";
import { getBusinessBaseline, persistAnalysis } from "@/lib/analysis-repository";
import {
  consumeAnalysisRateLimit,
  getAnalysisQuota,
  releaseAnalysisQuota,
  reserveAnalysisQuota,
} from "@/lib/billing-repository";
import { getActiveRiskEngineVersion } from "@/lib/engine-registry";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const json = (
    body: object,
    status: number,
    headers: Record<string, string> = {},
  ) => NextResponse.json(body, {
    status,
    headers: { ...headers, "X-Request-ID": requestId },
  });

  const claims = await getVerifiedClaims();
  if (!claims) {
    return json(
      { error: "Silakan masuk untuk menggunakan analisis AI.", code: "UNAUTHORIZED" },
      401,
    );
  }
  if ((await getAccountStatus(String(claims.sub))) !== "active") {
    return json(
      { error: "Akun Anda sedang dinonaktifkan. Hubungi administrator FraudGuard.", code: "ACCOUNT_SUSPENDED" },
      403,
    );
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2_000_000) {
    return json(
      { error: "Ukuran data terlalu besar. Kurangi jumlah atau panjang catatan transaksi.", code: "PAYLOAD_TOO_LARGE" },
      413,
    );
  }
  const userKey = typeof claims.sub === "string" ? claims.sub : "unknown";
  let withinRateLimit = false;
  try {
    withinRateLimit = await consumeAnalysisRateLimit();
  } catch {
    console.error(JSON.stringify({ level: "error", event: "rate_limit_check_failed", requestId }));
    return json(
      { error: "Layanan pembatasan permintaan sedang tidak tersedia. Coba lagi.", code: "RATE_LIMIT_UNAVAILABLE" },
      503,
    );
  }
  if (!withinRateLimit) {
    return json(
      { error: "Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.", code: "RATE_LIMITED" },
      429,
    );
  }

  try {
    const raw = await request.json();
    const parsed = analyzeRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return json(
        { error: "Data transaksi tidak valid atau melebihi 500 baris.", code: "INVALID_INPUT" },
        400,
      );
    }

    let quota;
    try {
      quota = await getAnalysisQuota();
    } catch {
      console.error(JSON.stringify({ level: "error", event: "quota_check_failed", requestId }));
      return json(
        { error: "Kuota akun belum dapat diperiksa. Silakan coba lagi.", code: "QUOTA_UNAVAILABLE" },
        503,
      );
    }
    const requestedTransactions = parsed.data.transactions.length;
    if (quota.plan === "free" && requestedTransactions > 50) {
      return json(
        {
          error: "Paket Gratis maksimal 50 transaksi sekali analisis. Gunakan paket Pro atau Max untuk batch hingga 500 transaksi.",
          code: "BATCH_LIMIT_EXCEEDED",
        },
        402,
      );
    }
    if (
      quota.monthlyLimit !== null
      && quota.remaining !== null
      && requestedTransactions > quota.remaining
    ) {
      return json(
        {
          error: `Sisa kuota paket ${quota.plan.toUpperCase()} hanya ${quota.remaining.toLocaleString("id-ID")} transaksi. Kurangi jumlah data atau buka halaman Paket untuk upgrade.`,
          code: "QUOTA_EXCEEDED",
        },
        402,
      );
    }

    let reservationId: string;
    try {
      reservationId = await reserveAnalysisQuota(requestedTransactions);
    } catch (reservationError) {
      if (
        reservationError instanceof Error
        && reservationError.message === "TRANSACTION_QUOTA_EXCEEDED"
      ) {
        return json(
          {
            error: "Kuota transaksi berubah karena ada analisis lain yang sedang berjalan. Coba lagi setelah proses tersebut selesai.",
            code: "QUOTA_EXCEEDED",
          },
          402,
        );
      }
      console.error(JSON.stringify({ level: "error", event: "quota_reservation_failed", requestId }));
      return json(
        { error: "Kuota transaksi belum dapat diamankan. Silakan coba lagi.", code: "QUOTA_UNAVAILABLE" },
        503,
      );
    }

    const releaseReservation = async () => {
      try {
        await releaseAnalysisQuota(reservationId);
      } catch {
        console.error(JSON.stringify({ level: "error", event: "quota_release_failed", requestId }));
      }
    };

    try {
      let baseline;
      try {
        baseline = await getBusinessBaseline(userKey);
      } catch {
        console.warn(JSON.stringify({ level: "warn", event: "business_baseline_unavailable", requestId }));
      }
      const activeEngineVersion = await getActiveRiskEngineVersion();
      const risk = scoreTransactions(
        parsed.data.transactions,
        baseline,
        { engineVersion: activeEngineVersion },
      );
      const explanation = requestedTransactions > 50
        ? createFallbackExplanation(risk)
        : await explainRiskWithGroq(risk);
      const explanationById = new Map(explanation.results.map((item) => [item.id, item]));
      const results: AnalysisResult[] = risk.results.map((item) => {
        const explained = explanationById.get(item.transaction.id);
        if (!explained) throw new Error("EXPLANATION_RESULT_MISMATCH");
        return {
          transaction: item.transaction,
          riskScore: item.riskScore,
          label: item.label,
          reasoning: explained.reasoning,
          recommendation: explained.recommendation,
          signals: item.signals,
        };
      });

      const response: BatchAnalysis = {
        results,
        summary: {
          total: results.length,
          aman: results.filter((item) => item.label === "AMAN").length,
          waspada: results.filter((item) => item.label === "WASPADA").length,
          risikoTinggi: results.filter((item) => item.label === "RISIKO TINGGI").length,
          overallRisk: risk.overallRisk,
          aiInsight: explanation.insight,
        },
        meta: {
          model: explanation.model,
          analyzedAt: new Date().toISOString(),
          engineVersion: risk.engineVersion,
          explanationProvider: explanation.provider,
          baseline: risk.baseline,
        },
      };

      try {
        const persisted = await persistAnalysis(userKey, response);
        response.results = response.results.map((item) => ({
          ...item,
          recordId: persisted.transactionIds.get(item.transaction.id),
          review: { feedback: "UNKNOWN", status: "PENDING" },
        }));
        response.meta = {
          ...response.meta!,
          analysisId: persisted.analysisId,
          persisted: true,
        };
      } catch {
        console.error(JSON.stringify({ level: "error", event: "analysis_persistence_failed", requestId }));
        response.meta = {
          ...response.meta!,
          persisted: false,
          persistenceWarning:
            "Analisis selesai, tetapi laporan belum tersimpan. Unduh PDF sekarang atau coba analisis kembali.",
        };
      }

      await releaseReservation();
      console.info(JSON.stringify({
        level: "info",
        event: "risk_analysis_completed",
        requestId,
        transactionCount: results.length,
        overallRisk: risk.overallRisk,
        engineVersion: risk.engineVersion,
        explanationProvider: explanation.provider,
      }));
      return json(response, 200, { "Cache-Control": "no-store" });
    } catch (analysisError) {
      await releaseReservation();
      throw analysisError;
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "risk_analysis_failed",
      requestId,
      error: error instanceof Error ? error.name : "UnknownError",
    }));
    return json(
      { error: "Analisis belum dapat diproses. Silakan coba lagi.", code: "ANALYSIS_UNAVAILABLE", requestId },
      500,
    );
  }
}
