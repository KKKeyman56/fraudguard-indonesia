"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const activationSchema = z.object({
  version: z.enum(["hybrid-v2.0.0", "rules-v1.1.0"]),
  reason: z.string().trim().min(8).max(240),
});

export async function activateRiskEngineAction(formData: FormData) {
  const claims = await requireUser("/admin/model");
  const actorId = String(claims.sub);
  if (!(await isUserAdmin(actorId))) throw new Error("ADMIN_REQUIRED");
  const parsed = activationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("ENGINE_ACTIVATION_INVALID");

  const supabase = createAdminClient();
  const { data: current, error: readError } = await supabase
    .from("risk_engine_settings")
    .select("active_version")
    .eq("singleton", true)
    .single();
  if (readError) throw new Error(`ENGINE_SETTING_READ_FAILED:${readError.code}`);
  if (current.active_version === parsed.data.version) return;

  const { error: updateError } = await supabase
    .from("risk_engine_settings")
    .update({
      active_version: parsed.data.version,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("singleton", true);
  if (updateError) throw new Error(`ENGINE_SETTING_UPDATE_FAILED:${updateError.code}`);

  const { error: auditError } = await supabase
    .from("risk_engine_deployments")
    .insert({
      previous_version: current.active_version,
      new_version: parsed.data.version,
      actor_id: actorId,
      reason: parsed.data.reason,
    });
  if (auditError) {
    await supabase
      .from("risk_engine_settings")
      .update({
        active_version: current.active_version,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);
    throw new Error(`ENGINE_DEPLOYMENT_AUDIT_FAILED:${auditError.code}`);
  }

  revalidatePath("/admin/model");
  revalidatePath("/admin");
}
