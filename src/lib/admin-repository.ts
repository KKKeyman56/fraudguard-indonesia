import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/lib/plans";

type RecentRunRow = { id: string; user_id: string; overall_risk: number; ai_model: string | null; source: string; created_at: string };
export type UserRole = "user" | "admin";
export type AccountStatus = "active" | "suspended";

type ProfileRow = { id: string; email: string | null; role: UserRole; created_at: string };
type UserOverviewRow = {
  id: string;
  email: string | null;
  role: UserRole;
  status: AccountStatus;
  suspended_at: string | null;
  created_at: string;
  analysis_count: number;
  last_analysis_at: string | null;
  transaction_count: number;
  detected_count: number;
  plan: SubscriptionPlan;
  plan_updated_at: string;
  monthly_analysis_count: number;
};

export type AdminUserOverview = {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  suspendedAt: string | null;
  createdAt: string;
  analysisCount: number;
  lastAnalysisAt: string | null;
  transactionCount: number;
  detectedCount: number;
  plan: SubscriptionPlan;
  planUpdatedAt: string;
  monthlyAnalysisCount: number;
};

export type AdminDashboardData = {
  totals: { users: number; newUsers: number; analyses: number; transactions: number };
  risk: { safe: number; warning: number; detected: number };
  recentRuns: Array<{ id: string; email: string; overallRisk: number; model: string; source: string; createdAt: string }>;
  recentUsers: Array<{ id: string; email: string; role: "user" | "admin"; createdAt: string }>;
};

export async function isUserAdmin(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) throw new Error(`ADMIN_ROLE_READ_FAILED:${error.code}`);
  return data?.role === "admin";
}

function mapUserOverview(row: UserOverviewRow): AdminUserOverview {
  return {
    id: row.id,
    email: row.email || "Email tidak tersedia",
    role: row.role,
    status: row.status,
    suspendedAt: row.suspended_at,
    createdAt: row.created_at,
    analysisCount: Number(row.analysis_count),
    lastAnalysisAt: row.last_analysis_at,
    transactionCount: Number(row.transaction_count),
    detectedCount: Number(row.detected_count),
    plan: row.plan,
    planUpdatedAt: row.plan_updated_at,
    monthlyAnalysisCount: Number(row.monthly_analysis_count),
  };
}

export async function getAdminUsers({
  query = "",
  page = 1,
  pageSize = 10,
}: {
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const safeQuery = query.trim().slice(0, 80).replace(/[%_]/g, "");
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * pageSize;
  let request = supabase
    .from("admin_user_overview")
    .select("id, email, role, status, suspended_at, created_at, analysis_count, last_analysis_at, transaction_count, detected_count, plan, plan_updated_at, monthly_analysis_count", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (safeQuery) request = request.ilike("email", `%${safeQuery}%`);
  const { data, error, count } = await request;
  if (error) throw new Error(`ADMIN_USERS_READ_FAILED:${error.code}`);

  const total = count ?? 0;
  return {
    users: ((data ?? []) as UserOverviewRow[]).map(mapUserOverview),
    total,
    page: safePage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    query: safeQuery,
  };
}

export async function getAdminUserDetail(userId: string) {
  const supabase = await createClient();
  const [userResult, runsResult, safeResult, warningResult, detectedResult] = await Promise.all([
    supabase.from("admin_user_overview").select("id, email, role, status, suspended_at, created_at, analysis_count, last_analysis_at, transaction_count, detected_count, plan, plan_updated_at, monthly_analysis_count").eq("id", userId).maybeSingle(),
    supabase.from("analysis_runs").select("id, overall_risk, ai_model, source, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "AMAN"),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "WASPADA"),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "TERDETEKSI"),
  ]);
  const firstError = [userResult.error, runsResult.error, safeResult.error, warningResult.error, detectedResult.error].find(Boolean);
  if (firstError) throw new Error(`ADMIN_USER_DETAIL_READ_FAILED:${firstError.code}`);
  if (!userResult.data) return null;

  return {
    user: mapUserOverview(userResult.data as UserOverviewRow),
    risk: { safe: safeResult.count ?? 0, warning: warningResult.count ?? 0, detected: detectedResult.count ?? 0 },
    recentRuns: (runsResult.data ?? []).map((run) => ({
      id: run.id,
      overallRisk: run.overall_risk,
      model: run.ai_model || "FraudGuard AI",
      source: run.source,
      createdAt: run.created_at,
    })),
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [usersResult, newUsersResult, analysesResult, transactionsResult, safeResult, warningResult, detectedResult, recentRunsResult, recentUsersResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("analysis_runs").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "AMAN"),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "WASPADA"),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "TERDETEKSI"),
    supabase.from("analysis_runs").select("id, user_id, overall_risk, ai_model, source, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("profiles").select("id, email, role, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const firstError = [usersResult.error, newUsersResult.error, analysesResult.error, transactionsResult.error, safeResult.error, warningResult.error, detectedResult.error, recentRunsResult.error, recentUsersResult.error].find(Boolean);
  if (firstError) throw new Error(`ADMIN_DASHBOARD_READ_FAILED:${firstError.code}`);

  const recentRuns = (recentRunsResult.data ?? []) as RecentRunRow[];
  const userIds = [...new Set(recentRuns.map((run) => run.user_id))];
  const emailByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: runProfiles, error } = await supabase.from("profiles").select("id, email").in("id", userIds);
    if (error) throw new Error(`ADMIN_RUN_PROFILES_READ_FAILED:${error.code}`);
    for (const profile of runProfiles ?? []) emailByUser.set(profile.id, profile.email || "Email tidak tersedia");
  }

  return {
    totals: { users: usersResult.count ?? 0, newUsers: newUsersResult.count ?? 0, analyses: analysesResult.count ?? 0, transactions: transactionsResult.count ?? 0 },
    risk: { safe: safeResult.count ?? 0, warning: warningResult.count ?? 0, detected: detectedResult.count ?? 0 },
    recentRuns: recentRuns.map((run) => ({ id: run.id, email: emailByUser.get(run.user_id) || "Pengguna tidak dikenal", overallRisk: run.overall_risk, model: run.ai_model || "FraudGuard AI", source: run.source, createdAt: run.created_at })),
    recentUsers: ((recentUsersResult.data ?? []) as ProfileRow[]).map((profile) => ({ id: profile.id, email: profile.email || "Email tidak tersedia", role: profile.role, createdAt: profile.created_at })),
  };
}
