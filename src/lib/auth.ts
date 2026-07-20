import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getVerifiedClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims;
}

export async function getAccountStatus(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("status").eq("id", userId).maybeSingle();
  if (error) throw new Error(`ACCOUNT_STATUS_READ_FAILED:${error.code}`);
  return data?.status === "active" ? "active" : "suspended";
}

export async function requireUser(nextPath: string) {
  const claims = await getVerifiedClaims();
  if (!claims) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if ((await getAccountStatus(String(claims.sub))) !== "active") redirect("/account-disabled");
  return claims;
}
