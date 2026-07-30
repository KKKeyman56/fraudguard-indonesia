"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DATA_PROCESSING_CONSENT_VERSION, LEGAL_VERSION } from "@/lib/legal-versions";

export async function acceptCurrentLegalTerms() {
  const claims = await requireUser("/settings");
  const admin = createAdminClient();
  const { error } = await admin.from("legal_consents").upsert(
    {
      user_id: String(claims.sub),
      legal_version: LEGAL_VERSION,
      screening_consent_version: DATA_PROCESSING_CONSENT_VERSION,
      terms_accepted: true,
      privacy_accepted: true,
      screening_consent: true,
      consented_at: new Date().toISOString(),
      source: "settings",
    },
    { onConflict: "user_id,legal_version,screening_consent_version", ignoreDuplicates: true },
  );

  if (error) redirect("/settings?error=consent");
  revalidatePath("/settings");
  redirect("/settings?updated=consent");
}

export async function deleteMyAccount(formData: FormData) {
  const claims = await requireUser("/settings");
  if (String(formData.get("confirmation") || "").trim() !== "HAPUS AKUN") {
    redirect("/settings?error=confirmation");
  }

  const userId = String(claims.sub);
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) redirect("/settings?error=deletion");

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/?account=deleted");
}
