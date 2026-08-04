import { NextRequest, NextResponse } from "next/server";
import { mapDokuStatus, parseDokuNotification, verifyDokuNotification } from "@/lib/doku";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const requestId = request.headers.get("request-id");
    if (!verifyDokuNotification({
      rawBody,
      clientId: request.headers.get("client-id"),
      requestId,
      requestTimestamp: request.headers.get("request-timestamp"),
      requestTarget: request.nextUrl.pathname,
      signature: request.headers.get("signature"),
    })) {
      return NextResponse.json({ error: "Signature DOKU tidak valid." }, { status: 401 });
    }

    const payload = parseDokuNotification(rawBody);
    const orderId = payload.order.invoice_number.trim();
    const status = mapDokuStatus(payload);
    const transactionStatus = payload.transaction.status.trim().toUpperCase();

    // DOKU Checkout mengizinkan percobaan ulang/channel lain. FAILED dan
    // PENDING karena itu hanya dicatat oleh DOKU, bukan status final paket.
    if (status === "pending") {
      return NextResponse.json({ received: true, ignored: transactionStatus });
    }

    const admin = createAdminClient();
    const { data: payment, error: readError } = await admin
      .from("payments")
      .select("order_id, amount, provider")
      .eq("order_id", orderId)
      .maybeSingle();
    if (readError) throw new Error(`PAYMENT_READ_FAILED:${readError.code}`);
    if (!payment || payment.provider !== "doku") {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
    }

    const callbackAmount = Number(payload.order.amount);
    if (!Number.isFinite(callbackAmount) || callbackAmount !== Number(payment.amount)) {
      return NextResponse.json({ error: "Nominal pembayaran tidak cocok." }, { status: 400 });
    }

    const paymentType = [payload.service?.id, payload.channel?.id].filter(Boolean).join(":") || null;
    const { error: applyError } = await admin.rpc("apply_doku_payment_status", {
      p_order_id: orderId,
      p_status: status,
      p_transaction_id: payload.transaction.original_request_id ?? requestId,
      p_session_id: null,
      p_transaction_status: transactionStatus,
      p_payment_type: paymentType,
    });
    if (applyError) throw new Error(`PAYMENT_APPLY_FAILED:${applyError.code}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("DOKU webhook failed", error);
    return NextResponse.json({ error: "Notifikasi belum dapat diproses." }, { status: 500 });
  }
}
