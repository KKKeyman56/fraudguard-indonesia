import { NextRequest, NextResponse } from "next/server";
import { getAccountStatus, getVerifiedClaims } from "@/lib/auth";
import { transactionReviewSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const json = (body: object, status: number) => NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
  });
  const claims = await getVerifiedClaims();
  if (!claims?.sub) return json({ error: "Silakan masuk kembali.", code: "UNAUTHORIZED" }, 401);
  const actorId = String(claims.sub);
  if ((await getAccountStatus(actorId)) !== "active") {
    return json({ error: "Akun sedang dinonaktifkan.", code: "ACCOUNT_SUSPENDED" }, 403);
  }

  const { transactionId } = await params;
  if (!UUID_PATTERN.test(transactionId)) {
    return json({ error: "ID transaksi tidak valid.", code: "INVALID_TRANSACTION_ID" }, 400);
  }

  try {
    const parsed = transactionReviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return json({ error: "Data review tidak valid.", code: "INVALID_REVIEW" }, 400);
    }
    const reviewed = parsed.data.status === "REVIEWED" || parsed.data.feedback !== "UNKNOWN";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transactions")
      .update({
        feedback_status: parsed.data.feedback,
        review_status: parsed.data.status,
        review_note: parsed.data.note || null,
        reviewed_at: reviewed ? new Date().toISOString() : null,
        reviewed_by: reviewed ? actorId : null,
      })
      .eq("id", transactionId)
      .select("id, feedback_status, review_status, review_note, reviewed_at")
      .maybeSingle();

    if (error) throw new Error(`REVIEW_UPDATE_FAILED:${error.code}`);
    if (!data) return json({ error: "Transaksi tidak ditemukan atau tidak dapat diakses.", code: "NOT_FOUND" }, 404);

    console.info(JSON.stringify({
      level: "info",
      event: "transaction_review_updated",
      requestId,
      transactionId,
      feedback: data.feedback_status,
      reviewStatus: data.review_status,
    }));
    return json({
      review: {
        feedback: data.feedback_status,
        status: data.review_status,
        note: data.review_note || undefined,
        reviewedAt: data.reviewed_at || undefined,
      },
    }, 200);
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "transaction_review_failed",
      requestId,
      error: error instanceof Error ? error.name : "UnknownError",
    }));
    return json({ error: "Review belum dapat disimpan.", code: "REVIEW_UNAVAILABLE", requestId }, 500);
  }
}
