import "server-only";

import { getBusinessBaseline } from "@/lib/analysis-repository";
import { createClient } from "@/lib/supabase/server";
import type {
  ReviewStatus,
  RiskLabel,
  TransactionFeedback,
} from "@/types/transaction";

type ReviewRow = {
  id: string;
  analysis_id: string;
  customer_name: string;
  order_id: string | null;
  amount: number | string;
  payment_method: string;
  transaction_time: string | null;
  city: string | null;
  risk_score: number;
  status: RiskLabel;
  feedback_status: TransactionFeedback;
  review_status: ReviewStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type RunRow = {
  overall_risk: number;
  created_at: string;
};

type AuditRow = {
  id: number;
  transaction_id: string;
  old_feedback: TransactionFeedback;
  new_feedback: TransactionFeedback;
  old_review_status: ReviewStatus;
  new_review_status: ReviewStatus;
  note: string | null;
  created_at: string;
};

export type ReviewDashboardData = {
  metrics: {
    total: number;
    pending: number;
    reviewed: number;
    problem: number;
    falsePositives: number;
    falsePositiveRate: number;
  };
  baseline: Awaited<ReturnType<typeof getBusinessBaseline>>;
  trends: Array<{ date: string; averageRisk: number; analyses: number }>;
  transactions: Array<{
    id: string;
    analysisId: string;
    customerName: string;
    orderId?: string;
    amount: number;
    paymentMethod: string;
    transactionTime: string;
    city?: string;
    riskScore: number;
    label: RiskLabel;
    feedback: TransactionFeedback;
    reviewStatus: ReviewStatus;
    reviewNote?: string;
    reviewedAt?: string;
  }>;
  audit: Array<{
    id: number;
    transactionId: string;
    transactionLabel: string;
    oldFeedback: TransactionFeedback;
    newFeedback: TransactionFeedback;
    oldReviewStatus: ReviewStatus;
    newReviewStatus: ReviewStatus;
    note?: string;
    createdAt: string;
  }>;
};

export async function getReviewDashboardData(userId: string): Promise<ReviewDashboardData> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [transactionsResult, runsResult, auditResult, baseline] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, analysis_id, customer_name, order_id, amount, payment_method, transaction_time, city, risk_score, status, feedback_status, review_status, review_note, reviewed_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("analysis_runs")
      .select("overall_risk, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("transaction_review_audit")
      .select("id, transaction_id, old_feedback, new_feedback, old_review_status, new_review_status, note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25),
    getBusinessBaseline(userId),
  ]);

  const firstError = [transactionsResult.error, runsResult.error, auditResult.error].find(Boolean);
  if (firstError) throw new Error(`REVIEW_DASHBOARD_READ_FAILED:${firstError.code}`);

  const rows = (transactionsResult.data ?? []) as ReviewRow[];
  const reviewedRisky = rows.filter((row) => row.review_status === "REVIEWED" && row.status !== "AMAN");
  const falsePositives = reviewedRisky.filter((row) => row.feedback_status === "SAFE").length;
  const trendMap = new Map<string, { total: number; analyses: number }>();
  for (const run of (runsResult.data ?? []) as RunRow[]) {
    const date = run.created_at.slice(0, 10);
    const current = trendMap.get(date) ?? { total: 0, analyses: 0 };
    current.total += run.overall_risk;
    current.analyses += 1;
    trendMap.set(date, current);
  }

  const transactionLabels = new Map(
    rows.map((row) => [row.id, row.order_id || row.customer_name]),
  );

  return {
    metrics: {
      total: rows.length,
      pending: rows.filter((row) => row.review_status === "PENDING").length,
      reviewed: rows.filter((row) => row.review_status === "REVIEWED").length,
      problem: rows.filter((row) => row.feedback_status === "PROBLEM").length,
      falsePositives,
      falsePositiveRate: reviewedRisky.length === 0
        ? 0
        : Math.round((falsePositives / reviewedRisky.length) * 100),
    },
    baseline,
    trends: [...trendMap.entries()].map(([date, value]) => ({
      date,
      averageRisk: Math.round(value.total / value.analyses),
      analyses: value.analyses,
    })),
    transactions: rows
      .toSorted((left, right) => {
        if (left.review_status !== right.review_status) return left.review_status === "PENDING" ? -1 : 1;
        return right.risk_score - left.risk_score;
      })
      .slice(0, 50)
      .map((row) => ({
        id: row.id,
        analysisId: row.analysis_id,
        customerName: row.customer_name,
        orderId: row.order_id || undefined,
        amount: Number(row.amount),
        paymentMethod: row.payment_method,
        transactionTime: row.transaction_time || row.created_at,
        city: row.city || undefined,
        riskScore: row.risk_score,
        label: row.status,
        feedback: row.feedback_status,
        reviewStatus: row.review_status,
        reviewNote: row.review_note || undefined,
        reviewedAt: row.reviewed_at || undefined,
      })),
    audit: ((auditResult.data ?? []) as AuditRow[]).map((row) => ({
      id: row.id,
      transactionId: row.transaction_id,
      transactionLabel: transactionLabels.get(row.transaction_id) || "Transaksi lama",
      oldFeedback: row.old_feedback,
      newFeedback: row.new_feedback,
      oldReviewStatus: row.old_review_status,
      newReviewStatus: row.new_review_status,
      note: row.note || undefined,
      createdAt: row.created_at,
    })),
  };
}
