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

type StoredHistoryRun = StoredRun & {
  source: string | null;
};

type StoredHistoryTransaction = {
  analysis_id: string;
  status: RiskLabel;
};

export type AnalysisHistoryItem = {
  id: string;
  overallRisk: number;
  aiSummary: string;
  aiModel: string;
  source: "manual" | "file";
  createdAt: string;
  total: number;
  aman: number;
  waspada: number;
  terdeteksi: number;
};

export type AnalysisHistoryPage = {
  items: AnalysisHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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

async function readAnalysis(userId: string, analysisId?: string): Promise<BatchAnalysis | null> {
  const supabase = await createClient();
  let query = supabase
    .from("analysis_runs")
    .select("id, overall_risk, ai_summary, ai_model, created_at")
    .eq("user_id", userId);

  query = analysisId
    ? query.eq("id", analysisId)
    : query.order("created_at", { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();

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

export async function getLatestAnalysis(userId: string): Promise<BatchAnalysis | null> {
  return readAnalysis(userId);
}

export async function getAnalysisById(userId: string, analysisId: string): Promise<BatchAnalysis | null> {
  return readAnalysis(userId, analysisId);
}

export async function listAnalysisHistory(
  userId: string,
  requestedPage: number,
  pageSize = 10,
): Promise<AnalysisHistoryPage> {
  const supabase = await createClient();
  const safePageSize = Math.min(Math.max(Math.trunc(pageSize), 1), 50);

  const { count, error: countError } = await supabase
    .from("analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) throw new Error(`ANALYSIS_HISTORY_COUNT_FAILED:${countError.code}`);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const page = Math.min(Math.max(Math.trunc(requestedPage) || 1, 1), totalPages);
  const from = (page - 1) * safePageSize;

  const { data, error } = await supabase
    .from("analysis_runs")
    .select("id, overall_risk, ai_summary, ai_model, source, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + safePageSize - 1);

  if (error) throw new Error(`ANALYSIS_HISTORY_READ_FAILED:${error.code}`);

  const runs = (data ?? []) as StoredHistoryRun[];
  const runIds = runs.map((run) => run.id);
  let storedTransactions: StoredHistoryTransaction[] = [];

  if (runIds.length > 0) {
    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .select("analysis_id, status")
      .eq("user_id", userId)
      .in("analysis_id", runIds);

    if (transactionError) throw new Error(`ANALYSIS_HISTORY_TRANSACTIONS_FAILED:${transactionError.code}`);
    storedTransactions = (transactionData ?? []) as StoredHistoryTransaction[];
  }

  const countsByRun = new Map<string, { total: number; aman: number; waspada: number; terdeteksi: number }>();
  for (const transaction of storedTransactions) {
    const counts = countsByRun.get(transaction.analysis_id) ?? { total: 0, aman: 0, waspada: 0, terdeteksi: 0 };
    counts.total += 1;
    if (transaction.status === "AMAN") counts.aman += 1;
    if (transaction.status === "WASPADA") counts.waspada += 1;
    if (transaction.status === "TERDETEKSI") counts.terdeteksi += 1;
    countsByRun.set(transaction.analysis_id, counts);
  }

  return {
    items: runs.map((run) => ({
      id: run.id,
      overallRisk: run.overall_risk,
      aiSummary: run.ai_summary || "Ringkasan AI tidak tersedia.",
      aiModel: run.ai_model || "FraudGuard AI",
      source: run.source === "manual" ? "manual" : "file",
      createdAt: run.created_at,
      ...(countsByRun.get(run.id) ?? { total: 0, aman: 0, waspada: 0, terdeteksi: 0 }),
    })),
    page,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}
