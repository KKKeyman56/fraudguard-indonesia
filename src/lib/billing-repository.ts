import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSubscriptionPlan, type SubscriptionPlan } from "@/lib/plans";

type QuotaRow = {
  plan_name: unknown;
  used: number | string;
  monthly_limit: number | string | null;
  remaining: number | string | null;
  period_start: string;
};

export type AnalysisQuota = {
  plan: SubscriptionPlan;
  used: number;
  monthlyLimit: number | null;
  remaining: number | null;
  periodStart: string;
};

export type PaymentSummary = {
  orderId: string;
  plan: SubscriptionPlan;
  amount: number;
  status: "created" | "pending" | "paid" | "denied" | "cancelled" | "expired" | "failed" | "refunded";
  createdAt: string;
  paidAt: string | null;
  provider: "manual_bank" | "doku" | "midtrans" | "ipaymu";
  manualReviewStatus: "awaiting_proof" | "pending_review" | "approved" | "rejected" | null;
};

export async function getAnalysisQuota(): Promise<AnalysisQuota> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_analysis_quota").maybeSingle();
  if (error) throw new Error(`ANALYSIS_QUOTA_READ_FAILED:${error.code}`);
  if (!data) throw new Error("ANALYSIS_QUOTA_NOT_FOUND");

  const row = data as QuotaRow;
  if (!isSubscriptionPlan(row.plan_name)) throw new Error("ANALYSIS_QUOTA_PLAN_INVALID");
  return {
    plan: row.plan_name,
    used: Number(row.used),
    monthlyLimit: row.monthly_limit === null ? null : Number(row.monthly_limit),
    remaining: row.remaining === null ? null : Number(row.remaining),
    periodStart: row.period_start,
  };
}

export async function reserveAnalysisQuota(transactionCount: number): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_my_transaction_quota", {
    p_transaction_count: transactionCount,
  });
  if (error) {
    if (error.message.includes("TRANSACTION_QUOTA_EXCEEDED")) {
      throw new Error("TRANSACTION_QUOTA_EXCEEDED");
    }
    throw new Error(`ANALYSIS_QUOTA_RESERVE_FAILED:${error.code}`);
  }
  if (typeof data !== "string") throw new Error("ANALYSIS_QUOTA_RESERVATION_INVALID");
  return data;
}

export async function releaseAnalysisQuota(reservationId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_my_transaction_quota", {
    p_reservation_id: reservationId,
  });
  if (error) throw new Error(`ANALYSIS_QUOTA_RELEASE_FAILED:${error.code}`);
}

export async function consumeAnalysisRateLimit(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_my_analysis_rate_limit");
  if (error) throw new Error(`ANALYSIS_RATE_LIMIT_FAILED:${error.code}`);
  return data === true;
}

export async function getRecentPayments(): Promise<PaymentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("order_id, plan, amount, status, created_at, paid_at, provider, manual_review_status")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(`PAYMENTS_READ_FAILED:${error.code}`);

  return (data ?? []).flatMap((row) => {
    if (!isSubscriptionPlan(row.plan) || row.plan === "free") return [];
    const validStatuses: PaymentSummary["status"][] = [
      "created", "pending", "paid", "denied", "cancelled", "expired", "failed", "refunded",
    ];
    if (!validStatuses.includes(row.status as PaymentSummary["status"])) return [];
    return [{
      orderId: String(row.order_id),
      plan: row.plan,
      amount: Number(row.amount),
      status: row.status as PaymentSummary["status"],
      createdAt: String(row.created_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
      provider: row.provider as PaymentSummary["provider"],
      manualReviewStatus: row.manual_review_status as PaymentSummary["manualReviewStatus"],
    }];
  });
}
