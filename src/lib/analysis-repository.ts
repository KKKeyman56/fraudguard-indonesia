import "server-only";

import { createClient } from "@/lib/supabase/server";
import { riskSignalSchema } from "@/lib/schemas";
import { buildBusinessBaseline, type BusinessBaseline } from "@/lib/baseline";
import type { ExplanationProvider } from "@/lib/groq";
import type { RiskSignal } from "@/lib/risk-engine";
import type {
  BatchAnalysis,
  ReviewStatus,
  RiskLabel,
  TransactionFeedback,
} from "@/types/transaction";

type StoredRun = {
  id: string;
  overall_risk: number;
  ai_summary: string | null;
  ai_model: string | null;
  engine_version: string;
  explanation_provider: ExplanationProvider | "legacy";
  baseline_snapshot: unknown;
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
  engineVersion: string;
  explanationProvider: ExplanationProvider | "legacy";
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
  risk_signals: unknown;
  order_id: string | null;
  customer_external_id: string | null;
  account_age_days: number | null;
  refund_count: number | null;
  failed_payment_count: number | null;
  voucher_code: string | null;
  item_count: number | null;
  sales_channel: string | null;
  shipping_method: string | null;
  feedback_status: TransactionFeedback;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function parseRiskSignals(value: unknown): RiskSignal[] {
  const parsed = riskSignalSchema.array().safeParse(value);
  return parsed.success ? parsed.data : [];
}

function parseBaseline(value: unknown): BusinessBaseline | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Partial<BusinessBaseline>;
  if (
    typeof item.sampleSize !== "number"
    || typeof item.medianAmount !== "number"
    || typeof item.p90Amount !== "number"
    || !Array.isArray(item.dominantMethods)
    || !Array.isArray(item.dominantCities)
  ) return undefined;
  return {
    sampleSize: item.sampleSize,
    medianAmount: item.medianAmount,
    p90Amount: item.p90Amount,
    normalHourStart: typeof item.normalHourStart === "number" ? item.normalHourStart : null,
    normalHourEnd: typeof item.normalHourEnd === "number" ? item.normalHourEnd : null,
    dominantMethods: item.dominantMethods.filter((entry): entry is string => typeof entry === "string"),
    dominantCities: item.dominantCities.filter((entry): entry is string => typeof entry === "string"),
  };
}

export async function getBusinessBaseline(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, payment_method, transaction_time, city, status, feedback_status")
    .eq("user_id", userId)
    .neq("feedback_status", "PROBLEM")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(`BUSINESS_BASELINE_READ_FAILED:${error.code}`);
  const transactions = (data ?? [])
    .filter((row) => row.status !== "TERDETEKSI" || row.feedback_status === "SAFE")
    .map((row) => ({
      nominal: Number(row.amount),
      metode: row.payment_method,
      waktu: row.transaction_time || "",
      kota: row.city || undefined,
    }));
  return buildBusinessBaseline(transactions);
}

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
      engine_version: analysis.meta?.engineVersion ?? "legacy",
      explanation_provider: analysis.meta?.explanationProvider ?? "legacy",
      baseline_snapshot: analysis.meta?.baseline ?? {},
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
    risk_signals: item.signals,
    order_id: item.transaction.orderId ?? null,
    customer_external_id: item.transaction.customerId ?? null,
    account_age_days: item.transaction.accountAgeDays ?? null,
    refund_count: item.transaction.refundCount ?? 0,
    failed_payment_count: item.transaction.failedPaymentCount ?? 0,
    voucher_code: item.transaction.voucherCode ?? null,
    item_count: item.transaction.itemCount ?? null,
    sales_channel: item.transaction.channel ?? null,
    shipping_method: item.transaction.shippingMethod ?? null,
  }));

  const { data: insertedTransactions, error: transactionError } = await supabase
    .from("transactions")
    .insert(rows)
    .select("id, input_id");
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

  return {
    analysisId: run.id as string,
    transactionIds: new Map(
      (insertedTransactions ?? []).map((row) => [row.input_id as string, row.id as string]),
    ),
  };
}

async function readAnalysis(userId: string, analysisId?: string): Promise<BatchAnalysis | null> {
  const supabase = await createClient();
  let query = supabase
    .from("analysis_runs")
    .select("id, overall_risk, ai_summary, ai_model, engine_version, explanation_provider, baseline_snapshot, created_at")
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
      "id, input_id, customer_name, amount, payment_method, transaction_time, city, notes, risk_score, status, ai_reason, recommendation, risk_signals, order_id, customer_external_id, account_age_days, refund_count, failed_payment_count, voucher_code, item_count, sales_channel, shipping_method, feedback_status, review_status, review_note, reviewed_at, created_at",
    )
    .eq("analysis_id", run.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (transactionError) throw new Error(`TRANSACTION_READ_FAILED:${transactionError.code}`);

  const storedTransactions = (transactionData ?? []) as StoredTransaction[];
  const results = storedTransactions.map((row) => ({
    recordId: row.id,
    transaction: {
      id: row.input_id || row.id,
      pelanggan: row.customer_name,
      nominal: Number(row.amount),
      metode: row.payment_method,
      waktu: row.transaction_time || row.created_at,
      kota: row.city || undefined,
      catatan: row.notes || undefined,
      orderId: row.order_id || undefined,
      customerId: row.customer_external_id || undefined,
      accountAgeDays: row.account_age_days ?? undefined,
      refundCount: row.refund_count ?? undefined,
      failedPaymentCount: row.failed_payment_count ?? undefined,
      voucherCode: row.voucher_code || undefined,
      itemCount: row.item_count ?? undefined,
      channel: row.sales_channel || undefined,
      shippingMethod: row.shipping_method || undefined,
    },
    riskScore: row.risk_score,
    label: row.status,
    reasoning: row.ai_reason || "Alasan AI tidak tersedia.",
    recommendation: row.recommendation || "Lakukan verifikasi manual sebelum mengambil tindakan.",
    signals: parseRiskSignals(row.risk_signals),
    review: {
      feedback: row.feedback_status || "UNKNOWN",
      status: row.review_status || "PENDING",
      note: row.review_note || undefined,
      reviewedAt: row.reviewed_at || undefined,
    },
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
      engineVersion: run.engine_version || "legacy",
      explanationProvider: run.explanation_provider || "legacy",
      baseline: parseBaseline(run.baseline_snapshot),
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
    .select("id, overall_risk, ai_summary, ai_model, engine_version, explanation_provider, source, created_at")
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
      engineVersion: run.engine_version || "legacy",
      explanationProvider: run.explanation_provider || "legacy",
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
