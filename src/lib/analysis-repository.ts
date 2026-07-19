import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BatchAnalysis, RiskLabel } from "@/types/transaction";

type StoredRun = {
  id: string;
  overall_risk: number;
  ai_summary: string | null;
  ai_model: string | null;
  created_at: string;
};

type StoredTransaction = {
  id: string;
  input_id: string | null;
  customer_name: string;
  amount: number | string;
  payment_method: string;
  transaction_time: string | null;
  city: string | null;
  notes: string | null;
  risk_score: number;
  status: RiskLabel;
  ai_reason: string | null;
  recommendation: string | null;
  created_at: string;
};

export async function persistAnalysis(userId: string, analysis: BatchAnalysis) {
  const supabase = await createClient();
  const source = analysis.results.every((item) => item.transaction.id.startsWith("MAN-"))
    ? "manual"
    : "file";

  const { data: run, error: runError } = await supabase
    .from("analysis_runs")
    .insert({
      user_id: userId,
      overall_risk: analysis.summary.overallRisk,
      ai_summary: analysis.summary.aiInsight,
      ai_model: analysis.meta?.model ?? null,
      source,
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    throw new Error(`ANALYSIS_RUN_INSERT_FAILED:${runError?.code ?? "NO_ID"}`);
  }

  const rows = analysis.results.map((item) => ({
    analysis_id: run.id,
    user_id: userId,
    input_id: item.transaction.id,
    customer_name: item.transaction.pelanggan,
    amount: item.transaction.nominal,
    payment_method: item.transaction.metode,
    transaction_time: item.transaction.waktu,
    city: item.transaction.kota ?? null,
    notes: item.transaction.catatan ?? null,
    risk_score: item.riskScore,
    status: item.label,
    ai_reason: item.reasoning,
    recommendation: item.recommendation,
  }));

  const { error: transactionError } = await supabase.from("transactions").insert(rows);
  if (transactionError) {
    const { error: cleanupError } = await supabase
      .from("analysis_runs")
      .delete()
      .eq("id", run.id)
      .eq("user_id", userId);

    if (cleanupError) {
      console.error("FraudGuard persistence cleanup failed", {
        runId: run.id,
        code: cleanupError.code,
      });
    }
    throw new Error(`TRANSACTION_INSERT_FAILED:${transactionError.code}`);
  }

  return run.id as string;
}

export async function getLatestAnalysis(userId: string): Promise<BatchAnalysis | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("id, overall_risk, ai_summary, ai_model, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`ANALYSIS_RUN_READ_FAILED:${error.code}`);
  if (!data) return null;

  const run = data as StoredRun;
  const { data: transactionData, error: transactionError } = await supabase
    .from("transactions")
    .select(
      "id, input_id, customer_name, amount, payment_method, transaction_time, city, notes, risk_score, status, ai_reason, recommendation, created_at",
    )
    .eq("analysis_id", run.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (transactionError) throw new Error(`TRANSACTION_READ_FAILED:${transactionError.code}`);

  const storedTransactions = (transactionData ?? []) as StoredTransaction[];
  const results = storedTransactions.map((row) => ({
    transaction: {
      id: row.input_id || row.id,
      pelanggan: row.customer_name,
      nominal: Number(row.amount),
      metode: row.payment_method,
      waktu: row.transaction_time || row.created_at,
      kota: row.city || undefined,
      catatan: row.notes || undefined,
    },
    riskScore: row.risk_score,
    label: row.status,
    reasoning: row.ai_reason || "Alasan AI tidak tersedia.",
    recommendation: row.recommendation || "Lakukan verifikasi manual sebelum mengambil tindakan.",
  }));

  return {
    results,
    summary: {
      total: results.length,
      aman: results.filter((item) => item.label === "AMAN").length,
      waspada: results.filter((item) => item.label === "WASPADA").length,
      terdeteksi: results.filter((item) => item.label === "TERDETEKSI").length,
      overallRisk: run.overall_risk,
      aiInsight: run.ai_summary || "Ringkasan AI tidak tersedia.",
    },
    meta: {
      analysisId: run.id,
      model: run.ai_model || "FraudGuard AI",
      analyzedAt: run.created_at,
      persisted: true,
    },
  };
}
