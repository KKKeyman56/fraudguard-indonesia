"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isUserAdmin } from "@/lib/admin-repository";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewPaymentState = { ok: boolean; message: string };

const reviewSchema = z.object({
  orderId: z.string().min(6).max(80),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional().default(""),
});

export async function reviewManualPaymentAction(
  _previousState: ReviewPaymentState,
  formData: FormData,
): Promise<ReviewPaymentState> {
  const claims = await requireUser("/admin/payments");
  const reviewerId = String(claims.sub);
  if (!(await isUserAdmin(reviewerId))) return { ok: false, message: "Akses admin tidak valid." };

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Data verifikasi tidak valid." };

  const admin = createAdminClient();
  const { error } = await admin.rpc("apply_manual_payment_review", {
    p_order_id: parsed.data.orderId,
    p_decision: parsed.data.decision,
    p_reviewer_id: reviewerId,
    p_note: parsed.data.note,
  });
  if (error) {
    console.error("Manual payment review failed", error.code);
    return { ok: false, message: `Verifikasi gagal (${error.code}).` };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/billing");
  return {
    ok: true,
    message: parsed.data.decision === "approved" ? "Pembayaran disetujui dan paket diaktifkan." : "Bukti pembayaran ditolak.",
  };
}
