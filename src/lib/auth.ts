import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getVerifiedClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims;
}

export async function requireUser(nextPath: string) {
  const claims = await getVerifiedClaims();
  if (!claims) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return claims;
}
