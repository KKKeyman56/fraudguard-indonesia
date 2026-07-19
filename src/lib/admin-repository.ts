import "server-only";

import { createClient } from "@/lib/supabase/server";

type RecentRunRow = { id: string; user_id: string; overall_risk: number; ai_model: string | null; source: string; created_at: string };
type ProfileRow = { id: string; email: string | null; role: "user" | "admin"; created_at: string };

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
