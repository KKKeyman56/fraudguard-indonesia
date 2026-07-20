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
